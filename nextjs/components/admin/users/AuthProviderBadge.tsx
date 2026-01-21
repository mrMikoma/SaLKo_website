interface AuthProviderBadgeProps {
  provider: string;
}

const AuthProviderBadge = ({ provider }: AuthProviderBadgeProps) => {
  const colorClass =
    provider === "google"
      ? "bg-blue-100 text-blue-800"
      : provider === "credentials"
        ? "bg-yellow-100 text-yellow-800"
        : "bg-gray-100 text-gray-800";

  const displayName =
    provider === "google"
      ? "Google"
      : provider === "credentials"
        ? "Salasana"
        : provider;

  return (
    <span
      className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${colorClass}`}
    >
      {displayName}
    </span>
  );
};

export default AuthProviderBadge;
