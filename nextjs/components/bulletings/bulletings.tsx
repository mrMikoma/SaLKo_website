import { fetchLatestFiveBulletings } from "@/utilities/bulletings";
import Bullet from "./bullet";

const Bulletings = async () => {
  const { status, result } = await fetchLatestFiveBulletings();

  return (
    <div className="w-full h-full flex flex-col z-50">
      <h3 className="text-2xl text-center font-bold text-swhite mb-6 pb-3 border-b-2 border-sred">
        Kerhotiedotteet
      </h3>
      {status === "success" ? (
        <div className="space-y-3">
          {result.map((item, index) => <Bullet key={index} item={item} />)}
        </div>
      ) : (
        <div className="text-center py-8">
          <span className="text-lg font-medium text-swhite/70">
            Ei tiedotteita
          </span>
        </div>
      )}
    </div>
  );
};

export default Bulletings;
