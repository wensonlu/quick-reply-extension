import type { Template } from "../../core/schema";
import type { FC } from "react";
import { TemplateItem } from "./TemplateItem";

interface TemplateListProps {
  templates: Template[];
  onFill: (t: Template) => void;
  isEmpty: boolean;
  isFiltered: boolean;
}

export const TemplateList: FC<TemplateListProps> = ({
  templates,
  onFill,
  isEmpty,
  isFiltered,
}) => {
  // 空态：storage 无模板
  if (isEmpty) {
    return (
      <div className="empty show">
        <div className="empty-icon">📭</div>
        <span>暂无模板</span>
        <span style={{ fontSize: 11 }}>
          点击右上角 ⚙️ 进入设置页创建模板
        </span>
      </div>
    );
  }

  // 空态：搜索/过滤无结果
  if (isFiltered && templates.length === 0) {
    return (
      <div className="empty show">
        <div className="empty-icon">🔍</div>
        <span>没有匹配的模板</span>
        <span style={{ fontSize: 11 }}>试试换个关键词或分类</span>
      </div>
    );
  }

  return (
    <div className="list">
      {templates.map((t) => (
        <TemplateItem key={t.id} template={t} onFill={onFill} />
      ))}
    </div>
  );
};
