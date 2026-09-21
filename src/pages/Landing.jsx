import Hero from "../components/Hero";
import Realms from "../components/Realms";
import CommunityWorlds from "../components/CommunityWorlds";
import HowItWorks from "../components/HowItWorks";
import Features from "../components/Features";
import CreateTogether from "../components/CreateTogether";
import Footer from "../components/Footer";

export default function Landing() {
  return (
    <>
      <Hero />
      <main>
        <Realms />
        <CommunityWorlds />
        <HowItWorks />
        <Features />
        <CreateTogether />
      </main>
      <Footer />
    </>
  );
}
