/// <reference types="vite/client" />

declare global {
  type Recordable<T = any> = Record<string, T>;
  type Nullable<T> = T | null;
  type Fn<T = any, R = T> = (...arg: T[]) => R;
  type ComponentRef = InstanceType<any>;
}

export {};
