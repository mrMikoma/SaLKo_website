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
  title: "Yhteystiedot",
  description: "Savonlinnan Lentokerho ry:n yhteystiedot",
  keywords: [
    "Savonlinnan Lentokerho",
    "yhteystiedot",
    "hallitus",
    "lennonopettaja",
    "puheenjohtaja",
    "laskutus",
    "Savonlinna",
    "lentokerho",
    "puhelinnumero",
    "sähköpostiosoite",
    "laskutusosoite",
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

            {/* Social Media Links */}
            <div className="mt-6 pt-6 border-t border-swhite/10">
              <p className="text-sbluel font-semibold mb-3 text-sm md:text-base">
                Seuraa meitä somessa:
              </p>
              <div className="flex gap-4">
                <a
                  href="https://www.facebook.com/savonlinnanlentokerho"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-swhite hover:text-sbluel transition-colors"
                  aria-label="Facebook"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width={32}
                    height={32}
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M24 12.07C24 5.41 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.04V9.41c0-3.02 1.8-4.7 4.54-4.7 1.31 0 2.68.24 2.68.24v2.97h-1.5c-1.5 0-1.96.93-1.96 1.89v2.26h3.32l-.53 3.5h-2.8V24C19.62 23.1 24 18.1 24 12.07" />
                  </svg>
                </a>
                <a
                  href="https://www.instagram.com/savonlinnanlentokerho/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-swhite hover:text-sbluel transition-colors"
                  aria-label="Instagram"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width={32}
                    height={32}
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M16.98 0a6.9 6.9 0 0 1 5.08 1.98A6.94 6.94 0 0 1 24 7.02v9.96c0 2.08-.68 3.87-1.98 5.13A7.14 7.14 0 0 1 16.94 24H7.06a7.06 7.06 0 0 1-5.03-1.89A6.96 6.96 0 0 1 0 16.94V7.02C0 2.8 2.8 0 7.02 0h9.96zm.05 2.23H7.06c-1.45 0-2.7.43-3.53 1.25a4.82 4.82 0 0 0-1.3 3.54v9.92c0 1.5.43 2.7 1.3 3.58a5 5 0 0 0 3.53 1.25h9.88a5 5 0 0 0 3.53-1.25 4.73 4.73 0 0 0 1.4-3.54V7.02a5 5 0 0 0-1.3-3.49 4.82 4.82 0 0 0-3.54-1.3zM12 5.76c3.39 0 6.2 2.8 6.2 6.2a6.2 6.2 0 0 1-12.4 0 6.2 6.2 0 0 1 6.2-6.2zm0 2.22a3.99 3.99 0 0 0-3.97 3.97A3.99 3.99 0 0 0 12 15.92a3.99 3.99 0 0 0 3.97-3.97A3.99 3.99 0 0 0 12 7.98zm6.44-3.77a1.4 1.4 0 1 1 0 2.8 1.4 1.4 0 0 1 0-2.8z" />
                  </svg>
                </a>
                <a
                  href="https://youtube.com/@savonlinnanlentokrho"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-swhite hover:text-sbluel transition-colors"
                  aria-label="YouTube"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width={32}
                    height={32}
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                  </svg>
                </a>
              </div>
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
