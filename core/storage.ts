// chrome.storage.local 封装 — O(1) Map + templateOrder 排序

import type { Template, TemplateStore } from "./schema";

const STORAGE_KEY_TEMPLATES = "templates";
const STORAGE_KEY_ORDER = "templateOrder";

// 从 storage 读取全部模板
export async function loadTemplates(): Promise<TemplateStore> {
  const result = await chrome.storage.local.get([STORAGE_KEY_TEMPLATES, STORAGE_KEY_ORDER]);
  return {
    templates: result[STORAGE_KEY_TEMPLATES] ?? {},
    templateOrder: result[STORAGE_KEY_ORDER] ?? [],
  };
}

// 保存模板 store 到 storage
export async function saveTemplates(store: TemplateStore): Promise<void> {
  await chrome.storage.local.set({
    [STORAGE_KEY_TEMPLATES]: store.templates,
    [STORAGE_KEY_ORDER]: store.templateOrder,
  });
}

// 按 ID 获取单个模板 (O(1))
export async function getTemplate(id: string): Promise<Template | undefined> {
  const store = await loadTemplates();
  return store.templates[id];
}

// 按 ID 覆盖写入（upsert）
export async function saveTemplate(template: Template): Promise<void> {
  const store = await loadTemplates();
  const exists = template.id in store.templates;
  store.templates[template.id] = {
    ...template,
    updated_at: new Date().toISOString(),
  };
  if (!exists) {
    store.templateOrder.push(template.id);
  }
  await saveTemplates(store);
}

// 按 ID 删除
export async function deleteTemplate(id: string): Promise<void> {
  const store = await loadTemplates();
  delete store.templates[id];
  store.templateOrder = store.templateOrder.filter((oid) => oid !== id);
  await saveTemplates(store);
}

// 导入模板（按 ID 覆盖策略：已存在更新，新模板追加）
export async function importTemplates(
  incoming: Template[],
): Promise<{ updated: number; added: number }> {
  const store = await loadTemplates();
  let updated = 0;
  let added = 0;
  const now = new Date().toISOString();
  for (const t of incoming) {
    const exists = t.id in store.templates;
    store.templates[t.id] = { ...t, updated_at: now };
    if (exists) {
      updated++;
    } else {
      store.templateOrder.push(t.id);
      added++;
    }
  }
  await saveTemplates(store);
  return { updated, added };
}

// 导出全部模板为 ExportContainer 格式
export async function exportTemplates(): Promise<string> {
  const store = await loadTemplates();
  const templates = store.templateOrder.map((id) => store.templates[id]).filter(Boolean);
  const container = {
    version: "1.0.0",
    exported_at: new Date().toISOString(),
    templates,
  };
  return JSON.stringify(container, null, 2);
}

// 增加使用计数
export async function incrementUsage(id: string): Promise<void> {
  const store = await loadTemplates();
  if (store.templates[id]) {
    store.templates[id].usage_count++;
    await saveTemplates(store);
  }
}
