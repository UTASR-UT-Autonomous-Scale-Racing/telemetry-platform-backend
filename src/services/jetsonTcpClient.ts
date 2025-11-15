import net from 'net';

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

    this.socket.on('connect', () => this.handleConnect());
    this.socket.on('error', (err) => this.handleError(err));
    this.socket.on('data', (chunk) => this.handleData(chunk));
    this.socket.on('close', () => this.handleClose());
  }

  disconnect(): void {

    if (this.reconnectionTimer) {
      clearTimeout(this.reconnectionTimer);
      this.reconnectionTimer = null;
    }

    if (!this.socket) return;

    this.socket.removeAllListeners();

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
    if (this.reconnectionTimer) {
      clearTimeout(this.reconnectionTimer);
      this.reconnectionTimer = null;
    }
  }

  private handleError(err: Error): void {
    console.error('Error connecting to TCP server', err);
  }

  private handleData(chunk: Buffer): void {
    console.log('Recived Data:', chunk);
  }

  private handleClose(): void {
    console.log('Connection Closed');
    if (this.socket) {
      this.socket.removeAllListeners();
    }

    this.socket = null;
    
    this.reconnect();
  }

  private reconnect(): void {
    if (this.reconnectionTimer) {
      clearTimeout(this.reconnectionTimer);
    }

    console.log('Reconnection Attempt with Delay', this.reconnectDelay / 1000, 'Seconds');

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
