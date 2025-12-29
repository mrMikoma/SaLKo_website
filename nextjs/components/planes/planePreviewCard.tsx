import Link from "next/link";
import Image from "next/image";

interface PlanePreviewCardProps {
  plane: {
    registeration: string;
    name: string;
    images?: Array<{
      src: string;
      alt: string;
    }>;
  };
  type: "motor" | "glider";
}

const PlanePreviewCard = ({ plane, type }: PlanePreviewCardProps) => {
  const typeLabel = type === "motor" ? "Moottorilentokone" : "Purjelentokone";
  const hasImage = plane.images && plane.images.length > 0;

  return (
    <Link
      href={`/kalusto/${plane.registeration}`}
      className="relative py-6 overflow-hidden rounded-lg border border-sbluel/30 hover:border-sred/50 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 group"
    >
      {/* Background Image or Fallback */}
      <div className="absolute inset-0">
        {hasImage ? (
          <>
            <Image
              src={plane.images[0].src}
              alt={plane.images[0].alt}
              fill
              className="object-cover group-hover:scale-105 transition-all duration-500"
            />
            <div className="absolute inset-0 bg-sblack/20"></div>
          </>
        ) : (
          <div className="absolute inset-0 bg-sblued/40"></div>
        )}
      </div>

      {/* Content */}
      <div className="relative p-6 space-y-3">
        <h3 className="text-2xl font-bold text-swhite">
          {plane.registeration}
        </h3>
        <p className="text-lg text-swhite/80 italic">{plane.name}</p>
        <div className="pt-2 border-t border-swhite/20">
          <p className="text-lg font-bold text-sred">{plane.registeration}</p>
        </div>
        <div className="flex items-center gap-2 text-sbluel font-semibold pt-2">
          <span>Lue lisää</span>
          <span className="group-hover:translate-x-1 transition-transform duration-300">
            →
          </span>
        </div>
      </div>
    </Link>
  );
};

export default PlanePreviewCard;
