// Content script: 表单填充注入工具函数
// 注：当前 MVP 使用 background/index.ts 的 executeScript({ func }) 直接注入，
// 此文件保留作为填充逻辑的参考实现和未来复杂注入场景的扩展点。

import type { Template } from "../core/schema";

// 变量替换：有 defaultValue 的替换，无默认值的保留占位符
export function replaceVariables(content: string, template: Template): string {
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
export function fillToElement(el: HTMLElement, text: string): boolean {
  // 1. 标准表单元素
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
    el.value = text;
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  }
  // 2. 富文本编辑器：先尝试 insertText（兼容 Quill/Slate/ProseMirror）
  //    execCommand('insertText') 已被标记为 deprecated，Phase 1 保留作为降级路径
  if (document.queryCommandSupported("insertText")) {
    el.focus();
    document.execCommand("insertText", false, text);
    return true;
  }
  // 3. contenteditable 兜底（使用 isContentEditable 计算属性，支持子元素继承）
  if (el.isContentEditable) {
    el.textContent = text;
    el.dispatchEvent(new Event("input", { bubbles: true }));
    return true;
  }
  return false;
}

// 定位目标输入框
export function findTargetElement(): HTMLElement | null {
  const active = document.activeElement as HTMLElement | null;
  if (
    active &&
    (active instanceof HTMLInputElement ||
      active instanceof HTMLTextAreaElement ||
      active.isContentEditable)
  ) {
    return active;
  }
  const inputs = document.querySelectorAll<HTMLElement>(
    "input:not([type=hidden]), textarea, [contenteditable=true]"
  );
  for (const el of inputs) {
    if (el.offsetParent !== null) return el;
  }
  return null;
}
