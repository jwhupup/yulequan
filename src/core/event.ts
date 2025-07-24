import { userInfo } from "@/store/user";

export type ModelUpdateData =
  | {
      type: "keyboard";
      data: {
        name: string;
        key: string;
        state: any;
      };
    }
  | {
      type: "mouse";
      data: {
        name: string;
        angle: number;
      };
    }
  | {
      type: "message";
      data: {
        name: string;
        message: string;
      };
    };

export class EventManager {
  socket: WebSocket | null;
  keyStates: Record<string, boolean> = {
    KeyW: false,
    KeyA: false,
    KeyS: false,
    KeyD: false,
    Space: false,
    ShiftLeft: false,
    ShiftRight: false,
  };
  constructor(socket: WebSocket) {
    this.socket = socket;
    this.register();
  }
  register() {
    document.addEventListener("keydown", (event) => {
      console.log("keydown", event.code);
    
      if (event.code === "KeyW" || event.code === "ArrowUp")
        this.keyStates.KeyW = true;
      if (event.code === "KeyA" || event.code === "ArrowLeft")
        this.keyStates.KeyA = true;
      if (event.code === "KeyS" || event.code === "ArrowDown")
        this.keyStates.KeyS = true;
      if (event.code === "KeyD" || event.code === "ArrowRight")
        this.keyStates.KeyD = true;
      if (event.code === "Space") this.keyStates.Space = true;
      if (event.code === "ShiftLeft") this.keyStates.ShiftLeft = true;
      if (event.code === "ShiftRight") this.keyStates.ShiftRight = true;

      if (userInfo.value?.name) {
        this.notify({
          type: "keyboard",
          data: {
            name: userInfo.value?.name,
            key: event.code,
            state: true,
          },
        });
      }
    });
    document.addEventListener("keyup", (event) => {
      console.log("keyup", event.code);
      
      if (event.code === "KeyW" || event.code === "ArrowUp")
        this.keyStates.KeyW = false;
      if (event.code === "KeyA" || event.code === "ArrowLeft")
        this.keyStates.KeyA = false;
      if (event.code === "KeyS" || event.code === "ArrowDown")
        this.keyStates.KeyS = false;
      if (event.code === "KeyD" || event.code === "ArrowRight")
        this.keyStates.KeyD = false;
      if (event.code === "Space") this.keyStates.Space = false;
      if (event.code === "ShiftLeft") this.keyStates.ShiftLeft = false;
      if (event.code === "ShiftRight") this.keyStates.ShiftRight = false;

      if (userInfo.value?.name) {
        this.notify({
          type: "keyboard",
          data: {
            name: userInfo.value.name,
            key: event.code,
            state: false,
          },
        });
      }
    });
  }
  notify(data: ModelUpdateData) {
    this.socket?.send(JSON.stringify(data));
  }
}
