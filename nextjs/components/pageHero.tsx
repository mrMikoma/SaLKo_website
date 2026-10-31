import React from "react";
import Link from "next/link";
import Backdrop, { type BackdropName } from "@/components/backdrop";
import JsonLd from "@/components/jsonLd";
import { SITE_URL } from "@/utilities/seo";

// A crumb links to the path its labels spell out, without accents ("Kerho",
// "Kenttä" → /kerho/kentta). A level that has no page of its own is passed as
// { label, link: false } and shown as plain text.
type Crumb = string | { label: string; link: false };

const crumbLabel = (crumb: Crumb) => (typeof crumb === "string" ? crumb : crumb.label);
const crumbSlug = (crumb: Crumb) =>
  crumbLabel(crumb).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const crumbHref = (crumbs: Crumb[], index: number) =>
  "/" + crumbs.slice(0, index + 1).map(crumbSlug).join("/");

// The same trail as schema.org data for search results. Only when every level
// above this page has a page of its own; the last level is this page, which
// search engines take from the URL.
const breadcrumbJsonLd = (crumbs: Crumb[]) => {
  if (crumbs.slice(0, -1).some((crumb) => typeof crumb !== "string")) return null;
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Etusivu", item: `${SITE_URL}/` },
      ...crumbs.map((crumb, index) => ({
        "@type": "ListItem",
        position: index + 2,
        name: crumbLabel(crumb),
        ...(index < crumbs.length - 1 && { item: SITE_URL + crumbHref(crumbs, index) }),
      })),
    ],
  };
};

interface PageHeroProps {
  title?: string;
  subtitle?: string;
  backgroundImage?: BackdropName;
  breadcrumbs?: Crumb[];
  compact?: boolean;
  children?: React.ReactNode;
  showScrollIndicator?: boolean;
}

const PageHero = ({
  title,
  subtitle,
  backgroundImage = "olavinlinna",
  breadcrumbs,
  compact = false,
  children,
  showScrollIndicator = true,
}: PageHeroProps) => {
  const breadcrumbData = breadcrumbs?.length ? breadcrumbJsonLd(breadcrumbs) : null;

  return (
    <section className={`relative w-full ${compact ? "" : "min-h-screen"}`}>
      {/* Only a full-height hero's photo can be the largest paint; on compact
          ones it would compete with the page's own images */}
      <Backdrop name={backgroundImage} preload={!compact} />
      {breadcrumbData && <JsonLd data={breadcrumbData} />}

      {/* Gradient Overlay - Stronger at bottom */}
      <div className="absolute inset-0 bg-gradient-to-b from-sblack/20 via-sblack/60 to-sblued"></div>

      {/* Hero Content */}
      <div className="relative z-10 w-full">
        {/* Top Section - Breadcrumbs and Title */}
        <div className={`max-w-[1600px] mx-auto px-6 pt-36 lg:pt-48 pb-4`}>
          <div className="space-y-2">
            {/* Breadcrumbs */}
            {breadcrumbs && breadcrumbs.length > 0 && (
              <div className="flex items-center gap-2 text-xs md:text-sm text-swhite/60">
                <Link className="hover:text-swhite/90 transition-colors" href="/">
                  Etusivu
                </Link>
                {breadcrumbs.map((crumb, index) => {
                  const isLast = index === breadcrumbs.length - 1;
                  const label = crumbLabel(crumb);
                  const href = crumbHref(breadcrumbs, index);
                  return (
                    <React.Fragment key={index}>
                      <span>/</span>
                      {isLast ? (
                        <span className="text-swhite font-medium">{label}</span>
                      ) : typeof crumb !== "string" ? (
                        <span>{label}</span>
                      ) : (
                        <Link
                          href={href}
                          className="hover:text-swhite/90 transition-colors"
                        >
                          {label}
                        </Link>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            )}

            {/* Title */}
            <div className="space-y-2">
              <h1
                className={`font-bold leading-tight text-swhite text-3xl md:text-4xl lg:text-5xl`}
              >
                {title || subtitle || "Savonlinnan Lentokerho ry"}
              </h1>

              {subtitle && title && (
                <div className="flex items-center gap-3">
                  <div className="h-1 w-12 bg-sred"></div>
                  <p className="text-lg md:text-xl text-swhite/90 font-medium">
                    {subtitle}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Children content */}
        {children}
      </div>

      {/* Scroll Indicator - only show on full-screen hero */}
      {!compact && showScrollIndicator && (
        <div className="hidden lg:block absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-float">
          <div className="flex flex-col items-center gap-2">
            <svg
              className="w-8 h-8 text-swhite/70 animate-pulse"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </div>
        </div>
      )}
    </section>
  );
};

export default PageHero;
