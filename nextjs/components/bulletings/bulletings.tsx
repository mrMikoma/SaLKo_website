import { fetchLatestFiveBulletings } from "@/utilities/bulletings";
import Bullet from "./bullet";

const Bulletings = async () => {
  const { status, result } = await fetchLatestFiveBulletings();

  return (
    <div className="flex flex-col h-full min-h-0">
      <h3 className="text-2xl text-center font-bold text-swhite mb-4 pb-3 border-b-2 border-sred flex-shrink-0">
        Kerhotiedotteet
      </h3>
      {status === "success" && result && result.length > 0 ? (
        <div className="flex-1 overflow-y-auto min-h-0 space-y-3 pr-1">
          {result.map((item) => (
            <Bullet key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <span className="text-lg font-medium text-swhite/70">
            Ei tiedotteita
          </span>
        </div>
      )}
    </div>
  );
};

export default Bulletings;
