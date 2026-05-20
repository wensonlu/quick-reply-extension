// Content script: 表单填充注入
// 输入框识别优先级：input/textarea → execCommand（富文本降级）→ contenteditable 兜底
// execCommand('insertText') 已被标记为 deprecated，Phase 1 保留作为降级路径

import type { Template } from "../core/schema";

// 变量替换：有 defaultValue 的替换，无默认值的保留占位符
function replaceVariables(content: string, template: Template): string {
  let result = content;
  for (const v of template.variables) {
    const placeholder = `{{${v.name}}}`;
    if (v.default) {
      result = result.replaceAll(placeholder, v.default);
    }
  }
  return result;
}

// 输入框识别与填充
function fillToElement(el: HTMLElement, text: string): boolean {
  // 1. 标准表单元素
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
    el.value = text;
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  }
  // 2. 富文本编辑器：先尝试 insertText（兼容 Quill/Slate/ProseMirror）
  //    后兜底 contenteditable
  if (document.queryCommandSupported("insertText")) {
    el.focus();
    document.execCommand("insertText", false, text);
    return true;
  }
  // 3. contenteditable 兜底
  if (el.getAttribute("contenteditable") === "true") {
    el.textContent = text;
    el.dispatchEvent(new Event("input", { bubbles: true }));
    return true;
  }
  return false;
}

// 定位目标输入框
function findTargetElement(): HTMLElement | null {
  const active = document.activeElement as HTMLElement | null;
  if (
    active &&
    (active instanceof HTMLInputElement ||
      active instanceof HTMLTextAreaElement ||
      active.getAttribute("contenteditable") === "true")
  ) {
    return active;
  }
  // 兜底：页面第一个可见输入框
  const inputs = document.querySelectorAll<HTMLElement>(
    "input:not([type=hidden]), textarea, [contenteditable=true]"
  );
  for (const el of inputs) {
    if (el.offsetParent !== null) return el;
  }
  return null;
}

// 消息监听
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "FILL_TEMPLATE") {
    const template: Template = message.payload.template;
    const target = findTargetElement();
    if (!target) {
      sendResponse({ type: "FILL_RESULT", payload: { success: false, error: "未找到输入框" } });
      return;
    }
    const text = replaceVariables(template.content, template);
    const ok = fillToElement(target, text);
    sendResponse({ type: "FILL_RESULT", payload: { success: ok, error: ok ? undefined : "填充失败" } });
  }
});
