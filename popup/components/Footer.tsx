import type { FC } from "react";

interface FooterProps {
  count: number;
  filteredCount: number;
}

export const Footer: FC<FooterProps> = ({ count, filteredCount }) => {
  const text =
    count === filteredCount
      ? `点击模板一键填充 · 共 ${count} 个模板`
      : `显示 ${filteredCount} / ${count} 个模板`;

  return (
    <div className="footer">
      <span>{text}</span>
      <span className="footer-shortcut">Ctrl+Shift+Space</span>
    </div>
  );
};
