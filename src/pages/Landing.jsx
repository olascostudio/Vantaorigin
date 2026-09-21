import Hero from "../components/Hero";
import Realms from "../components/Realms";
import CommunityWorlds from "../components/CommunityWorlds";
import HowItWorks from "../components/HowItWorks";
import CharacterShowcase from "../components/CharacterShowcase";
import ShareLink from "../components/ShareLink";
import Features from "../components/Features";
import FinalCta from "../components/FinalCta";
import Footer from "../components/Footer";

// Order tells the product story: make a Realm, see what other creators' Realms
// look like, how it works, what a character profile holds, the one link, then
// the features and a closing call to action.
export default function Landing() {
  return (
    <>
      <Hero />
      <main>
        <Realms />
        <CommunityWorlds />
        <HowItWorks />
        <CharacterShowcase />
        <ShareLink />
        <Features />
        <FinalCta />
      </main>
      <Footer />
    </>
  );
}
