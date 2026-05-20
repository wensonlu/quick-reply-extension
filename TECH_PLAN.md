# 快捷话术 Chrome 扩展 — 技术方案草案

> 版本：v1.2-final（review 修正：P2/P3 findings 汇总处理 + schema 锁定 + 导入策略明确 + 通信架构补充 + 已知约束标注）  
> 日期：2026-05-20  
> 作者：@工程师  
> 状态：待 review（@技术负责人 @数据工程师）

---

## 1. 项目概览

**产品定位**：电商客服快捷话术 Chrome 扩展，搜→选→一键填充，减少重复输入。

**技术选型**：
| 项 | 选择 | 理由 |
|---|------|------|
| Manifest | V3 | MV2 已进入淘汰倒计时 |
| 框架 | Plasmo | 省 80% boilerplate，HMR + TS 开箱即用，生成仍是标准 MV3 |
| 存储 | chrome.storage.local | 无 100KB sync 配额限制，模板数据安全 |
| 权限 | activeTab + scripting + storage + commands | 最小权限原则 |
| 语言 | TypeScript | 模板 schema 类型安全 |

**Phase 划分**：
- Phase 1（当前）：纯本地，popup + options + content script
- Phase 2（后续）：后端鉴权 + 用量统计 + 云端同步

---

## 2. 项目结构

```
quick-reply-extension/
├── assets/
│   └── icon-16.png / icon-48.png / icon-128.png  # 设计师交付
├── popup/
│   ├── index.tsx          # Plasmo popup 入口
│   ├── components/
│   │   ├── Header.tsx     # 品牌区 + 设置入口
│   │   ├── SearchBar.tsx  # 搜索过滤
│   │   ├── CategoryTabs.tsx  # 分类 pill tabs
│   │   ├── TemplateList.tsx  # 模板列表（含空态/错误态）
│   │   ├── TemplateItem.tsx  # 单条模板行
│   │   ├── Footer.tsx     # 计数 + 操作提示
│   │   └── Toast.tsx      # 填充反馈
│   ├── hooks/
│   │   ├── useTemplates.ts    # 模板 CRUD + 搜索/过滤
│   │   ├── useFill.ts         # 填充注入逻辑
│   │   └── useKeyboard.ts     # 快捷键
│   └── style.css
├── options/
│   ├── index.tsx          # Plasmo options 入口
│   ├── components/
│   │   ├── Sidebar.tsx    # 分类 Tab（左）
│   │   ├── TemplateEditor.tsx  # 编辑器（右）
│   │   ├── TemplateList.tsx    # 管理列表
│   │   └── ToolBar.tsx    # 导入/导出/新建
│   └── style.css
├── contents/
│   └── fill.ts            # Content script：表单填充注入
├── core/
│   ├── storage.ts         # chrome.storage.local 封装
│   ├── schema.ts          # Template 类型定义 + JSON Schema
│   ├── fill-engine.ts     # 填充引擎（变量替换 + DOM 注入）
│   └── defaults.ts        # 默认模板数据
├── background/
│   └── index.ts           # Service worker（快捷键监听）
├── package.json
├── tsconfig.json
└── README.md
```

---

## 3. 模板数据 Schema

> **来源**：@数据工程师 交付，详见附件 `template-schema.json` / `export-schema.json` / `templates-sample.json`

```typescript
// core/schema.ts

interface TemplateVariable {
  name: string;          // 变量名，与 content 中 {{}} 一一对应
  label?: string;        // 中文标签（填充弹窗显示用）
  default?: string;      // 默认值
}

interface Template {
  id: string;            // UUID v4
  trigger: string;       // 触发快捷键，如 ;;shouqian，2-50 字符
  content: string;       // 话术正文，≤5000 字符，支持 {{变量名}}
  variables: TemplateVariable[];  // 结构化变量定义
  category: Category;    // 分类
  tags: string[];        // 自由标签，≤10 个
  usage_count: number;   // 使用次数，每次填充 +1
  created_at: string;    // ISO 8601 UTC
  updated_at: string;    // ISO 8601 UTC
}

type Category = '售前' | '售后' | '投诉' | '催评' | '自定义';

// 存储结构：templates map (O(1) 读写) + templateOrder array (排序)
interface TemplateStore {
  version: "1.0.0";
  exported_at: string;           // 导出时间 ISO 8601
  templates: Template[];
}
```

**存储 key 设计**：
- `templates`: Map<string, Template> — O(1) 按 ID 读写
- `templateOrder`: string[] — 模板 ID 排序列表
- 导入时校验 `version` 做兼容判断，`exported_at` 记录导出时间

