// OSS 上传对象校验（阶段 C · C2）
// 服务端下载对象后用 sharp 校验格式/尺寸/比例/大小，符合 lib/image-specs.js 规范。
import { createHash } from "node:crypto";
import OSS from "ali-oss";
import sharp from "sharp";
import { getSpec } from "../image-specs.js";

const RATIO_TOLERANCE_PX = 2;

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`validate: 缺少环境变量 ${name}（请在 .env.local 中配置）`);
  }
  return value;
}

function normalizeFormat(format) {
  return format === "jpeg" ? "jpg" : format;
}

export function createOssAdminClient() {
  const region = requireEnv("OSS_REGION");
  const bucket = requireEnv("OSS_BUCKET");
  const accessKeyId = requireEnv("OSS_ACCESS_KEY_ID");
  const accessKeySecret = requireEnv("OSS_ACCESS_KEY_SECRET");
  return new OSS({
    endpoint: `https://oss-${region}.aliyuncs.com`,
    accessKeyId,
    accessKeySecret,
    bucket,
  });
}

/**
 * 校验图片字节流是否符合规范（纯函数，供单测与 validateUploadedImage 复用）。
 * @param {Buffer} buffer 图片字节
 * @param {object} spec image-specs.js 中的规范对象
 * @param {{ byteSize?: number, checksum?: string }} options
 */
export async function validateImageBuffer(buffer, spec, { byteSize = buffer.length, checksum } = {}) {
  if (!spec || typeof spec !== "object") {
    throw new Error("validate: 缺少图片规范");
  }
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new Error("validate: 图片内容为空");
  }
  if (byteSize > spec.maxBytes) {
    throw new Error(`validate: 图片大小 ${byteSize} 字节超过上限 ${spec.maxBytes} 字节`);
  }

  const metadata = await sharp(buffer).metadata();
  const format = normalizeFormat(metadata.format || "");
  if (!spec.formats.includes(format)) {
    throw new Error(`validate: 图片格式 ${format || "未知"} 不在允许范围（${spec.formats.join("/")}）`);
  }

  const width = metadata.width || 0;
  const height = metadata.height || 0;
  if (width < spec.minWidth || height < spec.minHeight) {
    throw new Error(`validate: 图片尺寸 ${width}×${height} 小于最小要求 ${spec.minWidth}×${spec.minHeight}`);
  }

  const expectedHeight = Math.round((width * spec.ratio.height) / spec.ratio.width);
  if (Math.abs(height - expectedHeight) > RATIO_TOLERANCE_PX) {
    throw new Error(
      `validate: 图片比例 ${width}×${height} 不符合 ${spec.ratio.width}:${spec.ratio.height}（容差 ±${RATIO_TOLERANCE_PX}px）`,
    );
  }

  if (checksum) {
    const actual = createHash("sha256").update(buffer).digest("hex");
    if (actual !== checksum) {
      throw new Error("validate: 图片校验和不一致（上传内容可能被篡改）");
    }
  }

  return { width, height, format, byteSize, checksum: checksum || undefined };
}

/**
 * 下载 OSS 对象并校验（服务端接口使用）。
 * @param {{ objectKey: string, specId: string, checksum?: string }} input
 */
export async function validateUploadedImage({ objectKey, specId, checksum }) {
  const spec = getSpec(specId);
  const client = createOssAdminClient();
  let result;
  try {
    result = await client.get(objectKey);
  } catch {
    throw new Error("validate: 对象不存在或无法读取（请先完成上传）");
  }
  const buffer = Buffer.isBuffer(result.content) ? result.content : Buffer.from(result.content || "");
  return validateImageBuffer(buffer, spec, { byteSize: buffer.length, checksum });
}
