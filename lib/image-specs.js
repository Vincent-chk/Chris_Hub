// 图片规范唯一事实源（阶段 C · C2）
// 业务规范见 docs/development-plan.md §11.6；中台所有上传区与后端校验都从这里读取。

const MB = 1024 * 1024;

export const IMAGE_SPECS = {
  "banner-desktop": {
    label: "Banner 桌面图（中/英）",
    ratio: { width: 43, height: 25 }, // 1.72:1
    minWidth: 1400,
    minHeight: 814,
    formats: ["jpg", "jpeg", "png", "webp"],
    maxBytes: 5 * MB,
    exportFormat: "webp",
  },
  "banner-mobile": {
    label: "Banner 移动图（中/英，可选）",
    ratio: { width: 6, height: 5 }, // 1.2:1
    minWidth: 900,
    minHeight: 750,
    formats: ["jpg", "jpeg", "png", "webp"],
    maxBytes: 5 * MB,
    exportFormat: "webp",
  },
  card: {
    label: "商品列表缩略图",
    ratio: { width: 1, height: 1 },
    minWidth: 800,
    minHeight: 800,
    formats: ["jpg", "jpeg", "png", "webp"],
    maxBytes: 5 * MB,
    exportFormat: "webp",
  },
  detail: {
    label: "商品详情大图",
    ratio: { width: 4, height: 5 },
    minWidth: 1200,
    minHeight: 1500,
    formats: ["jpg", "jpeg", "png", "webp"],
    maxBytes: 5 * MB,
    exportFormat: "webp",
  },
  logo: {
    label: "Logo",
    ratio: { width: 1, height: 1 },
    minWidth: 512,
    minHeight: 512,
    formats: ["png", "webp"],
    maxBytes: 2 * MB,
    exportFormat: "png",
  },
  qr: {
    label: "微信二维码",
    ratio: { width: 1, height: 1 },
    minWidth: 800,
    minHeight: 800,
    formats: ["jpg", "jpeg", "png", "webp"],
    maxBytes: 2 * MB,
    exportFormat: "webp",
  },
};

// specId -> upload-token 的 purpose（见 lib/oss/sts.js）
export const SPEC_TO_PURPOSE = {
  "banner-desktop": "banner",
  "banner-mobile": "banner",
  card: "card",
  detail: "detail",
  logo: "logo",
  qr: "qr",
};

export function getSpec(specId) {
  const spec = IMAGE_SPECS[specId];
  if (!spec) {
    throw new Error(`image-specs: 不支持的 specId "${specId}"（允许：${Object.keys(IMAGE_SPECS).join(", ")}）`);
  }
  return spec;
}

export function listSpecs() {
  return Object.entries(IMAGE_SPECS).map(([id, spec]) => ({ id, ...spec }));
}
