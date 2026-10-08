import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import DashboardNav from "./DashboardNav";
import PageSkeleton from "./Loading.jsx";
import { amIAdmin } from "../data/admin";

// Signed in, and on the list.
//
// Who counts as an admin is the API's answer, not the browser's: every
// /admin route refuses anyone else regardless of what is rendered here. This
// exists so that somebody who is not an admin is told so instead of being
// shown a dashboard that cannot load, or an editor that cannot save.
//
// It says "page not found" rather than "not allowed", which is the same
// answer the API gives. Whether a page exists is itself worth not telling
// people, and the two should not disagree.
//
// Wrap it in RequireAuth: a visitor who is not signed in at all belongs at
// the sign-in screen, not at a dead end.
export default function RequireAdmin({ children }) {
  const [allowed, setAllowed] = useState(null); // null while we ask

  useEffect(() => {
    let cancelled = false;
    amIAdmin().then((yes) => {
      if (!cancelled) setAllowed(yes);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (allowed === null) {
    return (
      <div className="min-h-screen bg-[#1b2233]">
        <DashboardNav />
        <PageSkeleton />
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="min-h-screen bg-[#1b2233]">
        <DashboardNav />
        <div className="mx-auto max-w-[520px] px-6 py-24 text-center">
          <h1 className="font-ui text-3xl font-bold text-white">Page not found</h1>
          <p className="mt-4 font-ui text-lg text-neutral-300">
            This page does not exist, or is not yours to open.
          </p>
          <Link
            to="/creators-hub"
            className="mt-8 inline-block rounded-full bg-gradient-to-r from-[#c2185b] to-[#a855f7] px-8 py-3 font-ui text-base font-bold text-white hover:opacity-90"
          >
            Back to your hub
          </Link>
        </div>
      </div>
    );
  }

  return children;
}
