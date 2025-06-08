import PersonCard from "./contactCard";

const PersonCardGrid = ({ title, board }: { title: string; board: any }) => {
  return (
    <div className="p-8 max-w-[1500px] mx-auto font-finlandica">
      <h2 className="text-4xl font-finlandica my-6">{title}</h2>
      <ul className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-4">
        {board.map((member, idx) => (
          <PersonCard key={idx} member={member} idx={idx} />
        ))}
      </ul>
    </div>
  );
};

export default PersonCardGrid;
