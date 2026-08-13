"use client";

import { useState } from "react";

export default function UploadTokenCheck({ accessKey }) {
  const [state, setState] = useState({ status: "idle", message: "" });

  async function run() {
    setState({ status: "running", message: "" });
    try {
      const res = await fetch(`/admin/${encodeURIComponent(accessKey)}/api/upload-token`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ purpose: "banner", extension: "png" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setState({ status: "error", message: data?.error || `请求失败（${res.status}）` });
        return;
      }
      setState({
        status: "ok",
        message: `凭证与直传地址已生成：${data.objectKey}（有效期至 ${data.expiresAt}）`,
      });
    } catch (err) {
      setState({ status: "error", message: `请求异常：${err?.message || err}` });
    }
  }

  return (
    <div className="admin-check-card">
      <h2>上传凭证自检</h2>
      <p>验证服务端能否签发 OSS 临时直传凭证（banner/png，不实际上传）。</p>
      <button type="button" className="admin-check-button" onClick={run} disabled={state.status === "running"}>
        {state.status === "running" ? "检测中…" : "开始自检"}
      </button>
      {state.status === "ok" && <p className="admin-check-ok">{state.message}</p>}
      {state.status === "error" && <p className="admin-check-error">{state.message}</p>}
    </div>
  );
}
