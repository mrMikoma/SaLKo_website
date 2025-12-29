const PlaneInfo = (props: any) => {
  // Filter out specs with "-" or empty values
  const getValidSpecs = () => {
    const specEntries = Object.entries(props.specs);
    return specEntries.filter(
      ([_, value]) =>
        value &&
        typeof value === "string" &&
        value !== "-" &&
        value.trim() !== ""
    );
  };

  const validSpecs = getValidSpecs();

  // Map spec keys to Finnish labels
  const specLabels = {
    length: "Pituus",
    wingspan: "Kärkiväli",
    height: "Korkeus",
    wingArea: "Siipipinta-ala",
    aspectRatio: "Sivusuhde",
    emptyWeight: "Tyhjämassa",
    maxTakeoffWeight: "Maksimi lentoonlähtömassa",
    engine: "Moottori",
    maxSpeed: "Suurin sallittu nopeus",
    maxCruiseSpeed: "Suurin vaakalentonopeus",
    economyCruiseSpeed: "Matkanopeus 65% teholla",
    maxSpeedCalm: "Suurin nopeus tyyneessä",
    maxSpeedGusts: "Suurin nopeus puuskissa",
    maxManeuverSpeed: "Maksimi liikkumisnopeus",
    stallSpeed: "Sakkausnopeus",
    bestClimbRate: "Paras nousunopeus",
    bestGlideRatio: "Paras liitosuhde",
    minSinkRate: "Pienin vajoamisnopeus",
    serviceCeiling: "Lakikorkeus",
    maxRange: "Maksimi toimintamatka",
    gLimits: "G-rajat",
    ballastWeight: "Ballasti",
  };

  return (
    <div className="space-y-6">
      {/* Description */}
      <div className="glass rounded-lg p-6 md:p-8 border border-sred/20">
        <h2 className="text-2xl md:text-3xl font-bold text-sred mb-4">
          Kuvaus
        </h2>
        <div className="text-base md:text-lg text-swhite/90 leading-relaxed whitespace-pre-line">
          {props.description}
        </div>
      </div>

      {/* Technical Specifications */}
      {validSpecs.length > 0 && (
        <div className="glass rounded-lg p-6 md:p-8 border border-sred/20">
          <h2 className="text-2xl md:text-3xl font-bold text-sred mb-6">
            Tekniset tiedot
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {validSpecs.map(([key, value]) => (
              <div
                key={key}
                className="flex items-start gap-3 p-3 rounded-lg bg-sblack/20 border border-swhite/10"
              >
                <span className="text-sbluel text-lg flex-shrink-0">✈</span>
                <div className="flex-1">
                  <div className="text-swhite/70 text-sm">
                    {specLabels[key as keyof typeof specLabels] || key}
                  </div>
                  <div className="text-swhite font-semibold">
                    {String(value)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Links */}
      {props.links && props.links.length > 0 && (
        <div className="glass rounded-lg p-6 md:p-8 border border-sred/20">
          <h2 className="text-2xl md:text-3xl font-bold text-sred mb-6">
            Lisätietoa
          </h2>
          <div className="space-y-3">
            {props.links.map((link: any, index: number) => (
              <a
                key={index}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-4 rounded-lg bg-sblack/20 border border-swhite/10 hover:border-sbluel/50 hover:bg-sblack/30 transition-all duration-300 group"
              >
                <span className="text-sbluel text-xl flex-shrink-0 group-hover:translate-x-1 transition-transform duration-300">
                  →
                </span>
                <span className="text-swhite font-medium group-hover:text-sbluel transition-colors duration-300">
                  {link.text}
                </span>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PlaneInfo;
