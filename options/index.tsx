// Options 管理页 — 模板 CRUD + 导入导出 + 变量编辑器
import { useCallback, useEffect, useState } from "react";
import { ALL_CATEGORIES, type Category, type Template, type TemplateVariable } from "../core/schema";
import { deleteTemplate, exportTemplates, importTemplates, loadTemplates, saveTemplate } from "../core/storage";

// 导入校验：检查必填字段
function isValidTemplate(t: unknown): t is Template {
  if (!t || typeof t !== "object") return false;
  const obj = t as Record<string, unknown>;
  return (
    typeof obj.id === "string" && obj.id.length > 0 &&
    typeof obj.trigger === "string" && obj.trigger.length > 0 &&
    typeof obj.content === "string" && obj.content.length > 0 &&
    typeof obj.category === "string" && ALL_CATEGORIES.includes(obj.category as Category)
  );
}

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
        const valid = data.templates.filter(isValidTemplate);
        const skipped = data.templates.length - valid.length;
        if (valid.length === 0) {
          alert("导入失败：没有通过校验的模板（需要 id/trigger/content/category 必填）");
          return;
        }
        const result = await importTemplates(valid);
        let msg = `导入完成：更新 ${result.updated} 条，新增 ${result.added} 条`;
        if (skipped > 0) msg += `，跳过 ${skipped} 条（字段不完整）`;
        alert(msg);
        refresh();
      } catch {
        alert("文件格式错误，请检查 JSON 格式");
      }
    };
    input.click();
  };

  // 变量编辑器
  const addVariable = () => {
    if (!editing) return;
    setEditing({
      ...editing,
      variables: [...editing.variables, { name: "", label: "", default: "" }],
    });
  };
  const updateVariable = (index: number, field: keyof TemplateVariable, value: string) => {
    if (!editing) return;
    const vars = [...editing.variables];
    vars[index] = { ...vars[index], [field]: value };
    setEditing({ ...editing, variables: vars });
  };
  const removeVariable = (index: number) => {
    if (!editing) return;
    setEditing({
      ...editing,
      variables: editing.variables.filter((_, i) => i !== index),
    });
  };

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: 24, fontFamily: "sans-serif" }}>
      <h1 style={{ fontSize: 20, marginBottom: 16 }}>⚡ 快捷话术 — 模板管理</h1>

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <button onClick={() => setEditing({
          id: crypto.randomUUID(),
          trigger: "",
          content: "",
          variables: [],
          category: "自定义",
          tags: [],
          is_favorite: false,
          usage_count: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })}>+ 新建模板</button>
        <button onClick={handleImport}>📥 导入 JSON</button>
        <button onClick={handleExport}>📤 导出 JSON</button>
      </div>

      {editing && (
        <div style={{ background: "#f5f5f5", padding: 16, borderRadius: 8, marginBottom: 16 }}>
          <h3 style={{ margin: "0 0 12px 0" }}>{editing.trigger ? "编辑模板" : "新建模板"}</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <label>触发词 <input value={editing.trigger} onChange={(e) => setEditing({ ...editing, trigger: e.target.value })} style={{ width: 200 }} /></label>
            <label>分类 <select value={editing.category} onChange={(e) => setEditing({ ...editing, category: e.target.value as Category })}>
              {ALL_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select></label>
            <label>标签（逗号分隔） <input value={editing.tags.join(",")} onChange={(e) => setEditing({ ...editing, tags: e.target.value.split(",").filter(Boolean) })} style={{ width: 300 }} /></label>
            <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input type="checkbox" checked={editing.is_favorite} onChange={(e) => setEditing({ ...editing, is_favorite: e.target.checked })} />
              收藏（置顶显示）
            </label>

            {/* 变量编辑器 */}
            <div style={{ background: "#fff", padding: 12, borderRadius: 6 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <strong>变量列表</strong>
                <button onClick={addVariable} style={{ fontSize: 12 }}>+ 添加变量</button>
              </div>
              {editing.variables.length === 0 && (
                <div style={{ color: "#999", fontSize: 12 }}>暂无变量。在话术中使用 {"{{变量名}}"} 占位符</div>
              )}
              {editing.variables.map((v, i) => (
                <div key={i} style={{ display: "flex", gap: 6, marginBottom: 4, alignItems: "center" }}>
                  <input
                    placeholder="变量名"
                    value={v.name}
                    onChange={(e) => updateVariable(i, "name", e.target.value)}
                    style={{ width: 100 }}
                  />
                  <input
                    placeholder="标签"
                    value={v.label ?? ""}
                    onChange={(e) => updateVariable(i, "label", e.target.value)}
                    style={{ width: 100 }}
                  />
                  <input
                    placeholder="默认值"
                    value={v.default ?? ""}
                    onChange={(e) => updateVariable(i, "default", e.target.value)}
                    style={{ width: 120 }}
                  />
                  <button onClick={() => removeVariable(i)} style={{ color: "#dc2626", fontSize: 12 }}>✕</button>
                </div>
              ))}
            </div>

            <label>话术内容 <textarea rows={5} value={editing.content} onChange={(e) => setEditing({ ...editing, content: e.target.value })} style={{ width: "100%" }} /></label>
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
            <th style={{ padding: 8 }}>★</th>
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
              <td style={{ padding: 8, color: t.is_favorite ? "#f97316" : "#ddd", fontSize: 16 }}>
                {t.is_favorite ? "★" : "☆"}
              </td>
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
