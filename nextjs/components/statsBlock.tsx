import React from "react";

interface Stat {
  value: string | number;
  label: string;
  description?: string;
}

interface StatsBlockProps {
  stats: Stat[];
  layout?: "horizontal" | "grid";
  align?: "left" | "center";
  className?: string;
}

const StatsBlock = ({
  stats,
  layout = "horizontal",
  align = "center",
  className = "",
}: StatsBlockProps) => {
  const layoutClasses = {
    horizontal: "flex flex-wrap gap-6 lg:gap-8",
    grid: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8",
  };

  const alignClasses = {
    left: "justify-start",
    center: "justify-center",
  };

  return (
    <div
      className={`
        ${layoutClasses[layout]}
        ${layout === "horizontal" ? alignClasses[align] : ""}
        ${className}
      `}
    >
      {stats.map((stat, index) => (
        <div
          key={index}
          className={`
            ${layout === "horizontal" ? "text-center lg:text-left" : "text-center"}
          `}
        >
          <div className="text-3xl md:text-4xl font-bold text-sred">
            {stat.value}
          </div>
          <div className="text-sm md:text-base text-swhite/80 font-medium mt-1">
            {stat.label}
          </div>
          {stat.description && (
            <div className="text-xs text-swhite/60 mt-1">
              {stat.description}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default StatsBlock;
