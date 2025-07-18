import * as THREE from "three";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import WalkingFbx from "@/assets/model/fbx/Walking.fbx?url";
import WalkingBackward from "@/assets/model/fbx/WalkingBackward.fbx?url";
import LeftStrafeWalk from "@/assets/model/fbx/LeftStrafeWalk.fbx?url";
import RightStrafeWalk from "@/assets/model/fbx/RightStrafeWalk.fbx?url";
import LeftTurn from "@/assets/model/fbx/LeftTurn.fbx?url";
import RightTurn from "@/assets/model/fbx/RightTurn.fbx?url";
import IdleFbx from "@/assets/model/fbx/Idle.fbx?url";
import type { ModelBasicInfo } from "../types/user";
import { userInfo } from "../store/user";

export type ActionCallback = (event: ModelUpdateEvent) => void;
export interface ModelUpdateEvent {
  type: "keyboard" | "mouse";
  data: {
    name: string;
    key: string;
    state: boolean;
  };
}

export class SceneRenderer {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  private renderer = new THREE.WebGLRenderer();
  constructor(el: HTMLElement | null) {
    this.camera.position.set(0, 10, 20);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    el?.appendChild(this.renderer.domElement);

    // 添加轨道控制器
    new OrbitControls(this.camera, this.renderer.domElement);

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

export class Model {
  name: string = "";
  actionCallback: ActionCallback;
  model: THREE.Group<THREE.Object3DEventMap> | null = null;
  static list: PersonModel[] = [];
  keyStates: Record<string, boolean> = {
    KeyW: false,
    KeyA: false,
    KeyS: false,
    KeyD: false,
  };
  constructor(actionCallback?: ActionCallback) {
    this.actionCallback = actionCallback || ((_) => {});
    this.event();
  }
  event() {
    document.addEventListener("keydown", (event) => {
      if (this.name === userInfo.value?.name) {
        if (event.code === "KeyW") this.keyStates.KeyW = true;
        if (event.code === "KeyA") this.keyStates.KeyA = true;
        if (event.code === "KeyS") this.keyStates.KeyS = true;
        if (event.code === "KeyD") this.keyStates.KeyD = true;

        console.log("keydown", event.code);
        this.notify({
          type: "keyboard",
          data: {
            name: this.name,
            key: event.code,
            state: true,
          },
        });
      }
    });
    document.addEventListener("keyup", (event) => {
      if (this.name === userInfo.value?.name) {
        if (event.code === "KeyW") this.keyStates.KeyW = false;
        if (event.code === "KeyA") this.keyStates.KeyA = false;
        if (event.code === "KeyS") this.keyStates.KeyS = false;
        if (event.code === "KeyD") this.keyStates.KeyD = false;

        console.log("keyup", this.name);
        this.notify({
          type: "keyboard",
          data: {
            name: this.name,
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
    console.log("[PersonModel build]", info, userInfo.value);
    const mainLoader = new FBXLoader();

    this.model = await mainLoader.loadAsync(WalkingFbx);
    this.name = info.name;
    this.model.position.set(...info.position); // 设置模型位置
    this.model.animations[0].tracks.shift();

    // 行走动画
    const mixer = new THREE.AnimationMixer(this.model);
    const walking = mixer.clipAction(this.model.animations[0]);

    // 原地停留动画
    let idle: THREE.AnimationAction | undefined;
    const idleLoader = new FBXLoader();
    idleLoader.load(IdleFbx, (model) => {
      model.animations[0].tracks.shift();
      this.model?.animations.push(model.animations[0]);
      idle = mixer.clipAction(model.animations[0]);
    });

    // 后退动画
    let walkingBackward: THREE.AnimationAction | undefined;
    const walkingBackwardLoader = new FBXLoader();
    walkingBackwardLoader.load(WalkingBackward, (model) => {
      model.animations[0].tracks.shift();
      this.model?.animations.push(model.animations[0]);
      walkingBackward = mixer.clipAction(model.animations[0]);
    });

    // 左移动画
    let leftStrafeWalk: THREE.AnimationAction | undefined;
    const leftStrafeWalkLoader = new FBXLoader();
    leftStrafeWalkLoader.load(LeftStrafeWalk, (model) => {
      model.animations[0].tracks.shift();
      this.model?.animations.push(model.animations[0]);
      leftStrafeWalk = mixer.clipAction(model.animations[0]);
    });

    // 右移动画
    let rightStrafeWalk: THREE.AnimationAction | undefined;
    const rightStrafeWalkLoader = new FBXLoader();
    rightStrafeWalkLoader.load(RightStrafeWalk, (model) => {
      model.animations[0].tracks.shift();
      model.animations[0].tracks.pop();
      this.model?.animations.push(model.animations[0]);
      rightStrafeWalk = mixer.clipAction(model.animations[0]);
    });

    // 左转动画
    let leftTurn: THREE.AnimationAction | undefined;
    const leftTurnLoader = new FBXLoader();
    leftTurnLoader.load(LeftTurn, (model) => {
      // model.animations[0].tracks.shift();
      // model.animations[0].tracks.pop();
      this.model?.animations.push(model.animations[0]);
      leftTurn = mixer.clipAction(model.animations[0]);
      console.log(model.animations[0])
    });

    // 右转动画
    let rightTurn: THREE.AnimationAction | undefined;
    const rightTurnLoader = new FBXLoader();
    rightTurnLoader.load(RightTurn, (model) => {
      model.animations[0].tracks.shift();
      this.model?.animations.push(model.animations[0]);
      rightTurn = mixer.clipAction(model.animations[0]);
    });

    // 动画更新
    const clock = new THREE.Clock();
    const z = new THREE.Vector3(0, 0, 3);
    const x = new THREE.Vector3(3, 0, 0);
    const animate = () => {
      requestAnimationFrame(animate);
      const delta = clock.getDelta();
      idle?.play();

      if (this.keyStates.KeyW && this.keyStates.KeyD) {
        // 在间隔deltaTime时间内，玩家角色位移变化计算(速度*时间)
        // const deltaPos = x.clone().multiplyScalar(-delta);
        // this.model?.position.add(deltaPos);
        idle?.stop();
        rightTurn?.play();
      } else if (this.keyStates.KeyW && this.keyStates.KeyA) {
        // 在间隔deltaTime时间内，玩家角色位移变化计算(速度*时间)
        // const deltaPos = x.clone().multiplyScalar(-delta);
        // this.model?.position.add(deltaPos);
        idle?.stop();
        leftTurn?.play();
      } else if (this.keyStates.KeyW) {
        // 在间隔deltaTime时间内，玩家角色位移变化计算(速度*时间)
        const deltaPos = z.clone().multiplyScalar(delta);
        this.model?.position.add(deltaPos);
        idle?.stop();
        walking.play();
      } else if (this.keyStates.KeyS) {
        // 在间隔deltaTime时间内，玩家角色位移变化计算(速度*时间)
        const deltaPos = z.clone().multiplyScalar(-delta);
        this.model?.position.add(deltaPos);
        idle?.stop();
        walkingBackward?.play();
      } else if (this.keyStates.KeyA) {
        // 在间隔deltaTime时间内，玩家角色位移变化计算(速度*时间)
        const deltaPos = x.clone().multiplyScalar(delta);
        this.model?.position.add(deltaPos);
        idle?.stop();
        leftStrafeWalk?.play();
      } else if (this.keyStates.KeyD) {
        // 在间隔deltaTime时间内，玩家角色位移变化计算(速度*时间)
        const deltaPos = x.clone().multiplyScalar(-delta);
        this.model?.position.add(deltaPos);
        idle?.stop();
        rightStrafeWalk?.play();
      } else {
        walking.stop();
        walkingBackward?.stop();
        leftStrafeWalk?.stop();
        rightStrafeWalk?.stop();
        rightTurn?.stop();
        leftTurn?.stop();
        idle?.play();
      }
      mixer.update(delta);
    };
    animate();
    Model.list.push(this);
    return this.model;
  }
}
