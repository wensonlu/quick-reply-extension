// Options 管理页 — 模板 CRUD + 导入导出
import { useCallback, useEffect, useState } from "react";
import type { Category, Template } from "../core/schema";
import { deleteTemplate, exportTemplates, importTemplates, loadTemplates, saveTemplate } from "../core/storage";

const CATEGORIES: Category[] = ["售前", "售后", "投诉", "催评", "自定义"];

export default function IndexOptions() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [editing, setEditing] = useState<Template | null>(null);

  const refresh = useCallback(async () => {
    const store = await loadTemplates();
    setTemplates(
      store.templateOrder.map((id) => store.templates[id]).filter(Boolean)
    );
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const handleExport = async () => {
    const json = await exportTemplates();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `quick-reply-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const text = await file.text();
      try {
        const data = JSON.parse(text);
        if (!data.version || !Array.isArray(data.templates)) {
          alert("无效的导入文件：缺少 version 或 templates 字段");
          return;
        }
        const result = await importTemplates(data.templates);
        alert(`导入完成：更新 ${result.updated} 条，新增 ${result.added} 条`);
        refresh();
      } catch {
        alert("文件格式错误，请检查 JSON 格式");
      }
    };
    input.click();
  };

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: 24, fontFamily: "sans-serif" }}>
      <h1 style={{ fontSize: 20, marginBottom: 16 }}>⚡ 快捷话术 — 模板管理</h1>

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <button onClick={() => setEditing({ id: crypto.randomUUID(), trigger: "", content: "", variables: [], category: "自定义", tags: [], usage_count: 0, created_at: new Date().toISOString(), updated_at: new Date().toISOString() })}>+ 新建模板</button>
        <button onClick={handleImport}>📥 导入 JSON</button>
        <button onClick={handleExport}>📤 导出 JSON</button>
      </div>

      {editing && (
        <div style={{ background: "#f5f5f5", padding: 16, borderRadius: 8, marginBottom: 16 }}>
          <h3>{editing.trigger ? "编辑模板" : "新建模板"}</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <label>触发词 <input value={editing.trigger} onChange={(e) => setEditing({ ...editing, trigger: e.target.value })} /></label>
            <label>分类 <select value={editing.category} onChange={(e) => setEditing({ ...editing, category: e.target.value as Category })}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select></label>
            <label>标签（逗号分隔） <input value={editing.tags.join(",")} onChange={(e) => setEditing({ ...editing, tags: e.target.value.split(",").filter(Boolean) })} /></label>
            <label>话术内容 <textarea rows={5} value={editing.content} onChange={(e) => setEditing({ ...editing, content: e.target.value })} /></label>
            <div>
              <button onClick={async () => { await saveTemplate(editing); setEditing(null); refresh(); }}>保存</button>
              <button onClick={() => setEditing(null)} style={{ marginLeft: 8 }}>取消</button>
            </div>
          </div>
        </div>
      )}

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: "#f5f5f5", textAlign: "left" }}>
            <th style={{ padding: 8 }}>触发词</th>
            <th style={{ padding: 8 }}>分类</th>
            <th style={{ padding: 8 }}>预览</th>
            <th style={{ padding: 8 }}>次数</th>
            <th style={{ padding: 8 }}>操作</th>
          </tr>
        </thead>
        <tbody>
          {templates.map((t) => (
            <tr key={t.id} style={{ borderBottom: "1px solid #eee" }}>
              <td style={{ padding: 8, fontFamily: "monospace" }}>{t.trigger}</td>
              <td style={{ padding: 8 }}>{t.category}</td>
              <td style={{ padding: 8, maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {t.content.replace(/\{\{.*?\}\}/g, "___").slice(0, 50)}
              </td>
              <td style={{ padding: 8 }}>{t.usage_count}</td>
              <td style={{ padding: 8 }}>
                <button onClick={() => setEditing({ ...t })}>编辑</button>
                <button onClick={async () => { if (confirm("确认删除？")) { await deleteTemplate(t.id); refresh(); } }} style={{ marginLeft: 4, color: "#dc2626" }}>删除</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
