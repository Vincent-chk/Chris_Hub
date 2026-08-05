import ProductCard from "@/app/components/product-card";

export default function ProductGrid({ products, locale }) {
  return <div className="product-grid">{products.map((product) => <ProductCard key={product.id} product={product} locale={locale} />)}</div>;
}
