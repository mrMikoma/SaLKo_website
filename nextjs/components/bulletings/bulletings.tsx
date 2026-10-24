import Link from "next/link";
import { Bulletin } from "@/utilities/bulletings";
import Bullet from "./bullet";

interface BulletingsProps {
  // Fetched once by the page, which shows this list in two places
  bulletins: Bulletin[];
}

const Bulletings = ({ bulletins }: BulletingsProps) => {
  return (
    <div className="flex flex-col h-full min-h-0">
      <h3 className="text-2xl text-center font-bold text-swhite mb-4 pb-3 border-b-2 border-sred flex-shrink-0">
        Kerhotiedotteet
      </h3>
      {bulletins.length > 0 ? (
        <div className="flex-1 overflow-y-auto min-h-0 space-y-3 pr-1">
          {bulletins.map((item) => (
            <Bullet key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center py-6">
          <span className="text-lg font-medium text-swhite/70">
            Ei tiedotteita
          </span>
        </div>
      )}
      <Link
        href="/tiedotteet"
        className="mt-4 self-end text-sm font-medium text-swhite/80 underline underline-offset-4 hover:text-swhite transition-colors"
      >
        Kaikki tiedotteet →
      </Link>
    </div>
  );
};

export default Bulletings;
