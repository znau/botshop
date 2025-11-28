export {};

declare global {
  interface TelegramWebApp {
    initData?: string;
    initDataUnsafe?: Record<string, unknown>;
    close?: () => void;
  }

  interface TelegramWindow extends Window {
    Telegram?: {
      WebApp?: TelegramWebApp;
    };
  }

  interface Window extends TelegramWindow {}
}
