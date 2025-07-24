<template>
  <textarea class="talk-input" v-model="talkContent" ref="talkInputRef" placeholder="聊点什么..."
    @keydown="handleKeydown" />
</template>
<script lang="ts" setup>
import * as THREE from "three";
import { onMounted, ref } from "vue";
import {
  SceneRenderer,
  PersonModel,
  Model,
  type ModelUpdateEvent,
  ThirdVisionControl,
  TalkBubble,
} from "@/core/renderer";
import { userInfo } from "@/store/user";
import type { User } from "@/types/user";

const sceneRenderer = new SceneRenderer();
const includedUserIds = new Set<string>();
const talkInputRef = ref<HTMLInputElement>();
const talkContent = ref("");
let mainModel: Model;

const handleKeydown = (event: KeyboardEvent) => {
  if (event.code === "Enter") {
    mainModel.talkBubble?.show(talkContent.value);
    mainModel.notify({
      type: "message",
      data: {
        name: mainModel.model.name,
        message: talkContent.value,
      },
    });
    talkContent.value = "";
    talkInputRef.value?.blur();
  }
};

onMounted(async () => {
  const socket = new WebSocket(import.meta.env.DEV ? `ws://localhost:4000` : `wss://www.mindstorm.club/ws`);

  window.addEventListener("beforeunload", function (event) {
    const message = "您有未保存的数据，确定要离开页面吗？";
    event.returnValue = message; // 兼容旧版浏览器
    socket.send(
      JSON.stringify({
        type: "quit",
        user: {
          name: userInfo.value?.name,
          position: userInfo.value?.position,
        },
      })
    );
    return message;
  });

  socket.onopen = async () => {
    console.log("[CLIENT] Client connected to server");
    const { name } = await fetch("https://cn.apihz.cn/api/zici/xingming.php?id=10006483&key=3d9df91d8dffdcf2e0a44be0db04bcab").then(res => res.json());
    console.log("[CLIENT] 昵称:", name);
    userInfo.value = {
      name,
      position: [Math.random() * 10, 0, 0],
    };
    socket.send(
      JSON.stringify({
        type: "join",
        user: userInfo.value,
      })
    );
  };

  socket.onmessage = async (event) => {
    const data = JSON.parse(event.data);
    let model: Model | THREE.Object3D | undefined;
    switch (data.type) {
      case "join":
        console.log("[CLIENT] 已存在角色:", includedUserIds);

        data.users.forEach(async (user: User) => {
          if (includedUserIds.has(user.name)) {
            return;
          }
          const person = await new PersonModel(
            // 更新位置信息
            (event: ModelUpdateEvent) => {
              socket.send(
                JSON.stringify({
                  type: "update",
                  event,
                })
              );
            }
          ).build(user);
          new TalkBubble(sceneRenderer.camera, person);
          console.log("[CLIENT] 角色进入:", data.users);

          sceneRenderer.scene.add(person.model);
          includedUserIds.add(user.name);
          if (person.model?.name === userInfo.value?.name) {
            mainModel = person;
            new ThirdVisionControl(sceneRenderer.camera, person);
          }
        });
        break;
      case "update":
        model = Model.list.find(
          (model) => model.model.name === data.event.data.name
        );
        if (model?.model.name === userInfo.value?.name) {
          return;
        }
        console.log("[CLIENT 角色更新]", data.event);
        if (model) {
          switch (data.event.type) {
            case "keyboard":
              model.keyStates[data.event.data.key] = data.event.data.state;
              break;
            case "mouse":
              model.model.rotateY(+data.event.data.angle);
              break;
            case "message":
              model.talkBubble?.show(data.event.data.message);
              break;
            default:
              break;
          }
        }
        break;
      case "quit":
        model = sceneRenderer.scene.getObjectByName(data.user.name);
        console.log("[CLIENT] 角色退出:", model);
        model && sceneRenderer.scene.remove(model);
        break;
      default:
        break;
    }
  };

  socket.onclose = () => {
    console.log("[CLIENT] Client disconnected from server");
    socket.send(
      JSON.stringify({
        type: "quit",
        user: {
          name: userInfo.value?.name,
          position: userInfo.value?.position,
        },
      })
    );
  };
});
</script>

<style scoped>
.talk-input {
  position: fixed;
  padding: 8px 8px;
  left: 50%;
  bottom: 20px;
  transform: translateX(-50%);
  width: 80%;
  height: 30px;
  background-color: rgba(255, 255, 255, 0.099);
  border-radius: 6px;
  color: white;
}

.talk-input:focus {
  outline-color: rgba(255, 255, 255, 0.491);
}
</style>
