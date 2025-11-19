import Link from "next/link";
import Image from "next/image";
import Container from "./container";

export default function Footer() {
  const firstNavigation = [
    { Kerho: "/kerho" },
    { Kalusto: "/kalusto" },
    { Koulutus: "/koulutus" },
    { Historiaa: "/kentta/historiaa" },
    { Hallit: "/kentta/hallit" },
    { Kenttä: "/kentta" },
  ];
  const secondNavigation = [
    { Jäsenyys: "/jasenyys" },
    { Yhteystiedot: "/yhteystiedot" },
    { Varauskalenteri: "/kalusto/varauskalenteri" },
    { Tietosuojaseloste: "/" },
    {
      "DTO-ilmoitus":
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
          </div>

          <div>
            <div className="flex flex-wrap w-full -mt-2 -ml-3 lg:ml-0 uppercase">
              {secondNavigation.map((item, index) => {
                const [key, value] = Object.entries(item)[0];
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
          Pictures by ...
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
    <path d="M23.5 5.5a2.5 2.5 0 0 0-2.5-2.5H3a2.5 2.5 0 0 0-2.5 2.5v13a2.5 2.5 0 0 0 2.5 2.5h18a2.5 2.5 0 0 0 2.5-2.5v-13zM9.5 15.5V8.5l6 3zm11-3.5v7a.5.5 0 0 1-.5.5H4a.5.5 0 0 1-.5-.5v-7a.5.5 0 0 1 .5-.5h16a.5.5 0 0 1 .5.5z" />
  </svg>
);
