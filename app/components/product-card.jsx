import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { formatPriceCents } from "@/lib/money";

export default function ProductCard({ product, locale }) {
  const price = `¥${formatPriceCents(product.priceFrom)}`;
  const priceLabel = product.skuCount > 1
    ? locale === "cn" ? `${price} 起` : `From ${price}`
    : price;
  return (
    <Link className="product-card" href={`/${locale}/products/${product.id}`}>
      <div className="product-card-image-wrap">
        <img className="product-card-image" src={product.coverUrl} alt={product.name} />
        <span className="card-arrow" aria-hidden="true"><ArrowUpRight size={16} /></span>
      </div>
      <div className="product-card-body">
        <div className="tag-row">{product.tags.slice(0, 2).map((tag, index) => <span key={`${product.id}-${index}`}>{tag}</span>)}</div>
        <h3>{product.name}</h3>
        <p>{priceLabel}</p>
      </div>
    </Link>
  );
}
