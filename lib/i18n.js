export const LOCALES = ["cn", "en"];

export const COPY = {
  cn: {
    navHome: "首页",
    navProducts: "全部商品",
    navContact: "联系我们",
    heroEyebrow: "收藏 · 研究 · 分享",
    heroTitle: "每一张卡牌，都值得你的热爱",
    heroBody: "无论您想咨询/购买/获取支持，请随时联系我们",
    explore: "浏览全部商品",
    brandEyebrow: "品牌介绍",
    brandTitle: "卡牌潮玩优选供应",
    brandTitleSub: "稳定 · 正品 · 高效",
    brandPoints: [
      "立足广州，全系商品经专人严苛质检，杜绝假货及重封隐患，承诺下单后4天内完成备货并发出。",
      "与宝可梦上海三大官方代理保持紧密合作，货源正宗稳定，省去中间环节，直接为您提供实在的一手价格。",
      "支持单件起订，无论您是初次尝试还是少量补货，我们都同样重视，不设门槛，让每一次购买都轻松无压力。",
    ],
    hotTitle: "热门商品",
    hotBody: "按近期浏览热度整理的收藏清单。",
    contactTitle: "想了解某一张卡？",
    contactBody: "欢迎通过微信联系我们，获取当前规格与价格信息。",
    contactAction: "联系购买",
    viewAll: "查看全部",
    searchPlaceholder: "搜索商品名称",
    searchAction: "搜索",
    latest: "最新",
    hot: "热门",
    filters: "标签筛选",
    clear: "清除",
    noResults: "没有找到符合条件的商品。",
    previous: "上一页",
    next: "下一页",
    pageOf: (page, total) => `第 ${page} / ${total} 页`,
    breadcrumbHome: "首页",
    breadcrumbProducts: "全部商品",
    selectedSku: "当前版本",
    from: "起",
    close: "关闭",
    wechat: "微信号",
    wechatPlaceholder: "二维码将在中台配置后显示",
    footerNote: "收藏有序，观看自由。",
  },
  en: {
    navHome: "Home",
    navProducts: "All products",
    navContact: "Contact",
    heroEyebrow: "Collect · Study · Share",
    heroTitle: "Every card deserves your love.",
    heroBody: "Whether you want to inquire, buy, or get support, feel free to contact us anytime.",
    explore: "Browse all products",
    brandEyebrow: "About the brand",
    brandTitle: "Preferred supply for cards & designer toys",
    brandTitleSub: "Stable · Authentic · Efficient",
    brandPoints: [
      "Based in Guangzhou, every product goes through strict specialist inspection — no counterfeits and no resealing risk. We promise your order is fully prepared and shipped within 4 days.",
      "We work closely with the three official Pokémon distributors in Shanghai. Our stock is authentic and stable, and with no middlemen, you get genuinely first-hand pricing.",
      "We support orders starting from a single piece. Whether you're trying us for the first time or topping up a small order, every purchase matters to us — no minimums, no pressure, just an easy, relaxed experience.",
    ],
    hotTitle: "Popular pieces",
    hotBody: "A collection shaped by recent browsing interest.",
    contactTitle: "Looking for a specific card?",
    contactBody: "Reach us on WeChat for current variants and pricing.",
    contactAction: "Contact to buy",
    viewAll: "View all",
    searchPlaceholder: "Search product names",
    searchAction: "Search",
    latest: "Latest",
    hot: "Popular",
    filters: "Filter by tag",
    clear: "Clear",
    noResults: "No products match these conditions.",
    previous: "Previous",
    next: "Next",
    pageOf: (page, total) => `Page ${page} / ${total}`,
    breadcrumbHome: "Home",
    breadcrumbProducts: "All products",
    selectedSku: "Current version",
    from: "from",
    close: "Close",
    wechat: "WeChat",
    wechatPlaceholder: "QR code will appear after it is configured in the admin panel",
    footerNote: "Collect with care, look freely.",
  },
};

export function isLocale(value) {
  return LOCALES.includes(value);
}

export function copy(locale) {
  return COPY[locale] || COPY.cn;
}

export function localized(value, locale) {
  return value?.[locale] || value?.cn || "";
}

export function switchLocalePath(pathname, locale) {
  return pathname.replace(/^\/(cn|en)(?=\/|$)/, `/${locale}`);
}
