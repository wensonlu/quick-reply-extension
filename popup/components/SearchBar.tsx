import type { FC } from "react";

interface SearchBarProps {
  value: string;
  onChange: (v: string) => void;
}

export const SearchBar: FC<SearchBarProps> = ({ value, onChange }) => (
  <div className="search-wrap">
    <input
      className="search-box"
      placeholder="搜索模板..."
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  </div>
);
