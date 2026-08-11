import { test } from "node:test";
import assert from "node:assert/strict";
import "./helpers.mjs";
import { GET as listGet, POST as savePost } from "../app/admin/[accessKey]/api/products/route.js";
import { GET as aggregateGet } from "../app/admin/[accessKey]/api/products/[productId]/route.js";
import { GET as tagsGet, POST as tagsPost } from "../app/admin/[accessKey]/api/tags/route.js";
import { POST as tagTogglePost } from "../app/admin/[accessKey]/api/tags/[tagId]/toggle/route.js";
import { GET as ossGet } from "../app/oss/[...key]/route.js";
import { GET as settingsGet, POST as settingsPost } from "../app/admin/[accessKey]/api/site-settings/route.js";

const KEY = "c1-test-entry-key-0123456789";
const ENV_KEYS = ["ADMIN_ENTRY_KEY", "OSS_BUCKET", "OSS_REGION", "OSS_ACCESS_KEY_ID", "OSS_ACCESS_KEY_SECRET"];
const savedEnv = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));

function setEnv(entries) {
  for (const key of ENV_KEYS) delete process.env[key];
  for (const [key, value] of Object.entries(entries)) process.env[key] = value;
}

function restoreEnv() {
  for (const key of ENV_KEYS) {
    if (savedEnv[key] !== undefined) process.env[key] = savedEnv[key];
    else delete process.env[key];
  }
}

function listProducts(accessKey, search = "") {
  return listGet(new Request(`http://localhost/admin/${accessKey}/api/products${search}`), {
    params: Promise.resolve({ accessKey }),
  });
}

function saveProduct(accessKey, body) {
  return savePost(
    new Request(`http://localhost/admin/${accessKey}/api/products`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ accessKey }) },
  );
}

function getProduct(accessKey, productId) {
  return aggregateGet(new Request(`http://localhost/admin/${accessKey}/api/products/${productId}`), {
    params: Promise.resolve({ accessKey, productId }),
  });
}

function getTags(accessKey) {
  return tagsGet(new Request(`http://localhost/admin/${accessKey}/api/tags`), {
    params: Promise.resolve({ accessKey }),
  });
}

function createTag(accessKey, body) {
  return tagsPost(
    new Request(`http://localhost/admin/${accessKey}/api/tags`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ accessKey }) },
  );
}

function getTagsAll(accessKey) {
  return tagsGet(new Request(`http://localhost/admin/${accessKey}/api/tags?all=1`), {
    params: Promise.resolve({ accessKey }),
  });
}

function toggleTag(accessKey, tagId, body) {
  return tagTogglePost(
    new Request(`http://localhost/admin/${accessKey}/api/tags/${tagId}/toggle`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ accessKey, tagId }) },
  );
}

function getSettings(accessKey) {
  return settingsGet(new Request(`http://localhost/admin/${accessKey}/api/site-settings`), {
    params: Promise.resolve({ accessKey }),
  });
}

function saveSettings(accessKey, body) {
  return settingsPost(
    new Request(`http://localhost/admin/${accessKey}/api/site-settings`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ accessKey }) },
  );
}

function ossProxy(objectKey) {
  return ossGet(new Request(`http://localhost/oss/${objectKey}`), {
    params: Promise.resolve({ key: objectKey.split("/") }),
  });
}

const DRAFT = {
  name: { cn: "路由测试商品", en: "Route Test" },
  description: { cn: "介绍", en: "Desc" },
  status: "draft",
  tagIds: [],
  skus: [],
};

test("products: 错误 accessKey 一律 404（列表/保存/详情）", async () => {
  setEnv({ ADMIN_ENTRY_KEY: KEY });
  try {
    assert.equal((await listProducts("wrong-key")).status, 404);
    assert.equal((await saveProduct("wrong-key", DRAFT)).status, 404);
    assert.equal((await getProduct("wrong-key", "x")).status, 404);
  } finally {
    restoreEnv();
  }
});

test("products: 列表返回分页结构", async () => {
  setEnv({ ADMIN_ENTRY_KEY: KEY });
  try {
    const res = await listProducts(KEY);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(Array.isArray(data.items));
    assert.equal(typeof data.total, "number");
    assert.equal(typeof data.totalPages, "number");
  } finally {
    restoreEnv();
  }
});

test("products: 保存草稿成功并可回读", async () => {
  setEnv({ ADMIN_ENTRY_KEY: KEY });
  try {
    const res = await saveProduct(KEY, DRAFT);
    assert.equal(res.status, 200);
    const { product } = await res.json();
    assert.ok(product.id);
    assert.equal(product.status, "draft");

    const detail = await getProduct(KEY, product.id);
    assert.equal(detail.status, 200);
    const detailData = await detail.json();
    assert.equal(detailData.name.cn, "路由测试商品");
  } finally {
    restoreEnv();
  }
});

test("products: 缺商品中文名返回 400", async () => {
  setEnv({ ADMIN_ENTRY_KEY: KEY });
  try {
    const res = await saveProduct(KEY, { ...DRAFT, name: { cn: " " } });
    assert.equal(res.status, 400);
  } finally {
    restoreEnv();
  }
});

test("products: updated_at 冲突返回 409", async () => {
  setEnv({ ADMIN_ENTRY_KEY: KEY });
  try {
    const created = await (await saveProduct(KEY, DRAFT)).json();
    const res = await saveProduct(KEY, {
      ...DRAFT,
      id: created.product.id,
      updatedAt: "2020-01-01T00:00:00.000Z",
    });
    assert.equal(res.status, 409);
  } finally {
    restoreEnv();
  }
});

