export const TAGS = [
  { id: "pokemon", cn: "宝可梦", en: "Pokémon" },
  { id: "promo", cn: "限定", en: "Promo" },
  { id: "japanese", cn: "日文版", en: "Japanese" },
  { id: "rare", cn: "稀有", en: "Rare" },
];

const baseProducts = [
  {
    id: "product-01",
    name: { cn: "宝可梦皮卡丘纪念卡", en: "Pikachu Commemorative Card" },
    description: { cn: "一张适合慢慢观看的纪念卡，细节与配色都保留了收藏品应有的秩序。", en: "A commemorative card made for slow looking, with the detail and color balance of a considered collectible." },
    tags: ["pokemon", "promo"],
    viewCount: 982,
    createdAt: "2026-07-26",
    skus: [
      { id: "sku-01-a", name: { cn: "宝可梦皮卡丘纪念卡 · 标准版", en: "Pikachu Commemorative Card · Standard" }, tab: { cn: "标准版", en: "Standard" }, price: 39, images: ["/products/card-01.svg", "/products/card-02.svg"] },
      { id: "sku-01-b", name: { cn: "宝可梦皮卡丘纪念卡 · 闪卡版", en: "Pikachu Commemorative Card · Foil" }, tab: { cn: "闪卡版", en: "Foil" }, price: 89, images: ["/products/card-03.svg", "/products/card-01.svg"] },
    ],
  },
  {
    id: "product-02",
    name: { cn: "火焰鸟限定插画卡", en: "Moltres Limited Illustration" },
    description: { cn: "以火焰和橙红色调为主的限定插画版本，适合放入主题收藏。", en: "A limited illustration edition built around flame and warm orange tones, made for a themed collection." },
    tags: ["pokemon", "rare"], viewCount: 874, createdAt: "2026-07-22",
    skus: [{ id: "sku-02-a", name: { cn: "火焰鸟限定插画卡", en: "Moltres Limited Illustration" }, tab: { cn: "限定版", en: "Limited" }, price: 129, images: ["/products/card-04.svg", "/products/card-05.svg"] }],
  },
  {
    id: "product-03",
    name: { cn: "森林旅人特别版", en: "Forest Traveller Special Edition" },
    description: { cn: "一组带有森林蓝绿色调的特别版本，纸面层次清晰。", en: "A special edition in forest greens and blues, with a crisp layered print surface." },
    tags: ["promo", "japanese"], viewCount: 745, createdAt: "2026-07-19",
    skus: [{ id: "sku-03-a", name: { cn: "森林旅人特别版 · 日文", en: "Forest Traveller · Japanese" }, tab: { cn: "日文版", en: "Japanese" }, price: 69, images: ["/products/card-06.svg", "/products/card-02.svg"] }],
  },
  {
    id: "product-04",
    name: { cn: "月光龙稀有收藏卡", en: "Moon Dragon Rare Collectible" },
    description: { cn: "银灰月光与深蓝轮廓，适合作为收藏柜中的安静焦点。", en: "Silver moonlight and deep blue contours, a quiet focal point for a display cabinet." },
    tags: ["rare", "japanese"], viewCount: 698, createdAt: "2026-07-16",
    skus: [
      { id: "sku-04-a", name: { cn: "月光龙稀有收藏卡 · 小尺寸", en: "Moon Dragon · Small Format" }, tab: { cn: "小尺寸", en: "Small" }, price: 159, images: ["/products/card-02.svg", "/products/card-06.svg"] },
      { id: "sku-04-b", name: { cn: "月光龙稀有收藏卡 · 大尺寸", en: "Moon Dragon · Large Format" }, tab: { cn: "大尺寸", en: "Large" }, price: 239, images: ["/products/card-05.svg", "/products/card-02.svg"] },
    ],
  },
  {
    id: "product-05",
    name: { cn: "海岸线训练家卡", en: "Coastline Trainer Card" },
    description: { cn: "明亮的海岸线构图，卡面留有足够呼吸感。", en: "A bright coastline composition with generous breathing room across the card face." },
    tags: ["pokemon"], viewCount: 582, createdAt: "2026-07-12",
    skus: [{ id: "sku-05-a", name: { cn: "海岸线训练家卡", en: "Coastline Trainer Card" }, tab: { cn: "标准版", en: "Standard" }, price: 49, images: ["/products/card-06.svg"] }],
  },
  {
    id: "product-06",
    name: { cn: "星尘舞台纪念卡", en: "Stardust Stage Commemorative" },
    description: { cn: "一张带有舞台感的纪念卡，适合与闪卡和限定卡搭配。", en: "A stage-lit commemorative card that pairs well with foil and promo pieces." },
    tags: ["promo"], viewCount: 517, createdAt: "2026-07-09",
    skus: [{ id: "sku-06-a", name: { cn: "星尘舞台纪念卡", en: "Stardust Stage Commemorative" }, tab: { cn: "纪念版", en: "Commemorative" }, price: 79, images: ["/products/card-03.svg", "/products/card-04.svg"] }],
  },
  {
    id: "product-07",
    name: { cn: "蓝湾收藏套卡", en: "Blue Bay Collection Set" },
    description: { cn: "蓝色湾岸和清爽白边，适合做成系列化的收藏入口。", en: "Blue shoreline tones and clean white borders, an inviting entry to a series." },
    tags: ["japanese"], viewCount: 453, createdAt: "2026-07-04",
    skus: [{ id: "sku-07-a", name: { cn: "蓝湾收藏套卡 · 12张", en: "Blue Bay Set · 12 cards" }, tab: { cn: "12张", en: "12 cards" }, price: 99, images: ["/products/card-01.svg", "/products/card-06.svg"] }],
  },
  {
    id: "product-08",
    name: { cn: "赤焰徽章特别卡", en: "Crimson Badge Special Card" },
    description: { cn: "红色徽章与细线结构，适合放在收藏页的视觉中心。", en: "A red badge and fine-line structure designed to hold the visual center of a collection." },
    tags: ["rare", "promo"], viewCount: 402, createdAt: "2026-06-28",
    skus: [{ id: "sku-08-a", name: { cn: "赤焰徽章特别卡", en: "Crimson Badge Special Card" }, tab: { cn: "特别版", en: "Special" }, price: 119, images: ["/products/card-04.svg", "/products/card-03.svg"] }],
  },
];

