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
  private readonly maxReconnectDelay = 20000; // At most 20 second cool down delay
  private readonly maxReconnectionDuration = 60000; // Give up trying to reconnect after 10 minutes
  private reconnectionTimer: NodeJS.Timeout | null = null;
  private reconnectionDurationTimer: NodeJS.Timeout | null = null;

  /**
   * Initializes connection to the TCP server
   */
  connect(): void {
    // Clean everything up to prevent a external call from disrupting the cycle
    if (this.socket && this.socket.readyState === 'open') {
      console.log('TCP Already connected.');
      return;
    }

    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.destroy();
    }

    if (this.reconnectionDurationTimer) {
      clearTimeout(this.reconnectionDurationTimer);
      this.reconnectionDurationTimer = null;
    }

    if (this.reconnectionTimer) {
      clearTimeout(this.reconnectionTimer);
      this.reconnectionTimer = null;
    }

    this.socket = net.connect({
      host: process.env.JETSON_HOST || 'host.docker.internal', // Change to 'localhost' if local development
      port: Number(process.env.JETSON_PORT || 5001),
    });

    // Event Listeners
    this.socket.on('connect', () => this.handleConnect());
    this.socket.on('error', (err) => this.handleError(err));
    this.socket.on('data', (chunk) => this.handleData(chunk));
    this.socket.on('close', () => this.handleClose());
  }

  /**
   * Terminate the life cycle of the TCP client, will only connect again once the 'connect' method is called
   */
  disconnect(): void {
    // Clear the reconnection timer if it exists
    if (this.reconnectionTimer) {
      clearTimeout(this.reconnectionTimer);
      this.reconnectionTimer = null;
    }

    // Clear the duration reconnection timer
    if (this.reconnectionDurationTimer) {
      clearTimeout(this.reconnectionDurationTimer);
      this.reconnectionDurationTimer = null;
    }

    this.buffer = '';

    // If both the timer and the socket isnt active,
    // It should not reconnect again unless connect method is manually called
    if (!this.socket) return;

    // Process of cleaning the socket
    this.socket.removeAllListeners();

    // Try closing gracefully
    try {
      this.socket.end();
    } catch (err) {
      this.socket.destroy();
      console.error('Error closing TCP connection gracefully:', err);
    }

    this.socket = null;
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

  private handleConnect(): void {
    console.log('Connection Established With Jetson TCP server');
    this.reconnectDelay = 1000; // Delay reset

    // Clear the timer for reconnection
    if (this.reconnectionTimer) {
      clearTimeout(this.reconnectionTimer);
      this.reconnectionTimer = null;
    }

    // Clear the timer for max reconnection duration
    if (this.reconnectionDurationTimer) {
      clearTimeout(this.reconnectionDurationTimer);
      this.reconnectionDurationTimer = null;
    }
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
      this.connect();

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
