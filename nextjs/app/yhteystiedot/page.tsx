import ContactCardGrid from "@/components/contacts/contactCardGrid";
import contacts from "../../data/contacts.json";
import Image from "next/image";
import PageHero from "@/components/pageHero";
import ContentSection from "@/components/contentSection";

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
      <PageHero
        title="Yhteystiedot"
        breadcrumbs={["Yhteystiedot"]}
        backgroundImage="bg-efsa-one"
        showScrollIndicator={false}
        compact={true}
        children={
          <div className="glass max-w-5xl mx-4 md:mx-auto p-4 md:p-6 my-6 md:my-12 rounded-lg border border-sred/20">
            <div className="flex flex-col md:flex-row items-center md:items-center mb-6 gap-3 md:gap-6">
              <Image
                src="/images/SaLKon Logo_vaakunaversio.png"
                alt="SaLKo"
                width={80}
                height={26}
                className=""
              />
              <h2 className="text-lg md:text-2xl text-sbluel font-bold text-center md:text-left">
                {name}
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs md:text-base">
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
                    <td className="py-2 px-1 text-swhite break-all">{IBAN}</td>
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
        }
      />

      <ContentSection variant="dark" backgroundImage="bg-savonlinna-one">
        <div className="space-y-12">
          {/* Board Members */}
          <ContactCardGrid title="Hallitus 2025" board={board} />

          {/* Other Contacts */}
          <ContactCardGrid title="Muut yhteystiedot" board={other} />

          {/* Instructors */}
          <ContactCardGrid title="Lennonopettajat" board={instructors} />
        </div>
      </ContentSection>
    </div>
  );
}
