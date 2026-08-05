import { notFound } from "next/navigation";
import HomePage from "@/app/components/home-page";
import { isLocale } from "@/lib/i18n";

export default async function LocaleHome({ params }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <HomePage locale={locale} />;
}
