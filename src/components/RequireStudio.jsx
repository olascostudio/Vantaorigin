// Creator Studio is invitation only.
//
// An admin always has it. A creator has it because we sent them a link and
// they opened it. Everybody else gets the same "page not found" the admin
// gives, rather than a locked door, because a refusal tells somebody the
// thing is there and worth another try.
//
// The answer comes from the server. A flag in the browser would be a
// suggestion, and the API refuses the same way regardless, so this only
// decides what to draw.
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { amIInStudio } from "../data/studio";

export default function RequireStudio({ children }) {
  const [allowed, setAllowed] = useState(null);

  useEffect(() => {
    let cancelled = false;
    amIInStudio()
      .then((answer) => !cancelled && setAllowed(Boolean(answer.studio)))
      .catch(() => !cancelled && setAllowed(false));
    return () => {
      cancelled = true;
    };
  }, []);

  // Nothing while we do not know. Flashing the page and then taking it away
  // is worse than a moment of nothing, and flashing "not found" at somebody
  // who does have access is worse again.
  if (allowed === null) return <div className="min-h-screen bg-background" />;

  if (!allowed) {
    return (
      <div className="min-h-screen bg-background">
        <main className="mx-auto max-w-[560px] px-5 py-24 text-center">
          <h1 className="font-ui text-2xl font-bold text-white">Page not found</h1>
          <p className="mt-3 font-ui text-base leading-relaxed text-neutral-300">
            If you were sent a link to Creator Studio, open that link instead. If you are already
            signed in on another account, this may be the wrong one.
          </p>
          <Link to="/creators-hub" className="mt-6 inline-block font-ui text-base text-[#4ea1ff]">
            Back to your hub
          </Link>
        </main>
      </div>
    );
  }

  return children;
}
