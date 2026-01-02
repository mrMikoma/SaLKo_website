import React from "react";
import Link from "next/link";

interface PageHeroProps {
  title?: string;
  subtitle?: string;
  backgroundImage?: string;
  breadcrumbs?: string[];
  compact?: boolean;
  children?: React.ReactNode;
  showScrollIndicator?: boolean;
}

const PageHero = ({
  title,
  subtitle,
  backgroundImage = "bg-olavinlinna-one",
  breadcrumbs,
  compact = false,
  children,
  showScrollIndicator = true,
}: PageHeroProps) => {
  return (
    <section
      className={`relative w-full ${backgroundImage} ${
        compact ? "" : "min-h-screen"
      }`}
      style={{
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      {/* Gradient Overlay - Stronger at bottom */}
      <div className="absolute inset-0 bg-gradient-to-b from-sblack/20 via-sblack/60 to-sblued"></div>

      {/* Hero Content */}
      <div className="relative z-10 w-full">
        {/* Top Section - Breadcrumbs and Title */}
        <div className={`max-w-[1600px] mx-auto px-6 pt-44 lg:pt-48 pb-12`}>
          <div className="space-y-4">
            {/* Breadcrumbs */}
            {breadcrumbs && breadcrumbs.length > 0 && (
              <div className="flex items-center gap-2 text-xs md:text-sm text-swhite/60">
                <Link
                  className="hover:text-swhite/90 transition-colors"
                  href="/"
                >
                  Etusivu
                </Link>
                {breadcrumbs.map((crumb, index) => (
                  <React.Fragment key={index}>
                    <span>/</span>
                    <span
                      className={
                        index === breadcrumbs.length - 1
                          ? "text-swhite font-medium"
                          : "hover:text-swhite/90 transition-colors"
                      }
                    >
                      {crumb}
                    </span>
                  </React.Fragment>
                ))}
              </div>
            )}

            {/* Title */}
            <div className="space-y-2 animate-fade-in">
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
