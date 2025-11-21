import net from 'net';
import { TelemetryFrame, ValidateResult, parseAndValidateFrame } from '../validators/telementryValidator';

class JetsonTcpClient {
  private socket: net.Socket | null = null;
  private buffer = '';

  private reconnectDelay = 1000; // Start at 1 second cool down delay
  private readonly maxReconnectDelay = 30000; // At most 30 second dool down delay
  private reconnectionTimer: NodeJS.Timeout | null = null;

  connect(): void {
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

  disconnect(): void {

    // Clear the reconnection timer if it exists
    if (this.reconnectionTimer) {
      clearTimeout(this.reconnectionTimer);
      this.reconnectionTimer = null;
    }

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

  private handleConnect(): void {
    console.log('Connection Established With Jetson TCP server');
    this.reconnectDelay = 1000; // Delay reset

    // Clear the timer if it still exists
    if (this.reconnectionTimer) {
      clearTimeout(this.reconnectionTimer);
      this.reconnectionTimer = null;
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
        console.log(`Result Received: ${validationRes.frame}`);
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
    }
    this.socket = null;
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

      // Exponential Delay
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.maxReconnectDelay);
    }, this.reconnectDelay);
  }
}

// Using singleten pattern
// If there are multiple jetson servers(multiple cars),
// then export array of JetsonTcpClient object instead of entire class
const jetsonClient = new JetsonTcpClient();
export default jetsonClient;