export const PRODUCTS = Array.from({ length: 24 }, (_, index) => {
  const base = baseProducts[index % baseProducts.length];
  if (index < baseProducts.length) return base;
  return {
    ...base,
    id: `product-${String(index + 1).padStart(2, "0")}`,
    name: { cn: `${base.name.cn} ${String(index + 1).padStart(2, "0")}`, en: `${base.name.en} ${String(index + 1).padStart(2, "0")}` },
    viewCount: Math.max(base.viewCount - index * 11, 88),
    createdAt: `2026-06-${String(28 - (index % 20)).padStart(2, "0")}`,
    skus: base.skus.map((sku, skuIndex) => ({ ...sku, id: `${sku.id}-${index}`, images: [...sku.images], price: sku.price + (index % 3) * 10 + skuIndex * 3 })),
  };
});

export const BANNERS = [
  { id: "banner-cn", cn: "/banners/banner-cn.svg", en: "/banners/banner-en.svg", cnMobile: "/banners/banner-cn-mobile.svg", enMobile: "/banners/banner-en-mobile.svg" },
  { id: "banner-cn-2", cn: "/banners/banner-cn.svg", en: "/banners/banner-en.svg", cnMobile: "/banners/banner-cn-mobile.svg", enMobile: "/banners/banner-en-mobile.svg" },
];

export function getProduct(productId) {
  return PRODUCTS.find((product) => product.id === productId);
}

export function getCardPrice(product) {
  const enabled = product.skus.filter((sku) => sku.enabled !== false);
  return Math.min(...enabled.map((sku) => sku.price));
}

export function getCardImage(product) {
  return product.skus.find((sku) => sku.enabled !== false)?.images[0] || "/products/card-01.svg";
}

export function getTag(tagId) {
  return TAGS.find((tag) => tag.id === tagId);
}
