export const LOCALES = ["cn", "en"];

export const COPY = {
  cn: {
    navHome: "首页",
    navProducts: "全部商品",
    navContact: "联系我们",
    heroEyebrow: "收藏 · 研究 · 分享",
    heroTitle: "把每一张卡，放回它值得被看见的位置。",
    heroBody: "克里斯卡社为卡牌收藏者整理一处更安静、更清晰的浏览空间。",
    explore: "浏览全部商品",
    brandEyebrow: "品牌介绍",
    brandTitle: "卡牌不只是纸面上的图案。",
    brandBody: "它们记录系列、版本、时间与人与人之间的交换。我们用清晰的图片与克制的页面，把每个值得收藏的片段留在这里。",
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
    heroTitle: "Every card deserves a place to be seen.",
    heroBody: "Chris Hub is a quieter, clearer browsing space for collectible card pieces.",
    explore: "Browse all products",
    brandEyebrow: "About the brand",
    brandTitle: "A card is more than an image on paper.",
    brandBody: "It carries a series, a version, a moment in time, and the exchange between people. We keep the presentation clear so each collectible detail can stay in focus.",
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
