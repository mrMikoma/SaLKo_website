import React from "react";

interface TextBlockProps {
  children: React.ReactNode;
  align?: "left" | "center";
  maxWidth?: "sm" | "md" | "lg" | "xl" | "full";
  className?: string;
}

const TextBlock = ({
  children,
  align = "left",
  maxWidth = "lg",
  className = "",
}: TextBlockProps) => {
  const maxWidthClasses = {
    sm: "max-w-2xl",
    md: "max-w-3xl",
    lg: "max-w-4xl",
    xl: "max-w-6xl",
    full: "max-w-full",
  };

  const alignClasses = {
    left: "",
    center: "mx-auto text-center",
  };

  return (
    <div
      className={`
        ${maxWidthClasses[maxWidth]}
        ${alignClasses[align]}
        prose prose-invert prose-lg
        ${className}
      `}
      style={{
        // Custom prose styles for better control
        color: "var(--color-swhite)",
      }}
    >
      <div className="space-y-4 text-swhite/90 leading-relaxed">{children}</div>
    </div>
  );
};

export default TextBlock;
