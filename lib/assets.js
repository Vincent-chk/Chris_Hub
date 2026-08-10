import path from "node:path";

export function assetUrl(objectKey) {
  if (!objectKey) return null;
  if (objectKey.startsWith("mock/")) {
    return `/products/${path.basename(objectKey)}`;
  }
  if (objectKey.startsWith("banners/")) {
    return `/${objectKey}`;
  }
  const base = process.env.ASSET_BASE_URL;
  // 未配置 CDN 域名时（本地开发）走 /oss/ 代理读取私有桶
  return base ? `${base}/${objectKey}` : `/oss/${objectKey}`;
}
