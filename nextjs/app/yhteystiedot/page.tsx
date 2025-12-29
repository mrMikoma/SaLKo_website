import ContactCardGrid from "@/components/contacts/contactCardGrid";
import contacts from "../../data/contacts.json";
import Image from "next/image";

type genericContact = {
  name: string;
  email: string;
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
    "hallitus",
    "lennonopettajat",
    "puheenjohtaja",
    "laskutus",
    "Savonlinna",
    "lentokerho",
    "puhelinnumero",
    "sähköpostiosoite",
  ],
};

export default function Page() {
  const { name, address, city, postalCode, country, IBAN, BIC, bank } =
    contacts.general as genericContact;
  const board = contacts.board as Person[];
  const other = contacts.other as Person[];
  const instructors = contacts.instructors as Person[];

  return (
    <div className="min-h-screen flex flex-col w-full">
      <section className="relative w-full min-h-screen flex items-center justify-center bg-cover bg-center bg-efsa-one">
        <div className="absolute inset-0 bg-gradient-to-b from-sblack/50 via-sblack/40 to-sblued/95"></div>
        <div className="relative z-10 w-full max-w-[1600px] mx-auto px-6 pt-48 pb-16">
          <div className="text-center space-y-6 animate-fade-in mb-12">
            <h1 className="text-3xl md:text-4xl lg:text-6xl font-bold leading-tight text-swhite">
              Yhteystiedot
            </h1>
          </div>

          <div className="space-y-12">
            {/* General Contact Information */}
            <div className="glass rounded-lg p-4 md:p-6 border border-sred/20">
              <div className="flex flex-col items-center mb-4">
                <h2 className="text-xl md:text-2xl text-sbluel font-bold mb-3">
                  {name}
                </h2>
                <Image
                  src="/images/SaLKon Logo_vaakunaversio.png"
                  alt="SaLKo"
                  width={80}
                  height={26}
                  className="mb-3"
                />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm md:text-base">
                  <tbody>
                    <tr className="border-b border-swhite/10">
                      <td className="py-2 px-1 text-sbluel font-semibold align-top whitespace-nowrap w-[30%] max-w-[120px]">
                        Sähköposti:
                      </td>
                      <td className="py-2 px-1 text-swhite">
                        <a
                          href={`mailto:${contacts.general.email}`}
                          className="hover:text-sbluel underline transition-colors whitespace-nowrap"
                        >
                          {contacts.general.email}
                        </a>
                      </td>
                    </tr>
                    <tr className="border-b border-swhite/10">
                      <td className="py-2 px-1 text-sbluel font-semibold align-top whitespace-nowrap w-[30%] max-w-[120px]">
                        Postiosoite:
                      </td>
                      <td className="py-2 px-1 text-swhite">
                        {address}
                        <br />
                        {postalCode} {city}
                        <br />
                        {country}
                      </td>
                    </tr>
                    <tr className="border-b border-swhite/10">
                      <td className="py-2 px-1 text-sbluel font-semibold align-top whitespace-nowrap w-[30%] max-w-[120px]">
                        Y-tunnus:
                      </td>
                      <td className="py-2 px-1 text-swhite">
                        {contacts.general.buseinessId}
                      </td>
                    </tr>
                    <tr className="border-b border-swhite/10">
                      <td className="py-2 px-1 text-sbluel font-semibold align-top whitespace-nowrap w-[30%] max-w-[120px]">
                        Pankki:
                      </td>
                      <td className="py-2 px-1 text-swhite">{bank}</td>
                    </tr>
                    <tr className="border-b border-swhite/10">
                      <td className="py-2 px-1 text-sbluel font-semibold align-top whitespace-nowrap w-[30%] max-w-[120px]">
                        IBAN:
                      </td>
                      <td className="py-2 px-1 text-swhite break-all">
                        {IBAN}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 px-1 text-sbluel font-semibold align-top whitespace-nowrap w-[30%] max-w-[120px]">
                        SWIFT:
                      </td>
                      <td className="py-2 px-1 text-swhite">{BIC}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Board Members */}
            <ContactCardGrid title="Hallitus 2025" board={board} />

            {/* Other Contacts */}
            <ContactCardGrid title="Muut yhteystiedot" board={other} />

            {/* Instructors */}
            <ContactCardGrid title="Lennonopettajat" board={instructors} />
          </div>
        </div>
      </section>
    </div>
  );
}
