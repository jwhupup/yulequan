<template>
  <div ref="threeJsContainer" class="three-js-container"></div>
</template>

<script lang="ts" setup>
import * as THREE from 'three';
import { onMounted, ref } from 'vue';

const threeJsContainer = ref<HTMLDivElement | null>(null);

onMounted(() => {
  initThree();
});

const initThree = () => {
  // 创建场景
  const scene = new THREE.Scene();

  // 创建相机
  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 10, 20); // 设置相机位置，以便更好地查看场地

  // 创建渲染器
  const renderer = new THREE.WebGLRenderer();
  renderer.setSize(window.innerWidth, window.innerHeight);
  threeJsContainer.value?.appendChild(renderer.domElement);

  // 添加晴天光照
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5); // 环境光
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8); // 方向光
  directionalLight.position.set(10, 10, 10);
  scene.add(directionalLight);

  // 创建足球场地
  const fieldGeometry = new THREE.PlaneGeometry(20, 10); // 场地大小
  const fieldMaterial = new THREE.MeshStandardMaterial({
    color: 0x008000, // 草地颜色
    roughness: 0.8,
    metalness: 0.2
  });
  const field = new THREE.Mesh(fieldGeometry, fieldMaterial);
  field.rotation.x = -Math.PI / 2; // 旋转场地使其平铺在地面上
  scene.add(field);

  // 创建球门
  const goalpostGeometry = new THREE.BoxGeometry(1, 3, 0.1); // 球门大小
  const goalpostMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });
  const goalpost = new THREE.Mesh(goalpostGeometry, goalpostMaterial);
  goalpost.position.set(0, 1.5, -5); // 球门位置
  scene.add(goalpost);

  // 动画循环
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