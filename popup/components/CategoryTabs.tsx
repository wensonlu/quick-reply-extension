import type { Category } from "../../core/schema";
import type { FC } from "react";

interface CategoryTabsProps {
  categories: Category[];
  active: Category | null;
  onChange: (c: Category | null) => void;
}

export const CategoryTabs: FC<CategoryTabsProps> = ({ categories, active, onChange }) => (
  <div className="tabs">
    <button
      className={`tab ${active === null ? "active" : ""}`}
      onClick={() => onChange(null)}
    >
      全部
    </button>
    {categories.map((cat) => (
      <button
        key={cat}
        className={`tab ${active === cat ? "active" : ""}`}
        onClick={() => onChange(active === cat ? null : cat)}
      >
        {cat}
      </button>
    ))}
  </div>
);
