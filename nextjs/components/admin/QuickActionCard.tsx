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
      className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
    >
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 text-sm">{description}</p>
    </Link>
  );
};

export default QuickActionCard;
