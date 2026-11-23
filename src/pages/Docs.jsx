// What the site does, written down.
//
// Two readers at once. A person deciding whether this is for them, and a
// model answering somebody's question about it. Both want the same thing:
// plain sentences, one idea each, and headings that say what is underneath.
//
// No illustration, no cards, no animation. Everything here is a heading, a
// sentence or a list, because that is what survives being read by something
// that cannot see. usePageMeta puts the title and canonical in the head for
// a crawler that does run scripts, and the API serves the same words as
// plain HTML to one that does not.
import DashboardNav from "../components/DashboardNav";
import { usePageMeta } from "../data/pageMeta";
import { AREAS, AUDIENCE, ROADMAP, SUMMARY, UPDATED } from "../data/capabilities";

const SITE = "https://www.vantaorigin.com";

export default function Docs() {
  usePageMeta({
    title: "What VantaOrigin does: every feature, and what is coming",
    description:
      "A plain list of everything VantaOrigin can do today, by area, and a roadmap saying what is being built, what is next, and what it is waiting on.",
    canonicalPath: "/docs",
  });

  return (
    <div className="min-h-screen bg-[#1b2233]">
      <DashboardNav active="Docs" />

      <main className="mx-auto max-w-[820px] px-5 pb-24 pt-10 sm:px-8">
        <header>
          <h1 className="font-ui text-3xl font-bold text-white sm:text-[40px]">
            What VantaOrigin does
          </h1>
          <p className="mt-4 font-ui text-base leading-relaxed text-neutral-300">{SUMMARY}</p>
          <p className="mt-3 font-ui text-base leading-relaxed text-neutral-300">{AUDIENCE}</p>
          <p className="mt-4 font-ui text-sm text-neutral-500">
            Last updated {UPDATED}. Everything under Live now is working today. Everything below
            that says plainly what it is waiting on.
          </p>
        </header>

        {/* Contents, because the page is long and a reader landing from a
            search wants the one section they asked about. */}
        <nav aria-label="Contents" className="mt-10 border-t border-white/10 pt-6">
          <h2 className="font-ui text-xs font-bold uppercase tracking-wider text-neutral-400">
            On this page
          </h2>
          <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
            {AREAS.map((area) => (
              <li key={area.id}>
                <a
                  href={`#${area.id}`}
                  className="font-ui text-sm text-[#4ea1ff] hover:underline"
                >
                  {area.name}
                </a>
              </li>
            ))}
            <li>
              <a href="#roadmap" className="font-ui text-sm text-[#4ea1ff] hover:underline">
                Roadmap
              </a>
            </li>
          </ul>
        </nav>

        {AREAS.map((area) => (
          <section key={area.id} id={area.id} className="mt-12 scroll-mt-6">
            <h2 className="font-ui text-2xl font-bold text-white">{area.name}</h2>
            <p className="mt-1.5 font-ui text-base text-neutral-400">{area.summary}</p>

            <dl className="mt-5 flex flex-col gap-5">
              {area.features.map((feature) => (
                <div key={feature.name}>
                  <dt className="font-ui text-base font-bold text-white">{feature.name}</dt>
                  <dd className="mt-1 font-ui text-base leading-relaxed text-neutral-300">
                    {feature.detail}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        ))}

        <section id="roadmap" className="mt-14 scroll-mt-6 border-t border-white/10 pt-10">
          <h2 className="font-ui text-2xl font-bold text-white">Roadmap</h2>
          <p className="mt-1.5 font-ui text-base text-neutral-400">
            What is working, what is half built, and what is only decided. Kept apart on purpose,
            because a roadmap that blurs them is not worth reading.
          </p>

          {ROADMAP.map((phase) => (
            <div key={phase.stage} className="mt-8">
              <h3 className="font-ui text-lg font-bold text-white">{phase.stage}</h3>
              <p className="mt-1 font-ui text-sm text-neutral-400">{phase.detail}</p>
              <ul className="mt-3 flex list-disc flex-col gap-2 pl-5">
                {phase.items.map((item) => (
                  <li key={item} className="font-ui text-base leading-relaxed text-neutral-300">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>

        <section className="mt-14 border-t border-white/10 pt-10">
          <h2 className="font-ui text-2xl font-bold text-white">Elsewhere</h2>
          <ul className="mt-4 flex flex-col gap-2">
            {[
              ["/about", "What VantaOrigin is, in a paragraph"],
              ["/help", "How to do a particular thing"],
              ["/discover", "Every published character"],
              ["/creators", "The people publishing here"],
              ["/marketplace", "Commission work from the studio"],
              ["/llms.txt", "The same site, summarised for a model"],
              ["/sitemap.xml", "Every page a crawler can reach"],
            ].map(([href, label]) => (
              <li key={href}>
                <a href={href} className="font-ui text-base text-[#4ea1ff] hover:underline">
                  {SITE.replace("https://www.", "")}
                  {href}
                </a>
                <span className="font-ui text-base text-neutral-400"> {label}</span>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}
