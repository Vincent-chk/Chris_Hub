// OSS STS 临时直传凭证（阶段 C · C0）
// 服务端使用长期 AK 调用 AssumeRole，签发只允许 PutObject 到单个 objectKey 的短时效凭证。
import { randomUUID } from "node:crypto";
import StsPkg from "@alicloud/sts20150401";
import OpenApiPkg from "@alicloud/openapi-client";

const StsClient = StsPkg.default || StsPkg;
const OpenApiClient = OpenApiPkg.default || OpenApiPkg;
const { AssumeRoleRequest } = StsPkg;
const { Config } = OpenApiPkg;

export const UPLOAD_PURPOSES = ["card", "detail", "banner", "logo", "qr"];
const ALLOWED_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp"]);
const STS_DURATION_SECONDS = 900; // 15 分钟
const STS_ENDPOINT = "sts.aliyuncs.com";
const ROLE_SESSION_NAME = "chris-hub-admin";

/**
 * 生成受控业务前缀的 objectKey。
 * purpose: card | detail | banner | logo | qr
 */
export function buildObjectKey({ purpose, extension, skuId }) {
  const normalizedPurpose = String(purpose ?? "").toLowerCase();
  if (!UPLOAD_PURPOSES.includes(normalizedPurpose)) {
    throw new Error(`buildObjectKey: 不支持的 purpose "${purpose}"（允许：${UPLOAD_PURPOSES.join(", ")}）`);
  }
  if (normalizedPurpose === "card" || normalizedPurpose === "detail") {
    if (typeof skuId !== "string" || !skuId.trim()) {
      throw new Error(`buildObjectKey: purpose "${normalizedPurpose}" 必须提供 skuId`);
    }
  }
  const ext = String(extension ?? "").toLowerCase().replace(/^\./, "");
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    throw new Error(`buildObjectKey: 不支持的扩展名 "${extension}"（允许：jpg, jpeg, png, webp）`);
  }
  const id = randomUUID();
  if (normalizedPurpose === "card") return `sku/${skuId}/card-${id}.${ext}`;
  if (normalizedPurpose === "detail") return `sku/${skuId}/${id}.${ext}`;
  if (normalizedPurpose === "banner") return `banner/${id}.${ext}`;
  if (normalizedPurpose === "logo") return `site/logo-${id}.${ext}`;
  return `site/qr-${id}.${ext}`;
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`createUploadCredentials: 缺少环境变量 ${name}（请在 .env.local 中配置）`);
  }
  return value;
}

function sessionPolicyFor(bucket, objectKey) {
  return JSON.stringify({
    Version: "1",
    Statement: [
      {
        Effect: "Allow",
        Action: ["oss:PutObject"],
        Resource: [`acs:oss:*:*:${bucket}/${objectKey}`],
      },
    ],
  });
}

/**
 * 签发单对象直传凭证。
 * 返回 { objectKey, credentials, expiresAt, region, bucket }；
 * credentials 为 { accessKeyId, accessKeySecret, securityToken }。
 */
export async function createUploadCredentials({ purpose, extension, skuId }) {
  const bucket = requireEnv("OSS_BUCKET");
  const region = requireEnv("OSS_REGION");
  const accessKeyId = requireEnv("OSS_ACCESS_KEY_ID");
  const accessKeySecret = requireEnv("OSS_ACCESS_KEY_SECRET");
  const roleArn = requireEnv("OSS_ROLE_ARN");

  const objectKey = buildObjectKey({ purpose, extension, skuId });

  const config = new Config({ accessKeyId, accessKeySecret });
  config.endpoint = STS_ENDPOINT;
  const client = new StsClient(config);
  const request = new AssumeRoleRequest({
    roleArn,
    roleSessionName: ROLE_SESSION_NAME,
    durationSeconds: STS_DURATION_SECONDS,
    policy: sessionPolicyFor(bucket, objectKey),
  });

  const response = await client.assumeRole(request);
  const credentials = response.body?.credentials;
  if (!credentials?.accessKeyId || !credentials?.accessKeySecret || !credentials?.securityToken) {
    throw new Error("createUploadCredentials: AssumeRole 返回缺少临时凭证字段");
  }

  return {
    objectKey,
    credentials: {
      accessKeyId: credentials.accessKeyId,
      accessKeySecret: credentials.accessKeySecret,
      securityToken: credentials.securityToken,
    },
    expiresAt: credentials.expiration,
    region,
    bucket,
  };
}
