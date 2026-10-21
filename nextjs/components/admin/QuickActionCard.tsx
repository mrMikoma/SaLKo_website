import Link from "next/link";

interface QuickActionCardProps {
  href: string;
  title: string;
  description: string;
}

const QuickActionCard = ({ href, title, description }: QuickActionCardProps) => {
  return (
    <Link
      href={href}
      className="block h-full rounded-lg border border-gray-200 p-4 hover:shadow"
    >
      <span className="block font-medium text-gray-900">{title}</span>
      <span className="block text-sm text-gray-600">{description}</span>
    </Link>
  );
};

export default QuickActionCard;
