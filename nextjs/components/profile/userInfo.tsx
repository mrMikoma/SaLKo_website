interface UserInfoProps {
  name: string;
  full_name: string;
  email: string;
  role: string;
  address?: string;
  city?: string;
  postalCode?: string;
  phone?: string;
}

const UserInfo = ({
  name,
  full_name,
  email,
  role,
  address,
  city,
  postalCode,
  phone,
}: UserInfoProps) => {
  return (
    <div className="user-info text-gray-900">
      <h2 className="text-lg font-bold mb-4">Omat tiedot</h2>
      <p className="text-sm mb-2">
        <strong>Nimi:</strong> {name}
      </p>
      <p className="text-sm mb-2">
        <strong>Koko nimi:</strong> {full_name}
      </p>
      <p className="text-sm mb-2">
        <strong>Sähköposti:</strong> {email}
      </p>
      <p className="text-sm mb-2">
        <strong>Rooli:</strong> {role}
      </p>
      <p className="text-sm mb-2">
        <strong>Osoite:</strong> {address || <span className="text-gray-500 italic">Ei asetettu</span>}
      </p>
      <p className="text-sm mb-2">
        <strong>Kaupunki:</strong> {city || <span className="text-gray-500 italic">Ei asetettu</span>}
      </p>
      <p className="text-sm mb-2">
        <strong>Postinumero:</strong> {postalCode || <span className="text-gray-500 italic">Ei asetettu</span>}
      </p>
      <p className="text-sm mb-2">
        <strong>Puhelin:</strong> {phone || <span className="text-gray-500 italic">Ei asetettu</span>}
      </p>
    </div>
  );
};

export default UserInfo;
