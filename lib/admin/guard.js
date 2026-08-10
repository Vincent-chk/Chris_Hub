// 中台 accessKey 守卫（阶段 C · C1）
// 一期不建立账号/密码/登录/会话：唯一凭据是路径中的 accessKey，
// 与环境变量 ADMIN_ENTRY_KEY 做常量时间比较，防止时序侧信道。
import { timingSafeEqual } from "node:crypto";

export function isValidAdminKey(accessKey) {
  const expected = process.env.ADMIN_ENTRY_KEY;
  if (!expected || typeof accessKey !== "string" || accessKey.length === 0) {
    return false;
  }
  const actual = Buffer.from(accessKey, "utf8");
  const expectedBuf = Buffer.from(expected, "utf8");
  if (actual.length !== expectedBuf.length) {
    return false;
  }
  return timingSafeEqual(actual, expectedBuf);
}
