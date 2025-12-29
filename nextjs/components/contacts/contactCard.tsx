const ContactCard = ({ member, idx }: { member: any; idx: number }) => {
  return (
    <tr
      key={idx}
      className="border-b border-swhite/10 hover:bg-sblack/30 transition-colors"
    >
      <td className="py-2 px-1 text-swhite font-medium">
        {member.role}
      </td>
      <td className="py-2 px-1 text-swhite">
        {member.name}
      </td>
      <td className="py-2 px-1">
        {member.email ? (
          <a
            href={`mailto:${member.email}`}
            className="text-swhite hover:text-sbluel underline transition-colors whitespace-nowrap"
          >
            {member.email}
          </a>
        ) : (
          <span className="text-swhite/50">-</span>
        )}
      </td>
      <td className="py-2 px-1">
        {member.phone ? (
          <a
            href={`tel:${member.phone}`}
            className="text-swhite hover:text-sbluel underline transition-colors whitespace-nowrap"
          >
            {member.phone}
          </a>
        ) : (
          <span className="text-swhite/50">-</span>
        )}
      </td>
    </tr>
  );
};

export default ContactCard;
