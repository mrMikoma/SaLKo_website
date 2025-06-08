import "../styles/tailwind.css";
import "@ant-design/v5-patch-for-react-19";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import { Finlandica } from "next/font/google";
import { verifySession } from "@/utilities/sessions";
import { SessionPayload } from "@/utilities/definitions";

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
    "lentokerho",
    "lentäminen",
    "ilmailu",
    "Cessna",
    "172",
  ],
  icons: {
    icon: "/favicon.ico",
  },
};

const RootLayout = async ({ children }: React.PropsWithChildren) => {
  const session = (await verifySession()) as SessionPayload | null;

  return (
    <html lang="fi" className={`${finlandica.variable}`}>
      <body>
        <main className="max-w-screen min-h-screen flex flex-col overflow-x-hidden relative bg-background bg-sblued text-white font-finlandica">
          <AntdRegistry>
            <Navbar payload={session} />
            {children}
            <Footer />
          </AntdRegistry>
        </main>
      </body>
    </html>
  );
};

export default RootLayout;
