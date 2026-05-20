// 模板数据契约 — 来源：@数据工程师 附件 template-schema.json
// 终版字段，不再修改。JSON 层使用 snake_case，TS 层 camelCase 映射。

export interface TemplateVariable {
  name: string;       // 变量名，与 content 中 {{变量名}} 一一对应
  label?: string;     // 中文标签（填充弹窗显示用）
  default?: string;   // 默认值
}

export type Category = '售前' | '售后' | '投诉' | '催评' | '自定义';

export interface Template {
  id: string;              // UUID v4
  trigger: string;         // 触发快捷键，如 ;;shouqian，2-50 字符
  content: string;         // 话术正文，≤5000 字符，支持 {{变量名}}
  variables: TemplateVariable[];  // 结构化变量定义
  category: Category;      // 分类
  tags: string[];          // 自由标签，≤10 个
  usage_count: number;     // 使用次数
  created_at: string;      // ISO 8601 UTC
  updated_at: string;      // ISO 8601 UTC
}

// 导入导出容器格式
export interface ExportContainer {
  version: string;         // semver，如 "1.0.0"
  exported_at: string;     // ISO 8601 UTC
  templates: Template[];
}

// chrome.storage.local 存储结构
export interface TemplateStore {
  templates: Record<string, Template>;  // Map<id, Template>
  templateOrder: string[];              // 排序用的 ID 列表
}
