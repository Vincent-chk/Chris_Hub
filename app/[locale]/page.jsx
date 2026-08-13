import { notFound } from "next/navigation";
import HomePage from "@/app/components/home-page";
import { isLocale } from "@/lib/i18n";
import { getHomeData } from "@/lib/repositories/catalog";

export default async function LocaleHome({ params }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const { banners, popularProducts, contact, logoUrl } = getHomeData(locale);
  return (
    <HomePage
      locale={locale}
      banners={banners}
      popularProducts={popularProducts}
      contact={contact}
      logoUrl={logoUrl}
    />
  );
}
