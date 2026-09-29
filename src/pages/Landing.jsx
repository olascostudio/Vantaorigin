import Hero from "../components/Hero";
import CreatorPages from "../components/CreatorPages";
import CommunityWorlds from "../components/CommunityWorlds";
import HowItWorks from "../components/HowItWorks";
import CharacterShowcase from "../components/CharacterShowcase";
import ShareLink from "../components/ShareLink";
import Features from "../components/Features";
import FinalCta from "../components/FinalCta";

// Order tells the product story: make a page, see what other creators' pages
// look like, how it works, what a character profile holds, the one link, then
// the features and a closing call to action.
export default function Landing() {
  return (
    <>
      <Hero />
      <main>
        <CreatorPages />
        <CommunityWorlds />
        <HowItWorks />
        <CharacterShowcase />
        <ShareLink />
        <Features />
        <FinalCta />
      </main>
    </>
  );
}
