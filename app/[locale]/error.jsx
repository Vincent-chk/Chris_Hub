"use client";

import Link from "next/link";

export default function LocaleError() {
  return (
    <div className="site-frame" style={{ display: "grid", placeItems: "center", minHeight: "60vh" }}>
      <div style={{ textAlign: "center", maxWidth: 420 }}>
        <h1>出错了 / Something went wrong</h1>
        <p>请稍后重试，或返回首页。</p>
        <Link href="/cn" style={{ color: "#167f79", fontWeight: 700 }}>返回首页 / Back to home</Link>
      </div>
    </div>
  );
}
