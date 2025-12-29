import PersonCard from "./contactCard";

const PersonCardGrid = ({ title, board }: { title: string; board: any }) => {
  return (
    <div className="glass rounded-lg p-4 md:p-6 border border-sred/20 overflow-hidden">
      <h2 className="text-xl md:text-2xl font-bold text-sred mb-4">{title}</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm md:text-base">
          <thead>
            <tr className="border-b border-sbluel/30">
              <th className="text-left py-2 px-1 text-sbluel font-semibold">
                Tehtävä
              </th>
              <th className="text-left py-2 px-1 text-sbluel font-semibold">
                Nimi
              </th>
              <th className="text-left py-2 px-1 text-sbluel font-semibold">
                Sähköposti
              </th>
              <th className="text-left py-2 px-1 text-sbluel font-semibold">
                Puhelin
              </th>
            </tr>
          </thead>
          <tbody>
            {board.map((member: any, idx: number) => (
              <PersonCard key={idx} member={member} idx={idx} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PersonCardGrid;
