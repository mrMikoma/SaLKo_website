const PlaneInfo = (props) => {
  return (
    <div className="w-full h-full flex flex-col gap-4 p-4 bg-gray-100 rounded shadow text-black">
      <h2 className="text-2xl font-bold">{props.name}</h2>
      <h3 className="text-xl italic">{props.identifier}</h3>
      <p className="text-base">{props.description}</p>

      <section className="mt-4">
        <h4 className="text-lg font-semibold">Tekniset tiedot:</h4>
        <ul className="list-disc list-inside space-y-1">
          <li>Pituus: {props.specs.length}</li>
          <li>Kärkiväli: {props.specs.wingspan}</li>
          <li>Korkeus: {props.specs.height}</li>
          <li>Siipipinta-ala: {props.specs.wingArea}</li>
          <li>Tyhjämassa: {props.specs.emptyWeight}</li>
          <li>Maksimi lentoonlähtömassa: {props.specs.maxTakeoffWeight}</li>
          <li>Moottori: {props.specs.engine}</li>
          <li>Suurin sallittu nopeus: {props.specs.maxSpeed}</li>
          <li>Suurin vaakalentonopeus: {props.specs.maxCruiseSpeed}</li>
          <li>Matkanopeus 65% teholla: {props.specs.economyCruiseSpeed}</li>
          <li>Sakkausnopeus: {props.specs.stallSpeed}</li>
          <li>Paras nousunopeus: {props.specs.bestClimbRate}</li>
          <li>Lakikorkeus: {props.specs.serviceCeiling}</li>
          <li>Maksimi toimintamatka: {props.specs.maxRange}</li>
        </ul>
      </section>

      <section className="mt-4">
        <h4 className="text-lg font-semibold">Linkkejä aiheesta:</h4>
        <ul className="list-disc list-inside space-y-1">
          {props.links.map((link, index) => (
            <li key={index}>
              <a
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                {link.text}
              </a>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
};

export default PlaneInfo;
