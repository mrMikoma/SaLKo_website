import React from "react";
import Link from "next/link";

interface SolidCardProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  href?: string;
  variant?: "default" | "highlighted";
  children?: React.ReactNode;
  className?: string;
}

const SolidCard = ({
  title,
  description,
  icon,
  href,
  variant = "default",
  children,
  className = "",
}: SolidCardProps) => {
  const cardContent = (
    <div
      className={`
        group relative overflow-hidden rounded-xl shadow-lg
        transition-all duration-300 hover:shadow-2xl hover:-translate-y-1
        ${
          variant === "highlighted"
            ? "bg-gradient-to-br from-sblue to-sblued border-2 border-sred"
            : "bg-sblued border-2 border-sbluel/30"
        }
        h-full p-6 md:p-8
        ${className}
      `}
    >
      {/* Icon */}
      {icon && (
        <div className="mb-4 text-sred group-hover:scale-110 transition-transform duration-300">
          {icon}
        </div>
      )}

      {/* Title */}
      <h3 className="text-xl md:text-2xl font-bold text-swhite mb-3 group-hover:text-sbluel transition-colors duration-300">
        {title}
      </h3>

      {/* Description */}
      {description && (
        <p className="text-swhite/80 text-base leading-relaxed">
          {description}
        </p>
      )}

      {/* Custom Children Content */}
      {children && <div className="mt-4">{children}</div>}

      {/* Arrow indicator for links */}
      {href && (
        <div className="mt-6 flex items-center text-sred font-semibold group-hover:translate-x-2 transition-transform duration-300">
          <span>Lue lisää</span>
          <svg
            className="w-5 h-5 ml-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 8l4 4m0 0l-4 4m4-4H3"
            />
          </svg>
        </div>
      )}
    </div>
  );

  if (href) {
    return <Link href={href}>{cardContent}</Link>;
  }

  return cardContent;
};

export default SolidCard;
