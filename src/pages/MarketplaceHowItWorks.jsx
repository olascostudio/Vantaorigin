import { Link } from "react-router-dom";
import DashboardNav from "../components/DashboardNav";
import Footer from "../components/Footer";
import { HOW_IT_WORKS } from "../data/marketplace";

export default function MarketplaceHowItWorks() {
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

        <ol className="mt-10 flex flex-col gap-10">
          {HOW_IT_WORKS.map(({ step, title, body }) => (
            <li key={step}>
              <h2 className="font-ui text-xl font-bold text-white sm:text-[26px]">
                {step} — {title}
              </h2>
              <p className="mt-2 max-w-[1280px] font-ui text-lg text-neutral-200 sm:text-[22px]">
                {body}
              </p>
            </li>
          ))}
        </ol>
      </main>

      <Footer />
    </div>
  );
}
