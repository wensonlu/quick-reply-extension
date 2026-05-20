// Service Worker: 快捷键监听 + content script 注入

import type { Template } from "../core/schema";

// 快捷键 Ctrl+Shift+Space 唤醒 popup
chrome.commands.onCommand.addListener((command) => {
  if (command === "open-popup") {
    chrome.action.openPopup();
  }
});

// 处理 Popup 发来的填充请求
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "FILL_TEMPLATE") {
    const template: Template = message.payload.template;
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tabId = tabs[0]?.id;
      if (!tabId) {
        sendResponse({
          type: "FILL_RESULT",
          payload: { success: false, error: "无法获取当前标签页" },
        });
        return;
      }
      // 使用 func 参数避免重复注入和 listener 堆积
      chrome.scripting.executeScript(
        {
          target: { tabId },
          func: injectAndFill,
          args: [template],
        },
        (results) => {
          const result = results?.[0]?.result ?? {
            success: false,
            error: "注入超时",
          };
          sendResponse({ type: "FILL_RESULT", payload: result });
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

// 注入到目标页面的函数（通过 executeScript func 执行，每次独立调用，无 listener 堆积）
function injectAndFill(template: Template): {
  success: boolean;
  error?: string;
} {
  try {
    // 变量替换：有 defaultValue 的替换，无默认值的保留占位符
    let text = template.content;
    for (const v of template.variables) {
      if (v.default) {
        text = text.replaceAll(`{{${v.name}}}`, v.default);
      }
    }

    // 定位目标输入框
    const active = document.activeElement as HTMLElement | null;
    let target: HTMLElement | null = null;

    if (
      active &&
      (active instanceof HTMLInputElement ||
        active instanceof HTMLTextAreaElement ||
        (active as HTMLElement).isContentEditable)
    ) {
      target = active;
    } else {
      const inputs = document.querySelectorAll<HTMLElement>(
        "input:not([type=hidden]), textarea, [contenteditable=true]"
      );
      for (const el of inputs) {
        if (el.offsetParent !== null) {
          target = el;
          break;
        }
      }
    }

    if (!target) return { success: false, error: "未找到输入框" };

    // 填充：标准表单元素
    if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
      target.value = text;
      target.dispatchEvent(new Event("input", { bubbles: true }));
      target.dispatchEvent(new Event("change", { bubbles: true }));
      return { success: true };
    }

    // 填充：contenteditable / 富文本
    if (target.isContentEditable) {
      target.textContent = text;
      target.dispatchEvent(new Event("input", { bubbles: true }));
      return { success: true };
    }

    return { success: false, error: "不支持的输入框类型" };
  } catch (err: unknown) {
    return { success: false, error: `填充异常: ${err instanceof Error ? err.message : String(err)}` };
  }
}
