import "../styles/tailwind.css";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import { Finlandica } from "next/font/google";

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

export default function RootLayout({ children }) {
  return (
    <html lang="fi" className={`${finlandica.variable}`}>
      <body>
        <main className="max-w-screen min-h-screen flex flex-col overflow-x-hidden relative bg-background bg-sblued text-white font-finlandica">
          <Navbar className="text-white" />
          {children}
          <Footer />
        </main>
      </body>
    </html>
  );
}
