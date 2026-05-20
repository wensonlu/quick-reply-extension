// Service Worker: 快捷键监听 + content script 注入

import type { Template } from "../core/schema";

// 快捷键 Ctrl+Shift+Space 唤醒 popup
chrome.commands.onCommand.addListener((command) => {
  if (command === "open-popup") {
    chrome.action.openPopup();
  }
});

// 处理 Popup 发来的填充请求
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "FILL_TEMPLATE") {
    const template: Template = message.payload.template;
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tabId = tabs[0]?.id;
      if (!tabId) {
        sendResponse({ type: "FILL_RESULT", payload: { success: false, error: "无法获取当前标签页" } });
        return;
      }
      chrome.scripting.executeScript(
        {
          target: { tabId },
          files: ["contents/fill.ts"],
        },
        () => {
          // Content script 注入后，发送填充消息
          chrome.tabs.sendMessage(tabId, message, (response) => {
            sendResponse(response ?? { type: "FILL_RESULT", payload: { success: false, error: "注入超时" } });
          });
        }
      );
    });
    return true; // 异步 sendResponse
  }
});

// 首次安装时灌入默认模板
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === "install") {
    const { DEFAULT_TEMPLATES } = await import("../core/defaults");
    const { loadTemplates, saveTemplates } = await import("../core/storage");
    const store = await loadTemplates();
    // 只在首次安装时灌入
    if (store.templateOrder.length === 0) {
      const now = new Date().toISOString();
      for (const t of DEFAULT_TEMPLATES) {
        store.templates[t.id] = { ...t, created_at: now, updated_at: now };
        store.templateOrder.push(t.id);
      }
      await saveTemplates(store);
    }
  }
});
