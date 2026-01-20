import "../styles/tailwind.css";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import { Finlandica } from "next/font/google";
import { auth } from "@/auth";
import { QueryProvider } from "@/providers/QueryProvider";
import { NavbarProvider } from "@/providers/NavbarContextProvider";
import { SessionProvider } from "@/providers/SessionProvider";
import { UmamiProvider } from "@/providers/UmamiProvider";

const finlandica = Finlandica({
  subsets: ["latin"],
  variable: "--font-finlandica",
  display: "swap",
});

export const metadata = {
  title: {
    default: "SaLKo - Savonlinnan Lentokerho ry",
    template: "%s | SaLKo",
  },
  description:
    "Savonlinnan Lentokerho ry (SaLKo) - Lentokoulutusta ja ilmailua Savonlinnassa vuodesta 1962.",
  keywords: [
    "Savonlinna",
    "SaLKo",
    "EFSA",
    "lentokerho",
    "ilmailukerho",
    "lentäminen",
    "ilmailu",
    "Cessna 172",
    "lentokoulutus",
    "ilmailuopetus",
    "lennonopetus",
    "Savonlinnan Lentokerho",
    "PPL koulutus",
    "yksityislentäjä",
  ],
  authors: [{ name: "Savonlinnan Lentokerho ry" }],
  creator: "Savonlinnan Lentokerho ry",
  publisher: "Savonlinnan Lentokerho ry",
  metadataBase: new URL("https://savonlinnanlentokerho.fi"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "fi_FI",
    siteName: "Savonlinnan Lentokerho",
    title: "SaLKo - Savonlinnan Lentokerho ry",
    description:
      "Savonlinnan Lentokerho ry (SaLKo) - Lentokoulutusta ja ilmailua Savonlinnassa vuodesta 1962.",
    images: [
      {
        url: "/images/SaLKon Logo_vaakunaversio.png",
        width: 800,
        height: 600,
        alt: "Savonlinnan Lentokerho logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "SaLKo - Savonlinnan Lentokerho ry",
    description: "Lentokoulutusta ja ilmailua Savonlinnassa vuodesta 1962.",
    images: ["/images/SaLKon Logo_vaakunaversio.png"],
  },
  icons: {
    icon: "/favicon.ico",
  },
  robots: {
    index: true,
    follow: true,
  },
};

const RootLayout = async ({ children }: React.PropsWithChildren) => {
  const session = await auth();

  return (
    <html lang="fi" className={`${finlandica.variable}`}>
      <head>
        <UmamiProvider />
      </head>
      <body>
        <SessionProvider session={session}>
          <QueryProvider>
            <NavbarProvider>
              <main className="max-w-screen min-h-screen flex flex-col overflow-x-hidden relative bg-background bg-sblued text-white font-finlandica">
                <AntdRegistry>
                  <Navbar />
                  {children}
                  <Footer />
                </AntdRegistry>
              </main>
            </NavbarProvider>
          </QueryProvider>
        </SessionProvider>
      </body>
    </html>
  );
};

export default RootLayout;