**JSON Schema**：完整定义见 @数据工程师 附件 `template-schema.json` 和 `export-schema.json`，此处为 TS 类型映射。

---

## 4. 组件状态矩阵

### Popup (400×550)

| 状态 | 触发条件 | UI 表现 |
|------|---------|---------|
| **空态** | storage 无模板 | 居中空状态插图 + "暂无模板，去设置页创建" 引导按钮 |
| **列表态** | 有模板，无搜索/分类过滤 | 按 usageCount 降序排列，显示全部模板 |
| **搜索态** | 搜索框有输入 | 在当前分类下实时过滤，匹配 trigger + content；无结果切"无匹配"空态 |
| **选中/填充态** | 用户点击模板行 | Toast "✅ 已填充 [模板名]"，popup 自动关闭，content script 注入 |
| **错误态** | 填充失败（页面无 input、权限不足） | Toast "⚠️ 未找到输入框，请确认当前页面"，popup 不关闭 |

### Options 管理页

| 状态 | 触发条件 | UI 表现 |
|------|---------|---------|
| **浏览态** | 打开 options | 左侧分类 Tab + 右侧模板列表 |
| **编辑态** | 点击模板 | 编辑器展开：trigger / content / category / tags / variables |
| **新建态** | 点击"新建模板" | 空编辑器 + 默认分类"自定义" |
| **导入态** | 点击"导入 JSON" | 文件选择器 → 校验 schema → 按 ID 覆盖（已存在更新，新模板追加）→ 确认导入 |
| **导出态** | 点击"导出 JSON" | 一键下载 TemplateStore JSON |

---

## 5. Content Script 填充注入策略

### 注入流程

```
用户点击模板
  → popup 发消息到 service worker
    → service worker 注入 content script 到当前 activeTab
      → content script 定位 activeElement
        → 识别输入框类型（input / textarea / contenteditable / 富文本编辑器）
          → 替换 {{变量}} → 填入内容 → 触发 input/change 事件
            → 回报 popup（成功/失败）
              → popup 关闭 + Toast
```

### 输入框识别优先级

1. `document.activeElement` 如果是 input/textarea → 直接填充
2. 查找当前焦点所在表单的第一个 input/textarea
3. 富文本编辑器检测：contenteditable / CKEditor / TinyMCE / Quill / 飞书文档等
4. 兜底：页面上任意可见的第一个 input/textarea

### 变量处理

- `{{变量名}}` 作为占位符
- Phase 1：自动替换有 `defaultValue` 的变量，无默认值的保留 `{{变量名}}` 占位符
- Phase 2：接入变量映射表（店铺名称、商品名称等可配置预设值）+ 填充弹窗交互

### 注入方式

```typescript
// contents/fill.ts
function fillToElement(el: HTMLElement, text: string): boolean {
  // 1. 标准表单元素
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
    el.value = text;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }
  // 2. 富文本编辑器：先尝试 insertText（兼容 Quill/Slate/ProseMirror）
  //    再兜底 contenteditable（已知约束：execCommand 已被标记为 deprecated，
  //    现代富文本编辑器普遍不支持，Phase 1 保留作为降级路径）
  if (document.queryCommandSupported('insertText')) {
    el.focus();
    document.execCommand('insertText', false, text);
    return true;
  }
  // 3. contenteditable 兜底
  if (el.getAttribute('contenteditable') === 'true') {
    el.textContent = text;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
  }
  return false;
}
```

---

## 6. Manifest 骨架

```json
{
  "manifest_version": 3,
  "name": "快捷话术",
  "version": "0.1.0",
  "description": "电商客服快捷话术一键填充工具",
  "permissions": ["activeTab", "scripting", "storage"],
  "host_permissions": [],
  "commands": {
    "open-popup": {
      "suggested_key": { "default": "Ctrl+Shift+Space" },
      "description": "打开快捷话术"
    }
  },
  "action": {
    "default_popup": "popup/index.html",
    "default_title": "快捷话术"
  },
  "options_ui": {
    "page": "options/index.html",
    "open_in_tab": true
  },
  "background": {
    "service_worker": "background/index.ts"
  },
  "icons": {
    "16": "assets/icon-16.png",
    "48": "assets/icon-48.png",
    "128": "assets/icon-128.png"
  }
}
```

> **注**：Plasmo 会从 `package.json` 和源码约定自动生成此 manifest，此处列出作为契约参考。

---

## 7. 通信架构

### 填充流程

```
Popup ──chrome.runtime.sendMessage──▶ Service Worker
  │                                       │
  │                              chrome.scripting.executeScript
  │                                       │
  │                                       ▼
  │                                  Content Script
  │                                       │
  ◀──────chrome.runtime.sendMessage───────┘
  (填充成功/失败回执)
```