test("products: 发布含图片但 OSS 环境缺失返回 500（不触发网络）", async () => {
  setEnv({ ADMIN_ENTRY_KEY: KEY });
  try {
    const res = await saveProduct(KEY, {
      ...DRAFT,
      status: "published",
      skus: [
        {
          name: { cn: "SKU1" },
          tab: { cn: "版本1" },
          priceCny: "10",
          enabled: true,
          position: 1,
          cardImage: { objectKey: "sku/test/card.png", checksum: "abc" },
          detailImages: [{ objectKey: "sku/test/detail.png", checksum: "abc" }],
        },
      ],
    });
    assert.equal(res.status, 500);
  } finally {
    restoreEnv();
  }
});

test("tags: 错误 accessKey 404；列表 200；新建 200/400/重名 400", async () => {
  setEnv({ ADMIN_ENTRY_KEY: KEY });
  try {
    assert.equal((await getTags("wrong-key")).status, 404);
    assert.equal((await createTag("wrong-key", { nameCn: "x" })).status, 404);

    const list = await getTags(KEY);
    assert.equal(list.status, 200);
    assert.ok(Array.isArray((await list.json()).items));

    const created = await createTag(KEY, { nameCn: "路由标签", nameEn: "Route Tag" });
    assert.equal(created.status, 200);
    assert.equal((await created.json()).tag.nameCn, "路由标签");

    const missing = await createTag(KEY, { nameCn: " " });
    assert.equal(missing.status, 400);

    const dup = await createTag(KEY, { nameCn: "路由标签" });
    assert.equal(dup.status, 400);
  } finally {
    restoreEnv();
  }
});

test("tags: ?all=1 含停用与 enabled；POST 带 id 编辑；toggle 404/200/400；错误 Key 404", async () => {
  setEnv({ ADMIN_ENTRY_KEY: KEY });
  try {
    assert.equal((await getTagsAll("wrong-key")).status, 404);
    assert.equal((await toggleTag("wrong-key", "x", { enabled: true })).status, 404);

    const created = await (await createTag(KEY, { nameCn: "路由标签2", nameEn: "Route2" })).json();
    const id = created.tag.id;

    // 带 id 编辑
    const edited = await tagsPost(
      new Request(`http://localhost/admin/${KEY}/api/tags`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, nameCn: "路由标签2改", nameEn: "Route2b" }),
      }),
      { params: Promise.resolve({ accessKey: KEY }) },
    );
    assert.equal(edited.status, 200);
    assert.equal((await edited.json()).tag.nameCn, "路由标签2改");

    // 停用后：默认 GET 不含，?all=1 含且 enabled=false
    assert.equal((await toggleTag(KEY, id, { enabled: false })).status, 200);
    const defaultList = await (await getTags(KEY)).json();
    assert.ok(!defaultList.items.some((item) => item.id === id));
    const allList = await (await getTagsAll(KEY)).json();
    const row = allList.items.find((item) => item.id === id);
    assert.ok(row);
    assert.equal(row.enabled, false);

    // 重新启用
    assert.equal((await toggleTag(KEY, id, { enabled: true })).status, 200);
    const allList2 = await (await getTagsAll(KEY)).json();
    assert.equal(allList2.items.find((item) => item.id === id).enabled, true);

    // toggle 非法 body 400；不存在标签 404
    assert.equal((await toggleTag(KEY, id, {})).status, 400);
    assert.equal((await toggleTag(KEY, "tag-not-exist", { enabled: true })).status, 404);
  } finally {
    restoreEnv();
  }
});

test("oss 代理: 非法前缀 404；环境缺失 500（不触发网络）", async () => {
  setEnv({ ADMIN_ENTRY_KEY: KEY });
  try {
    assert.equal((await ossProxy("evil/x.png")).status, 404);
    assert.equal((await ossProxy("banner/x.png")).status, 500);
  } finally {
    restoreEnv();
  }
});

test("site-settings: 错误 Key 404；GET 200；缺微信号 400；保存成功 200", async () => {
  setEnv({ ADMIN_ENTRY_KEY: KEY });
  try {
    assert.equal((await getSettings("wrong-key")).status, 404);
    assert.equal((await saveSettings("wrong-key", { wechatId: "x" })).status, 404);

    const getRes = await getSettings(KEY);
    assert.equal(getRes.status, 200);
    assert.equal(typeof (await getRes.json()).wechatId, "string");

    const missing = await saveSettings(KEY, { wechatId: "  " });
    assert.equal(missing.status, 400);

    const ok = await saveSettings(KEY, {
      wechatId: "ChrisHub_Cards",
      contactTextCn: "联系说明",
      contactTextEn: "Contact",
      logo: null,
      qr: null,
    });
    assert.equal(ok.status, 200);
    const { settings } = await ok.json();
    assert.equal(settings.wechatId, "ChrisHub_Cards");
  } finally {
    restoreEnv();
  }
});

test("site-settings: 带图保存且 OSS 环境缺失返回 500（不触发网络）", async () => {
  setEnv({ ADMIN_ENTRY_KEY: KEY });
  try {
    const res = await saveSettings(KEY, {
      wechatId: "x",
      logo: { objectKey: "site/logo.png", checksum: "abc" },
      qr: null,
    });
    assert.equal(res.status, 500);
  } finally {
    restoreEnv();
  }
});
