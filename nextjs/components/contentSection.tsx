import React from "react";

interface ContentSectionProps {
  children: React.ReactNode;
  variant?: "dark" | "darker" | "gradient" | "light";
  className?: string;
  containerSize?: "default" | "wide" | "full";
  backgroundImage?: string;
  overlay?: "light" | "medium" | "heavy" | "none";
}

const ContentSection = ({
  children,
  variant = "dark",
  className = "",
  containerSize = "default",
  backgroundImage,
  overlay = "medium",
}: ContentSectionProps) => {
  const variantClasses = {
    blue: "bg-sblue",
    dark: "bg-sblued",
    darker: "bg-gradient-to-b from-sblued to-sblued/70",
    gradient:
      "bg-gradient-to-b from-sblued via-sblued/80 via-sblued/40 to-sblue",
    light: "bg-sblued/20",
  };

  const overlayClasses = {
    none: "",
    light: "bg-gradient-to-b from-sblued/40 via-sblued/60 to-sblued/80",
    medium: "bg-gradient-to-b from-sblued/60 via-sblued/80 to-sblued",
    heavy: "bg-gradient-to-b from-sblued/80 via-sblued/90 to-sblued",
  };

  const containerClasses = {
    default: "container mx-auto px-6",
    wide: "max-w-[1600px] mx-auto px-6",
    full: "w-full px-6",
  };

  if (backgroundImage) {
    return (
      <section
        className={`relative w-full py-16 lg:py-24 ${backgroundImage} ${className}`}
        style={{
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      >
        {/* Overlay */}
        {overlay !== "none" && (
          <div className={`absolute inset-0 ${overlayClasses[overlay]}`}></div>
        )}

        {/* Content */}
        <div className={`relative z-10 ${containerClasses[containerSize]}`}>
          {children}
        </div>
      </section>
    );
  }

  return (
    <section
      className={`w-full ${variantClasses[variant]} py-16 lg:py-24 ${className}`}
    >
      <div className={containerClasses[containerSize]}>{children}</div>
    </section>
  );
};

export default ContentSection;
