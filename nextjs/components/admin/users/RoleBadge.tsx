import { getRoleDisplayName } from "@/utilities/roles";

interface RoleBadgeProps {
  role: string;
}

const RoleBadge = ({ role }: RoleBadgeProps) => {
  const colorClass =
    role === "admin"
      ? "bg-purple-100 text-purple-800"
      : role === "user"
        ? "bg-green-100 text-green-800"
        : "bg-gray-100 text-gray-800";

  return (
    <span
      className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${colorClass}`}
    >
      {getRoleDisplayName(role)}
    </span>
  );
};

export default RoleBadge;
