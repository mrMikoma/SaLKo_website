export default function Page() {
  return (
    <div className="min-h-screen flex flex-col w-full">
      <section className="relative w-full min-h-screen flex items-center justify-center bg-cover bg-center bg-olavinlinna-one">
        <div className="absolute inset-0 bg-gradient-to-b from-sblack/50 via-sblack/40 to-sblued/95"></div>
        <div className="relative z-10 w-full max-w-[1600px] mx-auto px-6 pt-32 pb-16 flex flex-col items-center justify-center">
          <div className="text-center space-y-6 animate-fade-in">
            <span className="text-sbluel text-sm md:text-base font-semibold tracking-wider uppercase">
              SaLKo
            </span>
            <h1 className="text-4xl md:text-5xl lg:text-7xl font-bold leading-tight text-swhite">
              Savonlinnan <br />
              <span className="text-sbluel">Lentokerho ry</span>
            </h1>
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-semibold text-sred">
              Jäsenyys
            </h2>
          </div>
        </div>
      </section>
    </div>
  );
}