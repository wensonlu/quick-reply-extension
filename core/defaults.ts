// 预置 6 条电商话术模板，首次安装时灌入

import type { Template } from "./schema";

export const DEFAULT_TEMPLATES: Template[] = [
  {
    id: "00000000-0000-0000-0000-000000000001",
    trigger: ";;shouqian",
    content:
      "亲，欢迎光临{{店铺名称}}！请问有什么可以帮您？我们支持7天无理由退换，品质有保障哦～",
    variables: [{ name: "店铺名称", label: "店铺名称", default: "本店" }],
    category: "售前",
    tags: ["欢迎", "开场"],
    is_favorite: false,
    usage_count: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "00000000-0000-0000-0000-000000000002",
    trigger: ";;cuifu",
    content:
      "亲，看到您拍下了{{商品名称}}，订单还未付款哦～库存有限，建议尽快完成支付，我们会第一时间为您发货！如有疑问随时联系我～",
    variables: [{ name: "商品名称", label: "商品名称" }],
    category: "售前",
    tags: ["催付", "订单"],
    is_favorite: false,
    usage_count: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "00000000-0000-0000-0000-000000000003",
    trigger: ";;fahuo",
    content:
      "{{客户名}}您好，您的快递已发出～\n📦 快递单号：{{快递单号}}\n🚚 快递公司：{{快递公司}}\n📍 预计送达：{{送达时间}}\n\n您可以通过快递公司官网实时追踪物流。有任何问题随时找我～",
    variables: [
      { name: "客户名", label: "客户昵称" },
      { name: "快递单号", label: "快递单号" },
      { name: "快递公司", label: "快递公司", default: "中通快递" },
      { name: "送达时间", label: "预计送达时间", default: "3-5天" },
    ],
    category: "售前",
    tags: ["发货", "物流通知"],
    is_favorite: false,
    usage_count: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "00000000-0000-0000-0000-000000000004",
    trigger: ";;tuikuan",
    content:
      "亲，已为您提交退款申请，预计{{退款时效}}内到账。退款原路返回您的支付账户，请您留意查收。给您带来不便深表歉意！",
    variables: [
      { name: "退款时效", label: "退款时效", default: "1-3个工作日" },
    ],
    category: "售后",
    tags: ["退款", "售后处理"],
    is_favorite: false,
    usage_count: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "00000000-0000-0000-0000-000000000005",
    trigger: ";;tousu",
    content:
      "亲，非常抱歉给您带来不便！我已将问题反馈给{{负责部门}}，会尽快为您处理。我们非常重视每一位客户的体验，感谢您的耐心等待。",
    variables: [{ name: "负责部门", label: "负责部门", default: "售后部门" }],
    category: "投诉",
    tags: ["投诉", "安抚"],
    is_favorite: false,
    usage_count: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "00000000-0000-0000-0000-000000000006",
    trigger: ";;wuliu",
    content:
      "亲，您的订单已由{{快递公司}}揽收，单号：{{快递单号}}。您可在快递公司官网输入单号查询物流进度。通常{{预计时效}}内送达，请耐心等待～",
    variables: [
      { name: "快递公司", label: "快递公司", default: "中通快递" },
      { name: "快递单号", label: "快递单号" },
      { name: "预计时效", label: "预计时效", default: "3-5天" },
    ],
    category: "自定义",
    tags: ["物流", "查询"],
    is_favorite: false,
    usage_count: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];
