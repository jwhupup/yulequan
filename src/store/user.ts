import { useStorage } from "@vueuse/core";
import type { User } from "../types/user";

export const userInfo = useStorage<User | null>('__USER_INFO__', null);
