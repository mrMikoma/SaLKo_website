interface StatCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
}

/** One number in a section's grid, a tile like the flight log's tasks */
const StatCard = ({ title, value, subtitle }: StatCardProps) => {
  return (
    <div className="h-full rounded-lg border border-gray-200 p-4">
      <p className="text-sm font-medium text-gray-600">{title}</p>
      <p className="mt-1 text-3xl font-bold text-gray-900">{value}</p>
      {subtitle && <p className="mt-1 text-sm text-gray-600">{subtitle}</p>}
    </div>
  );
};

export default StatCard;
