import "../css/tailwind.css";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";

export const metadata = {
  title: "SaLKo",
  description: "This is a landing page for a Savonlinna flying club.",
  keywords: ["Savonlinna", "lentokerho", "lentäminen", "ilmailu", "Cessna", "172"],
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="fi">
      <body>
        <main className="max-w-screen min-h-screen flex flex-col overflow-x-hidden relative bg-background text-white">
          <Navbar className="text-white"/>
          {children}
          <Footer />
        </main>
      </body>
    </html>
  );
}
