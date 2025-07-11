<template>
  <div ref="threeJsContainer" class="three-js-container"></div>
</template>

<script lang="ts" setup>
import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { onMounted, ref } from 'vue';
import WalkingFbx from '../assets/model/fbx/Walking.fbx?url';
import WalkingBackward from '../assets/model/fbx/WalkingBackward.fbx?url';
import IdleFbx from '../assets/model/fbx/Idle.fbx?url';

const threeJsContainer = ref<HTMLDivElement | null>(null);

const keyStates = {
  W: false,
  A: false,
  S: false,
  D: false,
};
document.addEventListener('keydown', (event) => {
  if (event.code === 'KeyW') keyStates.W = true;
  if (event.code === 'KeyA') keyStates.A = true;
  if (event.code === 'KeyS') keyStates.S = true;
  if (event.code === 'KeyD') keyStates.D = true;
});
document.addEventListener('keyup', (event) => {
  if (event.code === 'KeyW') keyStates.W = false;
  if (event.code === 'KeyA') keyStates.A = false;
  if (event.code === 'KeyS') keyStates.S = false;
  if (event.code === 'KeyD') keyStates.D = false;
});

const v = new THREE.Vector3(0, 0, 3);

onMounted(() => {
  initThree();
});

const initThree = () => {
  // 创建场景
  const scene = new THREE.Scene();
  // scene.background = new THREE.Color(0xeeeeee);

  // 创建相机
  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 10, 20);

  // 创建渲染器
  const renderer = new THREE.WebGLRenderer();
  renderer.setSize(window.innerWidth, window.innerHeight);
  threeJsContainer.value?.appendChild(renderer.domElement);

  // 添加轨道控制器
  new OrbitControls(camera, renderer.domElement);

  // 创建环境光
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambientLight);

  // 创建方向光
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(10, 10, 10);
  scene.add(directionalLight);

  // 加载模型动画
  const animations: THREE.AnimationClip[] = [];

  const mainLoader = new FBXLoader();
  
  mainLoader.load(WalkingFbx, (object) => {
    object.position.set(0, 0, 0); // 设置模型位置
    scene.add(object);
    object.animations[0].tracks.shift();

    // 行走动画
    const mixer = new THREE.AnimationMixer(object);
    const walking = mixer.clipAction(object.animations[0]);

    // 原地停留动画
    let idle: THREE.AnimationAction | undefined;
    const idleLoader = new FBXLoader();
    idleLoader.load(IdleFbx, (object) => {
      object.animations[0].tracks.shift();
      animations.push(object.animations[0]);
      idle = mixer.clipAction(object.animations[0]);
    });

    // 后退动画
    let walkingBackward: THREE.AnimationAction | undefined;
    const walkingBackwardLoader = new FBXLoader();
    walkingBackwardLoader.load(WalkingBackward, (object) => {
      object.animations[0].tracks.shift();
      animations.push(object.animations[0]);
      walkingBackward = mixer.clipAction(object.animations[0]);
      console.log(object.animations[0])
    });
    
    // 动画更新
    function animate() {
      requestAnimationFrame(animate);
      const delta = clock.getDelta();
      if (keyStates.W) {
        // 在间隔deltaTime时间内，玩家角色位移变化计算(速度*时间)
        const deltaPos = v.clone().multiplyScalar(delta);
        object.position.add(deltaPos); //更新玩家角色的位置
        walkingBackward?.stop();
        idle?.stop();
        walking.play();
      } else if (keyStates.S) {
        // 在间隔deltaTime时间内，玩家角色位移变化计算(速度*时间)
        const deltaPos = v.clone().multiplyScalar(-delta);
        object.position.add(deltaPos); //更新玩家角色的位置
        walking.stop();
        idle?.stop();
        walkingBackward?.play();
      } else {
        console.log('12312312');
        
        walking.stop();
        walkingBackward?.stop();
        idle?.play();
      }
      mixer.update(delta);
      renderer.render(scene, camera);
    }
    animate();
  });

  // 渲染循环
  const clock = new THREE.Clock();
  const animate = () => {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
  };
  animate();
};

</script>

<style scoped>
.three-js-container {
  width: 100%;
  height: 100vh;
}
</style>