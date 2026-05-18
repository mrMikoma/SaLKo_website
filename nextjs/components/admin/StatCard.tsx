import { ReactNode } from "react";

interface StatCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: ReactNode;
  iconBgColor: string;
}

const StatCard = ({
  title,
  value,
  subtitle,
  icon,
  iconBgColor,
}: StatCardProps) => {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
        </div>
        <div className={`${iconBgColor} rounded-full p-3`}>{icon}</div>
      </div>
      {subtitle && (
        <div className="mt-4 text-sm text-gray-600">{subtitle}</div>
      )}
    </div>
  );
};

export default StatCard;
