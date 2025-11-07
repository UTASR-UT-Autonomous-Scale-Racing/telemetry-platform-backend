import net from 'net'

class JetsonTcpClient {
  private socket: net.Socket | null = null;
  private buffer = '';

  connect(): void {
    this.socket = net.connect({
      host: process.env.JETSON_HOST || 'host.docker.internal', // Change to 'localhost' if local development
      port: Number(process.env.JETSON_PORT || 5001)
    })

    this.socket.on('connect', () => this.handleConnect());
    this.socket.on('error', (err) => this.handleError(err));
    this.socket.on('data', (chunk) => this.handleData(chunk));
    this.socket.on('close', () => this.handleClose())
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.destroy();
      this.socket = null;
    }
  }

  private handleConnect(): void {
    console.log('Connection Established With Jetson TCP server');
  }

  private handleError(err: Error): void {
    console.log('Error connecting to TCP server', err)
  }

  private handleData(chunk: Buffer): void {
    console.log('Recived Data:', chunk);
  }

  private handleClose(): void {
    console.log('Connection Closed');
    this.socket = null;
  }
}

// Using singleten pattern
// If there are multiple jetson servers(multiple cars),
// then export array of JetsonTcpClient object instead of entire class
const jetsonClient = new JetsonTcpClient();
export default jetsonClient