import Head from "next/head";
import Navbar from "../components/navbar";
import SectionTitle from "../components/sectionTitle";
import Footer from "../components/footer";

const Home = () => {
  return (
    <>
      <Head>
        <title>SaLKo</title>
        <meta
          name="description"
          content="This is a landing page for a Savonlinna flying club."
        />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Navbar />
      <SectionTitle
        pretitle="SaLKo"
        title="Savonlinnan Lentokerho ry">
        Savonlinnan Lentokerho ry on 1962 perustettu yleisilmailun harrastustoimintaan ja koulutukseen keskittynyt ilmailuyhdistys. 
        Kerhomme toiminta tukeutuu Savonlinnan Lentoasemalle, 15 km Savonlinnasta Enonkoskelle päin. 
        Kerhossamme on noin 70 jäsentä, joista lentämistä harrastaa vajaa puolet.
      </SectionTitle>
      <Footer />
    </>
  );
}

export default Home;