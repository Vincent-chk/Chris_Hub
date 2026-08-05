import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { copy, localized } from "@/lib/i18n";
import { getCardImage, getCardPrice, getTag } from "@/lib/mock-data";

export default function ProductCard({ product, locale }) {
  const text = copy(locale);
  const enabledSkuCount = product.skus.filter((sku) => sku.enabled !== false).length;
  const priceLabel = enabledSkuCount > 1
    ? locale === "cn" ? `¥${getCardPrice(product)} ${text.from}` : `From ¥${getCardPrice(product)}`
    : `¥${getCardPrice(product)}`;
  return (
    <Link className="product-card" href={`/${locale}/products/${product.id}`}>
      <div className="product-card-image-wrap">
        <img className="product-card-image" src={getCardImage(product)} alt={localized(product.name, locale)} />
        <span className="card-arrow" aria-hidden="true"><ArrowUpRight size={16} /></span>
      </div>
      <div className="product-card-body">
        <div className="tag-row">{product.tags.slice(0, 2).map((tagId) => { const tag = getTag(tagId); return <span key={tagId}>{localized(tag, locale)}</span>; })}</div>
        <h3>{localized(product.name, locale)}</h3>
        <p>{priceLabel}</p>
      </div>
    </Link>
  );
}
