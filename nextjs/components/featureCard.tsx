import Link from "next/link";
import React from "react";

interface FeatureCardProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  href: string;
  imageSrc?: string;
  variant?: "default" | "highlighted";
}

const FeatureCard = ({
  title,
  description,
  icon,
  href,
  imageSrc,
  variant = "default",
}: FeatureCardProps) => {
  return (
    <Link href={href}>
      <div
        className={`
          group relative overflow-hidden rounded-2xl shadow-lg
          transition-all duration-300 card-hover
          ${
            variant === "highlighted"
              ? "bg-gradient-to-br from-sblue to-sblued border-2 border-sred"
              : "glass border border-sbluel/30"
          }
          h-full
        `}
      >
        {/* Background Image (if provided) */}
        {imageSrc && (
          <div className="absolute inset-0 opacity-20 group-hover:opacity-30 transition-opacity duration-300">
            <div
              className="w-full h-full bg-cover bg-center"
              style={{ backgroundImage: `url(${imageSrc})` }}
            />
          </div>
        )}

        {/* Card Content */}
        <div className="relative p-8 flex flex-col h-full">
          {/* Icon */}
          {icon && (
            <div className="mb-4 text-sred group-hover:scale-110 transition-transform duration-300">
              {icon}
            </div>
          )}

          {/* Title */}
          <h3 className="text-2xl font-bold text-swhite mb-3 group-hover:text-sbluel transition-colors duration-300">
            {title}
          </h3>

          {/* Description */}
          <p className="text-swhite/80 text-base leading-relaxed flex-grow">
            {description}
          </p>

          {/* Arrow indicator */}
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
        </div>
      </div>
    </Link>
  );
};

export default FeatureCard;
