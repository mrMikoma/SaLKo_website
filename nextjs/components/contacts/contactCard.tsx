const PersonCard = ({ member, idx }: { member: any; idx: number }) => {
  return (
    <div className="flex flex-col w-[350px] sm:w-[450px] items-center p-6 bg-swhite rounded-xl shadow-lg text-sblack">
      <li key={idx} className="w-full max-w-md space-y-4">
        <p className="text-2xl text-center text-sblued font-semibold">
          {member.role}
        </p>
        <p className="text-xl font-semibold">{member.name}</p>

        <p className="text-lg font-semibold">
          <strong className="block text-sm text-sblued">Sähköposti:</strong>{" "}
          <a
            href={`mailto:${member.email}`}
            className="underline hover:text-gray-300"
          >
            {member.email}
          </a>
        </p>
        <p className="text-lg font-semibold">
          <strong className="block text-sm text-sblued">Puhelin:</strong>{" "}
          <a
            href={`tel:${member.phone}`}
            className="underline hover:text-gray-300"
          >
            {member.phone}
          </a>
        </p>
      </li>
    </div>
  );
};

export default PersonCard;
