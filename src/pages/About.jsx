import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";

// Plain language, short lines, one idea per paragraph: this page is read by
// creators, parents and partners alike, so it avoids inside language.
const CAN_DO = [
  "Create your own Realm",
  "Build and manage character profiles",
  "Showcase your creative work",
  "Share your Realm through one public link",
  "Discover other creators",
  "Get creative services through VantaOrigin Studios",
];

function Section({ title, children }) {
  return (
    <section className="mt-12">
      <h2 className="font-ui text-2xl font-bold text-white sm:text-[30px]">{title}</h2>
      <div className="mt-4 flex flex-col gap-4 font-ui text-lg leading-relaxed text-neutral-200 sm:text-xl">
        {children}
      </div>
    </section>
  );
}

export default function About() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="mx-auto max-w-[820px] px-6 pb-24 pt-12 sm:pt-16">
        <h1 className="font-ui text-[34px] font-bold leading-tight text-white sm:text-[46px]">
          About VantaOrigin
        </h1>

        <p className="mt-5 font-ui text-xl leading-relaxed text-neutral-200 sm:text-[22px]">
          VantaOrigin is a platform made by creators, for creators — and for the characters,
          stories and worlds they bring to life.
        </p>
        <p className="mt-4 font-ui text-lg leading-relaxed text-neutral-200 sm:text-xl">
          We believe a character’s identity is worth taking seriously. When people can find your
          characters and understand them, your work travels further.
        </p>

        <Section title="Why VantaOrigin exists">
          <p>
            Most creators have their work scattered: some on social media, some in a portfolio,
            the rest in folders nobody else ever sees.
          </p>
          <p>
            VantaOrigin gives you one place to bring it together — and one link to share it, so
            people can actually find it.
          </p>
        </Section>

        <Section title="What you can do here">
          <ul className="flex flex-col gap-3">
            {CAN_DO.map((item) => (
              <li key={item} className="flex gap-3">
                <span aria-hidden="true" className="text-[#ff8fc7]">
                  ✦
                </span>
                {item}
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Where we’re going">
          <p>
            We started with a simple idea: every creator deserves a home for the characters and
            work they care about.
          </p>
          <p>
            From there we’re building more ways for creators to find each other, share what they
            make, and get the creative help they need — step by step, with creators at the centre
            of it.
          </p>
        </Section>

        <div className="mt-14 flex flex-wrap gap-4">
          <Link
            to="/auth"
            className="rounded-full bg-gradient-to-r from-[#c2185b] to-[#a855f7] px-8 py-3.5 font-ui text-lg font-bold text-white transition-opacity hover:opacity-90"
          >
            Create Your Realm
          </Link>
          <Link
            to="/marketplace"
            className="rounded-full border-2 border-white px-8 py-3.5 font-ui text-lg font-bold text-white transition-colors hover:bg-white/10"
          >
            Visit VantaOrigin Studios
          </Link>
        </div>
      </main>
    </div>
  );
}
