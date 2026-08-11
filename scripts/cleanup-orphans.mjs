// 全局孤儿对象清理脚本（阶段 C · 补充任务）
// 运行：pnpm cleanup:orphans              （dry-run，仅预览，不删除）
//       pnpm cleanup:orphans --apply      （真正删除孤儿对象）
//
// 什么时候用：中断上传/保存报错后怀疑有残留；迁移、导入、重跑 seed 之后；
//             定期维护（每周/每月一次、上线前一次）兜底；OSS 对象数或费用异常增长时。
// 谁发起：开发者或站点管理员手动执行；中台"开发者运维"页提供同样的检测/清理能力。
// 验收标准：dry-run 只读预览；--apply 后再次 dry-run 孤儿数为 0；被引用图片不受影响。
// 用户交互：先运行（预览）→ 确认清单 → 加 --apply 执行；详见 docs/technical/execution-plan.md。
import OSS from "ali-oss";
import { db } from "../lib/db/connection.js";
import { deleteOrphanObjects, detectOrphanObjects } from "../lib/oss/orphans.js";

const REQUIRED = ["OSS_REGION", "OSS_BUCKET", "OSS_ACCESS_KEY_ID", "OSS_ACCESS_KEY_SECRET"];
for (const key of REQUIRED) {
  if (!process.env[key]) {
    console.error(`[FATAL] 缺少环境变量 ${key}（请在 .env.local 中配置）`);
    process.exit(1);
  }
}

const apply = process.argv.includes("--apply");
const client = new OSS({
  endpoint: `https://oss-${process.env.OSS_REGION}.aliyuncs.com`,
  accessKeyId: process.env.OSS_ACCESS_KEY_ID,
  accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET,
  bucket: process.env.OSS_BUCKET,
});

async function main() {
  const result = await detectOrphanObjects(client, db);
  console.log(
    `扫描 ${result.scanned} 个对象；数据库引用 ${result.referencedCount} 个；孤儿 ${result.items.length} 个`,
  );
  for (const item of result.items) {
    console.log(` - ${item.key}${item.size ? ` (${(item.size / 1024 / 1024).toFixed(1)} MB)` : ""}`);
  }
  if (!result.items.length) {
    console.log(apply ? "没有孤儿对象，无需清理" : "没有孤儿对象");
    return;
  }
  if (!apply) {
    console.log("（dry-run 预览，未删除任何对象；确认无误后加 --apply 执行清理）");
    return;
  }
  const { deleted, failures } = await deleteOrphanObjects(client, result.items.map((item) => item.key));
  console.log(
    failures.length
      ? `已删除 ${deleted} 个，失败 ${failures.length} 个：${failures.join(", ")}`
      : `已删除 ${deleted} 个孤儿对象`,
  );
  if (failures.length) process.exitCode = 1;
}

main().catch((err) => {
  console.error("[cleanup-orphans] 失败:", err?.message || err);
  process.exit(1);
});
