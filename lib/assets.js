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
  return base ? `${base}/${objectKey}` : `/${objectKey}`;
}
