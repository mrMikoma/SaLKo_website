import "../styles/tailwind.css";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import { Finlandica } from "next/font/google";
import { auth } from "@/auth";
import { QueryProvider } from "@/providers/QueryProvider";
import { NavbarProvider } from "@/providers/NavbarContextProvider";

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

  return (
    <html lang="fi" className={`${finlandica.variable}`}>
      <body>
        <QueryProvider>
          <NavbarProvider>
            <main className="max-w-screen min-h-screen flex flex-col overflow-x-hidden relative bg-background bg-sblued text-white font-finlandica">
              <AntdRegistry>
                <Navbar session={session} />
                {children}
                <Footer />
              </AntdRegistry>
            </main>
          </NavbarProvider>
        </QueryProvider>
      </body>
    </html>
  );
};

export default RootLayout;
