import { Link } from "react-router-dom";
import DashboardNav from "../components/DashboardNav";
import Reveal from "../components/Reveal";
import { HOW_IT_WORKS } from "../data/marketplace";
import { usePageMeta } from "../data/pageMeta";

export default function MarketplaceHowItWorks() {
  usePageMeta({
    title: "How commissioning works",
    description:
      "How a commission runs on VantaOrigin, from the first request through to the finished work.",
    canonicalPath: "/marketplace/how-it-works",
  });

  return (
    <div className="min-h-screen bg-[#1b2233]">
      <DashboardNav active="Marketplace" />

      <main className="mx-auto max-w-[1560px] px-6 py-12 lg:px-16 lg:py-20">
        <Link
          to="/marketplace"
          className="flex items-center gap-6 font-ui text-2xl font-bold text-white hover:opacity-80 sm:text-[32px]"
        >
          <svg viewBox="0 0 24 24" className="size-8" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M19 12H5M11 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          How it Works
        </Link>

        {/* A rail down the left, with a marker against each step.
            Six paragraphs in a column gave no sense of being partway
            through anything, which is the one thing a page called How it
            Works has to convey. The rail is drawn once for the whole list
            rather than per step, so there is no seam between them. */}
        <ol className="relative mt-10 flex flex-col gap-10 before:absolute before:bottom-6 before:left-[11px] before:top-6 before:w-px before:bg-white/15 before:content-['']">
          {HOW_IT_WORKS.map(({ step, title, body }, index) => (
            <Reveal as="li" key={step} delay={index * 70} className="relative pl-10">
              {/* The marker fills as the step arrives, so moving down the
                  page reads as progress through it. */}
              <span
                aria-hidden="true"
                className="absolute left-0 top-1.5 flex size-6 items-center justify-center rounded-full border border-white/25 bg-[#1b2233] font-ui text-xs font-bold text-white motion-safe:animate-grow"
                style={{ animationDelay: `${index * 70}ms` }}
              >
                {index + 1}
              </span>
              <h2 className="font-ui text-xl font-bold text-white sm:text-[26px]">
                {step}: {title}
              </h2>
              <p className="mt-2 max-w-[1280px] font-ui text-lg text-neutral-200 sm:text-[22px]">
                {body}
              </p>
            </Reveal>
          ))}
        </ol>
      </main>

    </div>
  );
}
