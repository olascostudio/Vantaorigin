import { Link } from "react-router-dom";
import DashboardNav from "../components/DashboardNav";
import Footer from "../components/Footer";

// Google Form: "Vantaorigin Studio Project Request Form".
// The /d/e/… link is the public one — the /d/…/edit link only works for editors.
const FORM_ID = "1FAIpQLSdN4f5EvDCK9es0eKr9h7oHmBXgeLKZ9yTpsdCEppzL6MdCSw";
const FORM_URL = `https://docs.google.com/forms/d/e/${FORM_ID}/viewform`;

export default function ProjectRequest() {
  return (
    <div className="min-h-screen bg-[#1b2233]">
      <DashboardNav active="Marketplace" />

      <main className="mx-auto max-w-[1100px] px-6 py-10 lg:py-14">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link
            to="/marketplace"
            className="flex items-center gap-4 font-ui text-2xl font-bold text-white hover:opacity-80 sm:text-[30px]"
          >
            <svg viewBox="0 0 24 24" className="size-8" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M19 12H5M11 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Project Request
          </Link>

          <a
            href={FORM_URL}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 font-ui text-base font-bold text-white hover:opacity-90"
          >
            Open in a new tab
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M14 3h7v7M21 3l-9 9M19 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
        </div>

        <p className="mt-4 max-w-[760px] font-ui text-lg text-neutral-300">
          Tell us what you’re building — your requirements, timeline and budget — and we’ll match
          you with a vetted creator from the VantaOrigin network.
        </p>

        <div className="mt-8 overflow-hidden rounded-2xl bg-white">
          <iframe
            src={`${FORM_URL}?embedded=true`}
            title="VantaOrigin Studio project request form"
            className="h-[1400px] w-full border-0"
            loading="lazy"
          >
            Loading the request form…
          </iframe>
        </div>

        <p className="mt-6 font-ui text-sm text-neutral-400">
          Trouble with the form above?{" "}
          <a href={FORM_URL} target="_blank" rel="noreferrer" className="text-[#4ea1ff] underline">
            Open it directly
          </a>
          .
        </p>
      </main>

      <Footer />
    </div>
  );
}
