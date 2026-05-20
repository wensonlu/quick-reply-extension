// Popup 入口 — 400×550
// 组件树：Header → SearchBar → CategoryTabs → TemplateList → Footer → Toast

import { useCallback, useEffect, useState } from "react";
import { ALL_CATEGORIES, type Category, type Template } from "../core/schema";
import { incrementUsage, loadTemplates, saveTemplates } from "../core/storage";
import { CategoryTabs } from "./components/CategoryTabs";
import { Footer } from "./components/Footer";
import { Header } from "./components/Header";
import { SearchBar } from "./components/SearchBar";
import { TemplateList } from "./components/TemplateList";
import { Toast } from "./components/Toast";
import "./style.css";

export default function IndexPopup() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<Category | null>(null);
  const [toast, setToast] = useState<{ text: string; error?: boolean } | null>(null);

  // 加载模板（排序：is_favorite 置顶 → usage_count 降序）
  // 兜底：如果 storage 为空，自动灌入默认模板（覆盖 onInstalled 未触发场景）
  const refresh = useCallback(async () => {
    const store = await loadTemplates();
    if (store.templateOrder.length === 0) {
      const { DEFAULT_TEMPLATES } = await import("../core/defaults");
      const now = new Date().toISOString();
      for (const t of DEFAULT_TEMPLATES) {
        store.templates[t.id] = { ...t, created_at: now, updated_at: now };
        store.templateOrder.push(t.id);
      }
      await saveTemplates(store);
    }
    const list = store.templateOrder
      .map((id) => store.templates[id])
      .filter(Boolean)
      .sort((a, b) => {
        if (a.is_favorite !== b.is_favorite) return a.is_favorite ? -1 : 1;
        return b.usage_count - a.usage_count;
      });
    setTemplates(list);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // 搜索 + 分类过滤
  const filtered = templates.filter((t) => {
    if (category && t.category !== category) return false;
    if (search) {
      const q = search.toLowerCase();
      const match = [t.trigger, t.content, ...t.tags].some((s) =>
        s.toLowerCase().includes(q)
      );
      if (!match) return false;
    }
    return true;
  });

  // 点击模板填充
  const handleFill = useCallback(
    async (template: Template) => {
      await incrementUsage(template.id);
      const response = await chrome.runtime.sendMessage({
        type: "FILL_TEMPLATE",
        payload: { template },
      });
      if (response?.payload?.success) {
        setToast({ text: `✅ 已填充 "${template.trigger}"` });
        setTimeout(() => window.close(), 800);
      } else {
        setToast({
          text: `⚠️ ${response?.payload?.error ?? "填充失败"}`,
          error: true,
        });
      }
      refresh();
    },
    [refresh]
  );

  return (
    <div className="popup">
      <Header onRefresh={refresh} />
      <SearchBar value={search} onChange={setSearch} />
      <CategoryTabs
        categories={ALL_CATEGORIES}
        active={category}
        onChange={setCategory}
      />
      <TemplateList
        templates={filtered}
        onFill={handleFill}
        isEmpty={templates.length === 0}
        isFiltered={!!(search || category)}
      />
      <Footer count={templates.length} filteredCount={filtered.length} />
      {toast && (
        <Toast
          text={toast.text}
          isError={toast.error}
          onDone={() => setToast(null)}
        />
      )}
    </div>
  );
}
