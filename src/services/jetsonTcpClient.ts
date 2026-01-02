import net from 'net';
import {
  TelemetryFrame,
  ValidateResult,
  parseAndValidateFrame,
} from '../validators/telementryValidator';

class JetsonTcpClient {
  private socket: net.Socket | null = null;
  private buffer = '';

  private reconnectDelay = 1000; // Start at 1 second cool down delay
  private readonly maxReconnectDelay = 20 * 1000; // At most 20 second cool down delay
  private readonly maxReconnectionDuration = 1 * 60000; // Give up trying to reconnect after 1 minute
  private reconnectionTimer: NodeJS.Timeout | null = null; // Timer for the reconecting
  private reconnectionDurationTimer: NodeJS.Timeout | null = null; // Timer for max reconnection time before disconnect

  /**
   * Initializes connection to the TCP server
   */
  connect(): void {
    // Prevents the continuation of the method if the socket is open, if needed call disconnect first.
    if (this.socket && this.socket.readyState === 'open') {
      console.log('TCP Already connected.');
      return;
    }

    // Ensuring no communication remains active
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.destroy();
    }

    // Resets the timers to default and create the socket
    this.timerLogicReset();
    this.createSocket();
  }

  /**
   * Terminate the life cycle of the TCP client, will only connect again once the 'connect' method is called
   */
  disconnect(): void {
    // Reset Timer Values
    this.timerLogicReset()

    // Ensure Socket is closed
    if (this.socket){
      this.socket.removeAllListeners();

      try {
        this.socket.end();
      } catch (err) {
        this.socket.destroy();
        console.error('Error closing TCP connection gracefully:', err);
      }

      this.socket = null;
    };

    this.buffer = '';
    console.log("TCP Disconnected")
  }

  /**
   * Gets the current connection status of the TCP client
   * @returns {string} One of: 'CONNECTED', 'CONNECTING', 'RECONNECTING', 'DISCONNECTED'
   */
  getStatus(): string {
    if (!this.socket) {
      return this.reconnectionTimer ? 'RECONNECTING' : 'DISCONNECTED';
    }

    if (this.socket.readyState === 'open') {
      return 'CONNECTED';
    } else {
      return 'CONNECTING';
    }
  }

  /**
   * Helper method for creating and setting up listeners for the socket
   */
  private createSocket(): void {
    this.socket = net.connect({
      host: process.env.JETSON_HOST || 'host.docker.internal',
      port: Number(process.env.JETSON_PORT || 5001),
    });
  
    // Event Listeners
    this.socket.on('connect', () => this.handleConnect());
    this.socket.on('error', (err) => this.handleError(err));
    this.socket.on('data', (chunk) => this.handleData(chunk));
    this.socket.on('close', () => this.handleClose());
  }

  /**
   * Helper method for reseting all timer logics to default state, while clearing all existing timers
   */
  private timerLogicReset(): void {
    this.reconnectDelay = 1000;

    if (this.reconnectionTimer) {
      clearTimeout(this.reconnectionTimer);
      this.reconnectionTimer = null;
    }

    if (this.reconnectionDurationTimer) {
      clearTimeout(this.reconnectionDurationTimer);
      this.reconnectionDurationTimer = null;
    }
  }

  private handleConnect(): void {
    console.log('Connection Established With Jetson TCP server');
    this.timerLogicReset();
  }

  private handleError(err: Error): void {
    console.error('Error connecting to TCP server', err);
  }

  private handleData(chunk: Buffer): void {
    // Add the newly received data to buffer
    this.buffer += chunk.toString('utf-8');

    // Process complete message
    let boundary = this.buffer.indexOf('\n');
    while (boundary !== -1) {
      // Extract Complete Message
      const message = this.buffer.substring(0, boundary);
      this.buffer = this.buffer.substring(boundary + 1);

      // Parse and Validate the result
      const validationRes: ValidateResult = parseAndValidateFrame(message);

      // Process the result
      if (validationRes.valid) {
        // Attach server receive time property
        const completeFrame = {
          ...validationRes.frame,
          serverReceiveTime: Date.now() / 1000,
        };
        console.log(chunk);

        console.log(`Result Received: ${completeFrame}`);
      } else {
        console.error('Error Validation:', validationRes.error);
      }

      // Look for next message
      boundary = this.buffer.indexOf('\n');
    }
  }

  private handleClose(): void {
    console.log('Connection Closed');

    // Cleaning the socket
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.destroy();
    }

    this.socket = null;

    // Set the timer to check for deactivation time
    if (!this.reconnectionDurationTimer) {
      this.reconnectionDurationTimer = setTimeout(() => {
        this.disconnect();
      }, this.maxReconnectionDuration);
    }

    // Start to attempt reconnection loop
    this.reconnect();
  }

  private reconnect(): void {
    // Clear timeout if it were to exist
    if (this.reconnectionTimer) {
      clearTimeout(this.reconnectionTimer);
    }

    console.log('Reconnection Attempt with Delay', this.reconnectDelay / 1000, 'Seconds');

    // Set timer to initiate a connection attempt
    this.reconnectionTimer = setTimeout(() => {
      this.createSocket();

      // Exponential Backoff
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.maxReconnectDelay);
    }, this.reconnectDelay);
  }
}

// Using singleton pattern
// If there are multiple jetson servers(multiple cars),
// then export array of JetsonTcpClient object instead of entire class
const jetsonClient = new JetsonTcpClient();
export default jetsonClient;