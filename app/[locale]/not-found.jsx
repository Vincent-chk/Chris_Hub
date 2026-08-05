import Link from "next/link";

export default function LocaleNotFound() {
  return (
    <div className="site-frame" style={{ display: "grid", placeItems: "center", minHeight: "60vh" }}>
      <div style={{ textAlign: "center", maxWidth: 420 }}>
        <h1>未找到 / Not Found</h1>
        <p>页面不存在或已下架。The page does not exist or is unavailable.</p>
        <Link href="/cn" style={{ color: "#167f79", fontWeight: 700 }}>返回首页 / Back to home</Link>
      </div>
    </div>
  );
}
