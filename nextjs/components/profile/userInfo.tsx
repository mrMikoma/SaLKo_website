interface UserInfoProps {
  name: string;
  full_name: string;
  email: string;
  role: string;
  address: string;
  city: string;
  postalCode: string;
  phone: string;
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
    <div className="user-info">
      <h2 className="text-lg font-bold">Omat tiedot</h2>
      <p className="text-sm">
        <strong>Nimi:</strong> {name}
      </p>
      <p className="text-sm">
        <strong>Koko nimi:</strong> {full_name}
      </p>
      <p className="text-sm">
        <strong>Sähköposti:</strong> {email}
      </p>
      <p className="text-sm">
        <strong>Rooli:</strong> {role}
      </p>
      <p className="text-sm">
        <strong>Osoite:</strong> {address}
      </p>
      <p className="text-sm">
        <strong>Kaupunki:</strong> {city}
      </p>
      <p className="text-sm">
        <strong>Postinumero:</strong> {postalCode}
      </p>
      <p className="text-sm">
        <strong>Puhelin:</strong> {phone}
      </p>
    </div>
  );
};

export default UserInfo;
