import * as THREE from "three";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import WalkingFbx from "@/assets/model/fbx/Walking.fbx?url";
import WalkingBackward from "@/assets/model/fbx/WalkingBackward.fbx?url";
import IdleFbx from "@/assets/model/fbx/Idle.fbx?url";
import type { ModelBasicInfo } from "../types/user";
import { userInfo } from "../store/user";

export type ActionCallback = (event: ModelUpdateEvent) => void;
export interface ModelUpdateEvent {
  name: string;
  [key: string]: any;
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
  name: string = '';
  actionCallback: ActionCallback;
  model: THREE.Group<THREE.Object3DEventMap> | null = null;
  static list: PersonModel[] = [];
  keyStates: Record<string, boolean> = {
    W: false,
    A: false,
    S: false,
    D: false,
  };
  constructor(actionCallback?: ActionCallback) {
    this.actionCallback = actionCallback || ((_) => {});
    this.event();
  }
  event() { 
    document.addEventListener("keydown", (event) => {
      if (event.code === "KeyW") this.keyStates.W = true;
      if (event.code === "KeyA") this.keyStates.A = true;
      if (event.code === "KeyS") this.keyStates.S = true;
      if (event.code === "KeyD") this.keyStates.D = true;
    });
    document.addEventListener("keyup", (event) => {
      if (event.code === "KeyW") this.keyStates.W = false;
      if (event.code === "KeyA") this.keyStates.A = false;
      if (event.code === "KeyS") this.keyStates.S = false;
      if (event.code === "KeyD") this.keyStates.D = false;
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
    this.name = info.name;
    this.model.name = info.name;
    this.model.position.set(...info.position); // 设置模型位置
    this.model.animations[0].tracks.shift();
    this.model.animations[0].name = 'walking';

    // 行走动画
    const mixer = new THREE.AnimationMixer(this.model);
    const walking = mixer.clipAction(this.model.animations[0]);

    // 原地停留动画
    let idle: THREE.AnimationAction | undefined;
    const idleLoader = new FBXLoader();
    idleLoader.load(IdleFbx, (model) => {
      model.animations[0].tracks.shift();
      model.animations[0].name = 'idle';
      this.model?.animations.push(model.animations[0]);
      idle = mixer.clipAction(model.animations[0]);
    });

    // 后退动画
    let walkingBackward: THREE.AnimationAction | undefined;
    const walkingBackwardLoader = new FBXLoader();
    walkingBackwardLoader.load(WalkingBackward, (model) => {
      model.animations[0].tracks.shift();
      model.animations[0].name = 'walkingBackward';
      this.model?.animations.push(model.animations[0]);
      walkingBackward = mixer.clipAction(model.animations[0]);
    });

    // 动画更新
    const clock = new THREE.Clock();
    const v = new THREE.Vector3(0, 0, 3);
    const animate = () => {
      requestAnimationFrame(animate);
      const delta = clock.getDelta();
      idle?.play();

      if (info.name === userInfo.value?.name) {
        if (this.keyStates.W) {
          // 在间隔deltaTime时间内，玩家角色位移变化计算(速度*时间)
          const deltaPos = v.clone().multiplyScalar(delta);
          this.model?.position.add(deltaPos);
          walkingBackward?.stop();
          idle?.stop();
          walking.play();
          this.notify({
            name: info.name,
            key: 'W',
            state: true,
          });
        } else if (this.keyStates.S) {
          // 在间隔deltaTime时间内，玩家角色位移变化计算(速度*时间)
          const deltaPos = v.clone().multiplyScalar(-delta);
          this.model?.position.add(deltaPos);
          walking.stop();
          idle?.stop();
          walkingBackward?.play();
          this.notify({
            name: info.name,
            key: 'S',
            state: true,
          });
        } else {
          walking.stop();
          walkingBackward?.stop();
          idle?.play();
        }
      }
      mixer.update(delta);
    }
    animate();
    Model.list.push(this);
    return this.model;
  }
}
