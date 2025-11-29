import Link from "next/link";

interface Button {
  text: string;
  href: string;
  variant?: "primary" | "secondary" | "outline";
}

interface CallToActionProps {
  title: string;
  description?: string;
  primaryButton?: Button;
  secondaryButton?: Button;
  className?: string;
}

const CallToAction = ({
  title,
  description,
  primaryButton,
  secondaryButton,
  className = "",
}: CallToActionProps) => {
  const getButtonClasses = (variant: Button["variant"] = "primary") => {
    const baseClasses =
      "px-8 py-4 font-semibold rounded-lg shadow-xl transition-all duration-300 text-center";

    switch (variant) {
      case "primary":
        return `${baseClasses} bg-sred text-swhite hover:bg-sred/90 hover:shadow-2xl hover:-translate-y-1`;
      case "secondary":
        return `${baseClasses} bg-sblue/80 backdrop-blur-sm text-swhite hover:bg-sblue hover:shadow-2xl hover:-translate-y-1 border-2 border-sbluel/30`;
      case "outline":
        return `${baseClasses} bg-transparent text-swhite hover:bg-sblue/30 hover:shadow-2xl hover:-translate-y-1 border-2 border-sbluel`;
      default:
        return baseClasses;
    }
  };

  return (
    <div
      className={`
        bg-sblue/50 backdrop-blur-sm rounded-2xl md:rounded-3xl
        p-8 md:p-12 text-center
        border-2 border-sred/70 shadow-2xl
        ${className}
      `}
    >
      <h2 className="text-3xl md:text-4xl font-bold text-swhite mb-4">
        {title}
      </h2>

      {description && (
        <p className="text-lg md:text-xl text-swhite/90 mb-8 max-w-3xl mx-auto">
          {description}
        </p>
      )}

      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        {primaryButton && (
          <Link
            href={primaryButton.href}
            className={getButtonClasses(primaryButton.variant || "primary")}
          >
            {primaryButton.text}
          </Link>
        )}

        {secondaryButton && (
          <Link
            href={secondaryButton.href}
            className={getButtonClasses(secondaryButton.variant || "outline")}
          >
            {secondaryButton.text}
          </Link>
        )}
      </div>
    </div>
  );
};

export default CallToAction;
