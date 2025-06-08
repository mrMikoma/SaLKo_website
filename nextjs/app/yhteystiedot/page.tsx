import ContactCardGrid from "@/components/contacts/contactCardGrid";
import contacts from "../../data/contacts.json";
import Image from "next/image";

type genericContact = {
  name: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
  buseinessId: string;
  IBAN: string;
  BIC: string;
  bank: string;
};

type Person = {
  name: string;
  role: string;
  email: string;
  phone: string;
};

export const metadata = {
  title: "Yhteystiedot | SaLKo",
  description: "Savonlinnan Lentokerho ry:n yhteystiedot",
  keywords: [
    "Savonlinnan Lentokerho",
    "yhteystiedot",
    "Savonlinna",
    "lentokerho",
  ],
};

export default function Page() {
  const { name, address, city, postalCode, country, IBAN, BIC, bank } =
    contacts.general as genericContact;
  const board = contacts.board as Person[];
  const other = contacts.other as Person[];
  const instructors = contacts.instructors as Person[];
  const towPilots = contacts.towPilots as Person[];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center w-screen bg-sblued">
      <section className="max-w-screen relative my-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 p-8 w-[350px] sm:w-5/6 mx-auto font-finlandica text-sblack bg-swhite rounded-xl shadow-lg">
          <div className="flex flex-col items-center">
            <h2 className="text-3xl md:text-4xl text-center text-sblued font-bold col-span-2">
              {name}
            </h2>
            <Image
              src="/images/SaLKon Logo_vaakunaversio.png"
              alt="SaLKo"
              width={120}
              height={40}
              className="my-auto my-8"
            />
          </div>
          <div>
            <div className="flex flex-col items-start text-xl">
              <p className="mt-4 text-sblued font-semibold">Postiosoite:</p>
              <p>{address}</p>
              <p>
                {postalCode} {city}
              </p>
              <p>{country}</p>
            </div>
            <div className="flex flex-col items-start text-xl">
              <p className="mt-4 text-sblued font-semibold">Laskutustiedot:</p>
              <p>Pankki: {bank}</p>
              <p>IBAN: {IBAN}</p>
              <p>SWIFT: {BIC}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-[1500px] w-4/6 relative">
        <div className="border border-t border-sred mt-4"></div>
      </section>

      <section className="max-w-screen relative">
        <ContactCardGrid title="Hallitus" board={board} />
      </section>

      <section className="max-w-[1500px] w-4/6 relative">
        <div className="border border-t border-sred mt-4"></div>
      </section>

      <section className="max-w-screen relative">
        <ContactCardGrid title="Muut yhteystiedot" board={other} />
      </section>

      <section className="max-w-[1500px] w-4/6 relative">
        <div className="border border-t border-sred mt-4"></div>
      </section>

      <section className="max-w-screen relative">
        <ContactCardGrid title="Lennonopettajat" board={instructors} />
      </section>

      <section className="max-w-[1500px] w-4/6 relative">
        <div className="border border-t border-sred mt-4"></div>
      </section>

      <section className="max-w-screen relative">
        <ContactCardGrid title="Hinauslentäjät" board={towPilots} />
      </section>
    </div>
  );
}
