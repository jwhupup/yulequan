import * as THREE from "three";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import WalkingFbx from "@/assets/model/person/Walking.fbx?url";
import { person } from "../assets/model";
import type { ModelBasicInfo } from "../types/user";
import { userInfo } from "../store/user";

export type ActionCallback = (event: ModelUpdateEvent) => void;
export type ModelUpdateEvent =
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
export class SceneRenderer {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  private renderer = new THREE.WebGLRenderer();
  constructor() {
    // this.camera.position.set(0, 10, 20);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(this.renderer.domElement);

    // 添加轨道控制器
    // new OrbitControls(this.camera, this.renderer.domElement);

    // 创建环境光
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);

    // 创建方向光
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 10, 10);
    this.scene.add(directionalLight);
    const animate = () => {
      requestAnimationFrame(animate);
      this.renderer.render(this.scene, this.camera);
    };
    animate();
  }
}
export class TalkBubble {
  private dom: HTMLElement;
  private camera: THREE.Camera;
  private target: Model;
  private offset = new THREE.Vector3(0, 2.2, 0);
  private temp  = new THREE.Vector3();
  constructor(camera: THREE.Camera, target: Model) {
    this.dom = this.createTalkDOM();   // ← 每个实例单独一个 DOM
    this.camera = camera;
    this.target = target;
    this.target.talkBubble = this;
    const animate = () => {
      requestAnimationFrame(animate);
      this.update();
    };
    animate();
  }
  update() {
    this.temp.copy(this.offset).add(this.target.model.position);
    this.temp.project(this.camera);
    const x = (this.temp.x * 0.5 + 0.5) * window.innerWidth;
    const y = (this.temp.y * -0.5 + 0.5) * window.innerHeight;
    this.dom.style.transform = `translate(${x}px, ${y}px)`;
  }
  createTalkDOM() {
    const box = document.createElement('div');
    const content = document.createElement('div');
    box.className = 'talk-box';
    content.className = 'talk-content';
    box.appendChild(content);
    document.body.appendChild(box);
    return content;
  }
  show(text: string) {
    this.dom.textContent = text;
    this.dom.parentElement!.style.display = 'block';
    const timer = setTimeout(() => {
      clearTimeout(timer);
      this.dom.parentElement!.style.display = 'none';
    }, 3000);
  }
}
export class ThirdVisionControl {
  private camera: THREE.PerspectiveCamera;
  private target: Model;
  private mouseX = 0;
  // private mouseY = 0;
  constructor(camera: THREE.PerspectiveCamera, target: Model) {
    this.camera = camera;
    this.target = target;

    document.addEventListener("mousemove", this.onMouseMove.bind(this));
    // const clock = new THREE.Clock();
    const animate = () => {
      requestAnimationFrame(animate);
      this.update();
    };
    animate();
  }
  onMouseMove(event: MouseEvent) {
    this.mouseX = (event.clientX / window.innerWidth) * 2 - 1;
    // this.mouseY = -(event.clientY / window.innerHeight) * 2 + 1;
    // 水平旋转：鼠标横向位移 × 灵敏度(sensitivity)
    const angle = -this.mouseX * 0.01 * Math.PI;
    this.target.model.rotateY(angle);
    this.target.notify({
      type: "mouse",
      data: {
        name: this.target.model.name,
        angle,
      },
    });
  }
  update() {
    // 1. 背后方向（本地 +Z → 世界）
    const back = new THREE.Vector3(0, 0, 1).applyQuaternion(
      this.target.model.quaternion
    );

    const ideal = this.target.model.position
      .clone()
      .add(back.multiplyScalar(-3)) // 背后 3 米
      .add(new THREE.Vector3(0, 1.6, 0)); // 抬高 1.6 米

    this.camera.position.set(ideal.x, ideal.y, ideal.z);

    this.camera.lookAt(
      this.target.model.position.x,
      this.target.model.position.y + 2,
      this.target.model.position.z
    );
  }
}
export class Model {
  talkBubble: TalkBubble | null = null;
  action: Record<string, THREE.AnimationAction> = {};
  actionCallback: ActionCallback;
  model: THREE.Group<THREE.Object3DEventMap> =
    new THREE.Group<THREE.Object3DEventMap>();
  static list: PersonModel[] = [];
  keyStates: Record<string, boolean> = {
    KeyW: false,
    KeyA: false,
    KeyS: false,
    KeyD: false,
    Space: false,
    ShiftLeft: false,
    ShiftRight: false,
  };
  constructor(actionCallback?: ActionCallback) {
    this.actionCallback = actionCallback || ((_) => {});
    this.event();
  }
  event() {
    document.addEventListener("keydown", (event) => {
      if (this.model.name === userInfo.value?.name) {
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

        console.log("keydown", event.code);
        this.notify({
          type: "keyboard",
          data: {
            name: this.model.name,
            key: event.code,
            state: true,
          },
        });
      }
    });
    document.addEventListener("keyup", (event) => {
      if (this.model.name === userInfo.value?.name) {
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

        console.log("keyup", this.model.name);
        this.notify({
          type: "keyboard",
          data: {
            name: this.model.name,
            key: event.code,
            state: false,
          },
        });
      }
    });
  }
  notify(event: ModelUpdateEvent) {
    this.actionCallback(event);
  }
}
export class PersonModel extends Model {
  constructor(actionCallback?: ActionCallback) {
    super(actionCallback);
  }
  async build(info: ModelBasicInfo) {
    const mainLoader = new FBXLoader();

    this.model = await mainLoader.loadAsync(WalkingFbx);
    this.model.name = info.name;
    this.model.position.set(...info.position); // 设置模型位置
    this.model.rotateY(Math.PI);
    this.model.animations[0].tracks.shift();

    // 行走动画
    const mixer = new THREE.AnimationMixer(this.model);
    this.action.walking = mixer.clipAction(this.model.animations[0]);

    person.forEach(({ model, name }) => {
      const loader = new FBXLoader();
      loader.load(model, (object) => {
        object.animations[0].tracks.shift();
        this.action[name] = mixer.clipAction(object.animations[0]);
      });
    });

    // 动画更新
    const clock = new THREE.Clock();
    const vectorCache = new THREE.Vector3();
    const upDown = new THREE.Vector3(0, 0, 0);
    let onGround = true;
    const animate = () => {
      requestAnimationFrame(animate);
      const delta = clock.getDelta();
      this.action.idle?.play();
      ``;
      if (
        this.keyStates.KeyW &&
        (this.keyStates.ShiftLeft || this.keyStates.ShiftRight)
      ) {
        this.model.getWorldDirection(vectorCache); // 返回面部朝向
        // 在间隔deltaTime时间内，玩家角色位移变化计算(时间*速度)
        const deltaPos = vectorCache.multiplyScalar(delta * 4);
        this.model.position.add(deltaPos);
        this.playActions(["running"]);
      } else if (this.keyStates.KeyW && this.keyStates.KeyD) {
        this.model.getWorldDirection(vectorCache); // 返回面部朝向
        const deltaPos = vectorCache.multiplyScalar(delta * 3.5);
        this.model.position.add(deltaPos);
        this.model.rotateY(-Math.PI / 180);
        this.playActions(["walking"]);
      } else if (this.keyStates.KeyW && this.keyStates.KeyA) {
        this.model.getWorldDirection(vectorCache); // 返回面部朝向
        const deltaPos = vectorCache.multiplyScalar(delta * 3.5);
        this.model.position.add(deltaPos);
        this.model.rotateY(Math.PI / 180);
        this.playActions(["walking"]);
      } else if (this.keyStates.KeyS && this.keyStates.KeyD) {
        this.model.getWorldDirection(vectorCache); // 返回面部朝向
        const deltaPos = vectorCache.multiplyScalar(-delta * 3.5);
        this.model.position.add(deltaPos);
        this.model.rotateY(Math.PI / 180);
        this.playActions(["walkingBackward"]);
      } else if (this.keyStates.KeyS && this.keyStates.KeyA) {
        this.model.getWorldDirection(vectorCache); // 返回面部朝向
        const deltaPos = vectorCache.multiplyScalar(-delta * 3.5);
        this.model.position.add(deltaPos);
        this.model.rotateY(-Math.PI / 180);
        this.playActions(["walkingBackward"]);
      } else if (onGround && this.keyStates.KeyW && this.keyStates.Space) {
        upDown.y = 18.9;
        this.playActions(["walkingJump"]);
        onGround = false;
      } else if (onGround && this.keyStates.KeyW) {
        this.model.getWorldDirection(vectorCache); // 返回面部朝向
        const deltaPos = vectorCache.multiplyScalar(delta * 2);
        this.model.position.add(deltaPos);
        this.playActions(["walking"]);
      } else if (this.keyStates.KeyS) {
        this.model.getWorldDirection(vectorCache);
        const deltaPos = vectorCache.multiplyScalar(-delta * 2);
        this.model.position.add(deltaPos);
        this.playActions(["walkingBackward"]);
      } else if (this.keyStates.KeyA) {
        this.model.getWorldDirection(vectorCache);
        vectorCache.cross(this.model!.up).normalize(); // 返回面部朝向交叉轴方向
        const deltaPos = vectorCache.multiplyScalar(-delta * 2);
        this.model.position.add(deltaPos);
        this.playActions(["leftStrafeWalk"]);
      } else if (this.keyStates.KeyD) {
        this.model.getWorldDirection(vectorCache);
        vectorCache.cross(this.model!.up).normalize();
        const deltaPos = vectorCache.multiplyScalar(delta * 2);
        this.model.position.add(deltaPos);
        this.playActions(["rightStrafeWalk"]);
      } else {
        this.playActions(["idle", "walkingJump"]);
        if (!onGround) {
          // 速度受重力
          upDown.y += -20 * delta;
          this.model.getWorldDirection(vectorCache); // 返回面部朝向
          this.model.position.add(vectorCache.multiplyScalar(delta * 4));
          // 计算本帧位移 = 速度 * 时间
          this.model!.position.add(upDown.multiplyScalar(delta));
        }
        if (this.model!.position.y <= 0) {
          this.model!.position.y = 0;
          upDown.y = 0;
          onGround = true;
          this.action.walkingJump?.stop();
        }
      }
      mixer.update(delta);
    };
    animate();
    Model.list.push(this);
    return this;
  }
  playActions(keys: string[]) {
    for (const key in this.action) {
      if (keys.includes(key)) {
        this.action[key]?.play();
      } else {
        this.action[key]?.stop();
      }
    }
  }
}
