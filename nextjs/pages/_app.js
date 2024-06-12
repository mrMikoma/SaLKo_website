import { ThemeProvider } from "next-themes";
import Footer from "../components/footer";
import "../css/tailwind.css";
import Navbar from "../components/navbar";
import Head from "next/head";

export const metadata = {
  title: "SaLKo",
  description: "This is a landing page for a Savonlinna flying club.",
  icons: [
    {
      href: "/favicon.ico",
      rel: "SaLKo",
    },
  ],
};

function MyApp({ Component, pageProps }) {
  return (
    <ThemeProvider attribute="class">
      <Head>
        <title>SaLKo</title>
        <meta name="description" content="This is a landing page for a Savonlinna flying club." />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Navbar />
      <Component {...pageProps} />
      <Footer />
    </ThemeProvider>
  );
}

export default MyApp;
