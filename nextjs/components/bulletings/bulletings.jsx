import { fetchLatestFiveBulletings } from "@/utilities/bulletings";
import Bullet from "./bullet";

const Bulletings = async () => {
  const { status, result } = await fetchLatestFiveBulletings();

  return (
    <div className="w-full h-full flex flex-col gap-2 z-50">
      <span className="text-2xl text-center font-semibold uppercase text-white mx-4 my-6 pb-4 border-b border-sred">
        Kerho tiedotteet
      </span>
      {status === "success" ? (
        result.map((item, index) => <Bullet key={index} item={item} />)
      ) : (
        <span className="text-xl text-center font-semibold text-white">
          Ei tiedotteita
        </span>
      )}
    </div>
  );
};

export default Bulletings;
