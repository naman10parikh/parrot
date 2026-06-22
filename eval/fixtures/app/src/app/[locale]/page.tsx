// parrot acceptance fixture — the [locale] home page.
//
// This page is CORRECT on the setup footguns (so `parrot check`'s setRequestLocale leg is GREEN and the
// acceptance asserts init wired things right):
//   - `await params` (P3)                     - `setRequestLocale(locale)` before any translation read (P1/S1)
//
// …but it deliberately PLANTS ONE hardcoded user-facing string (the <p> below) that NEVER went through the
// message catalog — the catalog-bypass `parrot extract` must catch (acceptance condition 2, P9/O8). The
// catalog-driven <h1>/<p> show the correct pattern; the planted literal is the bug.
import { setRequestLocale } from "next-intl/server";
import { useTranslations } from "next-intl";

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params; // P3: params is a Promise on Next 15+
  setRequestLocale(locale); // P1/S1: required in EVERY static page, not just the layout

  return <Welcome />;
}

function Welcome() {
  const t = useTranslations("home");
  return (
    <main>
      {/* correct: full-sentence ICU via the catalog (never concatenate fragments — P9/O8) */}
      <h1>{t("title")}</h1>
      <p>{t("cartSummary", { count: 3 })}</p>
      {/* PLANTED catalog-bypass — a hardcoded user-facing string parrot extract must flag (acceptance cond. 2) */}
      <p>Free shipping on every order today</p>
    </main>
  );
}
