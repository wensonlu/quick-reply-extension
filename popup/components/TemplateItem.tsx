import type { Template } from "../../core/schema";
import type { FC } from "react";

const CATEGORY_ICONS: Record<string, string> = {
  售前: "💬",
  售后: "↩️",
  投诉: "😔",
  催评: "⭐",
  自定义: "📋",
};

interface TemplateItemProps {
  template: Template;
  onFill: (t: Template) => void;
}

export const TemplateItem: FC<TemplateItemProps> = ({ template, onFill }) => {
  const icon = CATEGORY_ICONS[template.category] ?? "📋";
  const preview = template.content
    .replace(/\{\{.*?\}\}/g, "___")
    .replace(/\n/g, " ")
    .slice(0, 40);

  return (
    <div className={`list-item ${template.is_favorite ? "favorite" : ""}`} onClick={() => onFill(template)}>
      <div className="item-category">{icon}</div>
      <div className="item-body">
        <div className="item-title">
          {template.is_favorite && <span style={{ color: "#f97316", marginRight: 4 }}>★</span>}
          {template.trigger}</div>
        <div className="item-preview">{preview}</div>
      </div>
      <span className="item-badge">{template.category}</span>
      <span className="item-copy">📋</span>
    </div>
  );
};
