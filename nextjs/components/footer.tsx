import Link from "next/link";
import Image from "next/image";
import Container from "./container";

export default function Footer() {
  const firstNavigation = [
    { Esittelylennot: "/esittelylennot" },
    { Koulutus: "/koulutus" },
    { Jäsenyys: "/kerho/jasenyys" },
    { Kalusto: "/kalusto" },
    { Kotikenttä: "/kerho/kentta" },
  ];
  const secondNavigation = [
    { Yhteystiedot: "/yhteystiedot" },
    { Varauskalenteri: "/kalusto/varauskalenteri" },
    { Hinnasto: "/kerho/hinnasto" },
    { Tietosuojaseloste: "/files/salko_tietosuojaseloste.pdf" },
    {
      "DTO -poikkeamailmoitus":
        "https://docs.google.com/forms/d/e/1FAIpQLScSw5Un81PuQq_cmwmKXVFPFK2IPWo5Bs6uBrrfLUSqyDdIgQ/viewform?pli=1",
    },
  ];
  return (
    <div className="relative bg-sblued text-swhite">
      <Container>
        <div className="grid max-w-screen-xl grid-cols-1 gap-10 pt-10 mx-auto mt-5 border-t border-sred lg:grid-cols-5">
          <div className="lg:col-span-2">
            <div>
              {" "}
              <Link
                href="/"
                className="flex items-center justify-center space-x-2 text-2xl font-medium"
              >
                <Image
                  src="/images/SaLKon Logo_vaakunaversio.png"
                  alt="SaLKo"
                  width={120}
                  height={40}
                />
              </Link>
            </div>

            <div className="mt-4">
              Savonlinnan Lentokerho ry on 1962 perustettu yleisilmailun
              harrastustoimintaan ja koulutukseen keskittynyt ilmailuyhdistys.
              Kerhomme toiminta tukeutuu Savonlinnan Lentoasemalle, 15 km
              Savonlinnasta Enonkoskelle päin.
            </div>
          </div>

          <div>
            <div className="flex flex-wrap w-full -mt-2 -ml-3 lg:ml-0 uppercase">
              {firstNavigation.map((item, index) => {
                const [key, value] = Object.entries(item)[0];
                return (
                  <Link key={index} href={value} className="w-full px-4 py-2">
                    {key}
                  </Link>
                );
              })}
            </div>
            <div className="flex gap-4 mt-6">
              <a
                href="https://www.facebook.com/savonlinnanlentokerho"
                target="_blank"
                rel="noopener noreferrer"
                className="text-swhite hover:text-sbluel transition-colors"
                aria-label="Facebook"
              >
                <Facebook size={28} />
              </a>
              <a
                href="https://www.instagram.com/savonlinnanlentokerho/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-swhite hover:text-sbluel transition-colors"
                aria-label="Instagram"
              >
                <Instagram size={28} />
              </a>
              <a
                href="https://youtube.com/@savonlinnanlentokrho"
                target="_blank"
                rel="noopener noreferrer"
                className="text-swhite hover:text-sbluel transition-colors"
                aria-label="YouTube"
              >
                <Youtube size={28} />
              </a>
            </div>
          </div>

          <div>
            <div className="flex flex-wrap w-full -mt-2 -ml-3 lg:ml-0 uppercase">
              {secondNavigation.map((item, index) => {
                const [key, value] = Object.entries(item)[0];
                const isPDF = value.endsWith(".pdf");

                if (isPDF) {
                  return (
                    <a
                      key={index}
                      href={value}
                      className="w-full px-4 py-2"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {key}
                    </a>
                  );
                }

                return (
                  <Link key={index} href={value} className="w-full px-4 py-2">
                    {key}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        <div className="my-10 text-sm text-center">
          Copyright © {new Date().getFullYear()}. Savonlinnan Lentokerho ry.
        </div>
      </Container>
    </div>
  );
}

const Facebook = ({ size = 24 }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
  >
    <path d="M24 12.07C24 5.41 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.04V9.41c0-3.02 1.8-4.7 4.54-4.7 1.31 0 2.68.24 2.68.24v2.97h-1.5c-1.5 0-1.96.93-1.96 1.89v2.26h3.32l-.53 3.5h-2.8V24C19.62 23.1 24 18.1 24 12.07" />
  </svg>
);
const Instagram = ({ size = 24 }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
  >
    <path d="M16.98 0a6.9 6.9 0 0 1 5.08 1.98A6.94 6.94 0 0 1 24 7.02v9.96c0 2.08-.68 3.87-1.98 5.13A7.14 7.14 0 0 1 16.94 24H7.06a7.06 7.06 0 0 1-5.03-1.89A6.96 6.96 0 0 1 0 16.94V7.02C0 2.8 2.8 0 7.02 0h9.96zm.05 2.23H7.06c-1.45 0-2.7.43-3.53 1.25a4.82 4.82 0 0 0-1.3 3.54v9.92c0 1.5.43 2.7 1.3 3.58a5 5 0 0 0 3.53 1.25h9.88a5 5 0 0 0 3.53-1.25 4.73 4.73 0 0 0 1.4-3.54V7.02a5 5 0 0 0-1.3-3.49 4.82 4.82 0 0 0-3.54-1.3zM12 5.76c3.39 0 6.2 2.8 6.2 6.2a6.2 6.2 0 0 1-12.4 0 6.2 6.2 0 0 1 6.2-6.2zm0 2.22a3.99 3.99 0 0 0-3.97 3.97A3.99 3.99 0 0 0 12 15.92a3.99 3.99 0 0 0 3.97-3.97A3.99 3.99 0 0 0 12 7.98zm6.44-3.77a1.4 1.4 0 1 1 0 2.8 1.4 1.4 0 0 1 0-2.8z" />
  </svg>
);
const Youtube = ({ size = 24 }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
  >
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
  </svg>
);
