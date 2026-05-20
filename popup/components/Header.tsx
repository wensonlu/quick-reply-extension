import type { FC } from "react";

interface HeaderProps {
  onRefresh: () => void;
}

export const Header: FC<HeaderProps> = ({ onRefresh }) => {
  const openOptions = () => chrome.runtime.openOptionsPage();

  return (
    <div className="header">
      <div className="header-brand">
        <div className="header-logo">⚡</div>
        <span className="header-name">快捷话术</span>
      </div>
      <div className="header-actions">
        <button className="header-btn" onClick={onRefresh} title="刷新">
          🔄
        </button>
        <button className="header-btn" onClick={openOptions} title="设置">
          ⚙️
        </button>
      </div>
    </div>
  );
};
