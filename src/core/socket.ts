interface SocketManagerOptions {
  url: string;
  onmessage: (event: MessageEvent) => void;
  onopen: () => Promise<void> | void;
  onclose: () => void;
}

export class SocketManager {
  socket: WebSocket;
  constructor(options: SocketManagerOptions) {
    this.socket = new WebSocket(options.url);
    this.socket.onopen = () => options.onopen();
    this.socket.onmessage = (event) => options.onmessage(event);
    this.socket.onclose = () => {
      // @ts-ignore
      this.socket = null;
      this.socket = new WebSocket(options.url);
      options.onclose();
    };
  }
}
