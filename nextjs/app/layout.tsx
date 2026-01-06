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
  title: "SaLKo",
  description: "SaLKo - Savonlinnan Lentokerho ry",
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
  ],
  icons: {
    icon: "/favicon.ico",
  },
};

const RootLayout = async ({ children }: React.PropsWithChildren) => {
  const session = await auth();
  const isProduction =
    process.env.NODE_ENV === "production" &&
    process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID;

  return (
    <html lang="fi" className={`${finlandica.variable}`}>
      <body>
        <SessionProvider session={session}>
          <QueryProvider>
            <NavbarProvider>
              <main className="max-w-screen min-h-screen flex flex-col overflow-x-hidden relative bg-background bg-sblued text-white font-finlandica">
                <AntdRegistry>
                  <Navbar session={session} />
                  {children}
                  <Footer />
                </AntdRegistry>
              </main>
              <UmamiProvider />
            </NavbarProvider>
          </QueryProvider>
        </SessionProvider>
      </body>
    </html>
  );
};

export default RootLayout;
