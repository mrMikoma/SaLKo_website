import Image from "next/image";

export interface HistoryFigure {
  src: string;
  width: number;
  height: number;
  alt: string;
  caption: string;
}

// Portrait photos are kept narrow so one picture doesn't fill the screen
const PORTRAIT_MAX_WIDTH = 384;

// One photo, or two side by side, with their captions. Each photo links to the
// full-size file, so names in the captions can be checked against the faces.
const HistoryFigures = ({ figures }: { figures: HistoryFigure[] }) => {
  const pair = figures.length > 1;

  return (
    <div className={pair ? "grid gap-6 sm:grid-cols-2 items-start py-2" : "py-2"}>
      {figures.map((figure) => {
        const portrait = figure.height > figure.width;
        // Never stretch a small scan past its own size
        const maxWidth = Math.min(figure.width, portrait ? PORTRAIT_MAX_WIDTH : figure.width);
        const sizes = pair
          ? "(min-width: 768px) 372px, (min-width: 640px) 50vw, 100vw"
          : portrait
            ? `${PORTRAIT_MAX_WIDTH}px`
            : "(min-width: 768px) 768px, 100vw";

        return (
          <figure key={figure.src} className="mx-auto w-full" style={{ maxWidth }}>
            <a
              href={figure.src}
              target="_blank"
              rel="noopener noreferrer"
              title="Avaa kuva isompana"
              className="block rounded-lg overflow-hidden border border-sbluel/30 shadow-xl hover:border-swhite/60 transition-colors"
            >
              <Image
                src={figure.src}
                alt={figure.alt}
                width={figure.width}
                height={figure.height}
                sizes={sizes}
                className="w-full h-auto"
              />
            </a>
            <figcaption className="mt-2 text-sm text-swhite/70 leading-snug">
              {figure.caption}
            </figcaption>
          </figure>
        );
      })}
    </div>
  );
};

export default HistoryFigures;
