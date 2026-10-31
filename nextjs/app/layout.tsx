import "../styles/tailwind.css";
import type { Metadata } from "next";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import { Finlandica_Headline } from "next/font/google";
import { auth } from "@/auth";
import { QueryProvider } from "@/providers/QueryProvider";
import { NavbarProvider } from "@/providers/NavbarContextProvider";
import { SessionProvider } from "@/providers/SessionProvider";
import { UmamiProvider } from "@/providers/UmamiProvider";
import { isBillingEnabled, isFlightLogEnabled, isPagesInReviewEnabled } from "@/utilities/features";
import { DEFAULT_SHARE_IMAGE, SITE_NAME, SITE_URL } from "@/utilities/seo";

const finlandica = Finlandica_Headline({
  subsets: ["latin"],
  variable: "--font-finlandica",
  display: "swap",
  fallback: ["Arial", "sans-serif"],
});

// Defaults for every page. Public pages set their own title, description,
// canonical and openGraph with pageMetadata() from utilities/seo.ts.
export const metadata: Metadata = {
  title: {
    default: "SaLKo - Savonlinnan Lentokerho ry",
    template: "%s | SaLKo",
  },
  description:
    "Savonlinnan Lentokerho ry (SaLKo) - Lentokoulutusta ja ilmailua Savonlinnassa vuodesta 1962.",
  authors: [{ name: "Savonlinnan Lentokerho ry" }],
  creator: "Savonlinnan Lentokerho ry",
  publisher: "Savonlinnan Lentokerho ry",
  metadataBase: new URL(SITE_URL),
  openGraph: {
    type: "website",
    locale: "fi_FI",
    siteName: SITE_NAME,
    title: "SaLKo - Savonlinnan Lentokerho ry",
    description:
      "Savonlinnan Lentokerho ry (SaLKo) - Lentokoulutusta ja ilmailua Savonlinnassa vuodesta 1962.",
    images: [DEFAULT_SHARE_IMAGE],
  },
  // Only the card type: Next fills in the rest from openGraph
  twitter: {
    card: "summary_large_image",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicons/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicons/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: { url: "/favicons/apple-touch-icon.png", sizes: "180x180" },
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
                  <Navbar
                    flightLog={isFlightLogEnabled()}
                    billing={isBillingEnabled()}
                    pagesInReview={isPagesInReviewEnabled()}
                  />
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