### 快捷键唤醒

```
Ctrl+Shift+Space
  → chrome.commands.onCommand('open-popup')
    → Service Worker
      → chrome.action.openPopup()
        → Popup 弹出
```

消息契约：

```typescript
// Popup → SW
interface FillRequest {
  type: 'FILL_TEMPLATE';
  payload: { template: Template };
}

// SW → Content Script
// 通过 chrome.scripting.executeScript 注入

// Content Script → Popup
interface FillResponse {
  type: 'FILL_RESULT';
  payload: { success: boolean; error?: string };
}
```

---

## 8. 开发与验证计划

### 里程碑

1. **M1: 脚手架跑通** — Plasmo init + popup 空白页可加载 + content script 注入验证
2. **M2: Popup 核心链路** — 模板存储 + 列表 + 搜索 + 分类过滤 + 点击填充
3. **M3: Options 管理** — 模板 CRUD + 导入导出 JSON
4. **M4: 完善** — 错误态 + 空态 + 快捷键 + 图标替换

### 验证方式

```bash
# 开发
pnpm dev          # Plasmo dev server with HMR
# 构建
pnpm build        # 产出 dist/chrome-mv3-prod/
# 加载
# Chrome → chrome://extensions → 开发者模式 → 加载已解压的扩展程序 → 选择 dist/
```

### 测试清单

- [ ] popup 加载不报错，6 条示例模板展示正常
- [ ] 搜索过滤（中文匹配 trigger + content）
- [ ] 分类 tab 切换，横向滚动
- [ ] 点击模板 → 当前页面 input 被填充 → popup 关闭
- [ ] 空页面（无 input）点击模板 → Toast 错误提示
- [ ] 快捷键 Ctrl+Shift+Space 唤醒 popup
- [ ] Options: 新建/编辑/删除模板
- [ ] Options: 导入 JSON（含 schema 校验）
- [ ] Options: 导出 JSON
- [ ] chrome.storage.local 持久化：关闭浏览器重开数据仍在

---

## 9. 待确认事项

1. **Repo 地址**：@文春卢 GitHub 仓库创建后告知
2. **图标交付**：@设计师 16/48/128 尺寸 + Chrome Store 1280×800 推广图
3. **Schema 最终确认**：✅ 已锁定 — @数据工程师 附件版（trigger/tags≤10/variables 结构化/无 title/无 isBuiltin）
4. **默认模板数据集**：✅ 已确认 — 预置 6 条电商话术（售前欢迎/催付/发货通知/售后退款/投诉安抚/物流查询），用户开箱即有感知

---

## 10. 已知约束与迁移标注

| 约束 | 说明 | 迁移触发条件 |
|------|------|-------------|
| `execCommand('insertText')` deprecated | Phase 1 保留作为降级路径，代码注释标注 deprecated | Chrome 移除 execCommand 后切 Clipboard API |
| `variables: string[]` → 对象数组 | Phase 1 string[] 够用，Phase 2 需迁移。JSON 字段名 `variables` 保留不变 | Phase 2 变量映射表需求启动 |
| 数组存储 O(n) | 15 条模板 O(n) 可忽略，模板数 >100 时切 map | 模板数超过 50 条 |
| chrome.storage.local 读写竞态 | popup 和 options 同时打开时可能冲突，Phase 1 乐观锁（last-write-wins） | 出现数据丢失 case 时加版本号乐观锁 |
| sync 配额 100KB | Phase 1 用 local（10MB），跨设备同步留给 Phase 2 后端 | Phase 2 后端接入时评估 |

---

## 11. 代码评审 Findings 处理

| 级别 | 问题 | 处理 |
|------|------|------|
| P2 | 导入 JSON 合并策略未定义 | 已明确：按 ID 覆盖（upsert） |
| P2 | `execCommand('insertText')` deprecated | 保留降级 + 代码注释标注 |
| P3 | 快捷键未在通信架构体现 | 已补充 `onCommand → openPopup` 流程 |
| P3 | variables 类型简化有迁移成本 | 已知约束标注（见 Section 10） |
| P3 | 数组 vs map O(n) 权衡 | 已知约束标注（见 Section 10） |

---

## 附录：依赖清单

```json
{
  "dependencies": {
    "plasmo": "latest",
    "react": "^18",
    "react-dom": "^18",
    "uuid": "^9"
  },
  "devDependencies": {
    "@types/chrome": "latest",
    "@types/react": "^18",
    "@types/uuid": "^9",
    "typescript": "^5"
  }
}
```
