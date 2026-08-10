import { test } from "node:test";
import assert from "node:assert/strict";
import "./helpers.mjs";
import { GET as listGet, POST as savePost } from "../app/admin/[accessKey]/api/products/route.js";
import { GET as aggregateGet } from "../app/admin/[accessKey]/api/products/[productId]/route.js";
import { GET as tagsGet, POST as tagsPost } from "../app/admin/[accessKey]/api/tags/route.js";
import { GET as ossGet } from "../app/oss/[...key]/route.js";

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

test("oss 代理: 非法前缀 404；环境缺失 500（不触发网络）", async () => {
  setEnv({ ADMIN_ENTRY_KEY: KEY });
  try {
    assert.equal((await ossProxy("evil/x.png")).status, 404);
    assert.equal((await ossProxy("banner/x.png")).status, 500);
  } finally {
    restoreEnv();
  }
});
