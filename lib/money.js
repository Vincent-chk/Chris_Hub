export function formatPriceCents(priceCents) {
  return String((priceCents ?? 0) / 100);
}
