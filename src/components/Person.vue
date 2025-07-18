<template>
  <div ref="threeJsContainer" class="three-js-container"></div>
</template>

<script lang="ts" setup>
import * as THREE from "three";
import { onMounted, ref } from 'vue';
import { SceneRenderer, PersonModel, Model, type ModelUpdateEvent } from '../core/renderer';
import { nanoid } from 'nanoid';
import { userInfo } from "../store/user";
import type { User } from "../types/user";

const threeJsContainer = ref<HTMLDivElement | null>(null);
const includedUserIds = new Set<string>();

onMounted(async () => {
  const socket = new WebSocket(`ws://localhost:8080`);

  const sceneRenderer = new SceneRenderer(threeJsContainer.value);

  window.addEventListener('beforeunload', function (event) {
    const message = '您有未保存的数据，确定要离开页面吗？';
    event.returnValue = message; // 兼容旧版浏览器
    socket.send(JSON.stringify({
      type: 'quit',
      user: {
        name: userInfo.value?.name,
        position: userInfo.value?.position,
      }
    }));
    return message;
  });

  socket.onopen = () => {
    console.log('[CLIENT] Client connected to server');
    userInfo.value = {
      name: nanoid(),
      position: [Math.random() * 10, 0, 0],
    };
    socket.send(JSON.stringify({
      type: 'join',
      user: userInfo.value
    }));
  };

  socket.onmessage = async (event) => {
    const data = JSON.parse(event.data);
    let model: Model | THREE.Object3D | undefined;
    switch (data.type) {
      case 'join':
        console.log('[CLIENT] 已存在角色:', includedUserIds);

        data.users.forEach(async (user: User) => {
          if (includedUserIds.has(user.name)) {
            return;
          }
          const model = await new PersonModel(
            // 更新位置信息
            (event: ModelUpdateEvent) => {
              socket.send(JSON.stringify({
                type: 'update',
                event,
              }));
            }
          ).build(user);
          console.log('[CLIENT] 角色进入:', data.users);

          sceneRenderer.scene.add(model);
          includedUserIds.add(user.name);
        });
        break;
      case 'update':
        model = Model.list.find(model => model.name === data.event.data.name);
        if (model?.name === userInfo.value?.name) {
          return;
        }
        console.log('[CLIENT 角色更新]', data.event.data.key, data.event.data.state)
        if (model) {
          switch (data.event.type) {
            case 'keyboard':
              model.keyStates[data.event.data.key] = data.event.data.state;
              break;
          
            default:
              break;
          }
        }
        break;
      case 'quit':
        model = sceneRenderer.scene.getObjectByName(data.user.name);
        console.log('[CLIENT] 角色退出:', model);
        model && sceneRenderer.scene.remove(model);
        break;
      default:
        break;
    }
  };

  socket.onclose = () => {
    console.log('[CLIENT] Client disconnected from server');
    socket.send(JSON.stringify({
      type: 'quit',
      user: {
        name: userInfo.value?.name,
        position: userInfo.value?.position,
      }
    }));
  };
});
</script>

<style scoped>
.three-js-container {
  width: 100%;
  height: 100vh;
}
</style>