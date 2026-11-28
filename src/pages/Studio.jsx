// Creator Studio: Distribution, as the three journeys through it.
//
// Reached only from the bottom of the admin, and admin only behind that
// link as well, because a door whose only protection is that nobody has
// been told about it is not protected. It is live in the sense that it
// works, not in the sense that it is open: no creator is pointed here yet.
//
// Laid out as flows rather than as parts, because a list of parts does not
// tell you whether somebody can get from one end to the other. Three people
// use this: a creator with a book, a printer with a press, and whoever runs
// the place. The buyer is the fourth and their whole journey is one screen.
//
// Drawing them out is what found the hole. A creator could make a book,
// price it and sign for it, and then had nowhere to go: nothing moved a
// book out of draft, so the only one on sale anywhere got there by hand in
// SQL. That step exists now, which is the difference between a list of
// working parts and a thing somebody can actually do.
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { usePrivatePage } from "../data/pageMeta";
import { Skeleton } from "../components/Loading.jsx";
import { loadDistributionRates } from "../data/admin";
import { createInvite, listInvites, revokeInvite } from "../data/invites";
import { createStudioInvite, listStudioInvites, revokeStudioInvite } from "../data/studio";
import { listBooks } from "../data/books";
import logoMark from "../assets/landing/hero/logo-mark.svg";

const CARD = "rounded-2xl border border-white/10 bg-[#222b3c] p-5 sm:p-6";
const FIELD =
  "w-full box-border min-h-[44px] rounded-xl border border-white/20 bg-[#1b2233] px-4 font-ui text-sm text-white outline-none placeholder:text-neutral-500 focus:border-[#a855f7]";
// The screens themselves, with a live link into each one where there is
// something to link to. This page used to describe the journeys instead,
// which was the wrong job for it: the written version belongs in the admin,
// under Flows, and what is wanted here is a way in.
//
// A screen that cannot be opened yet says what would make it openable,
// rather than being left out. "Place an order and follow the link" is a
// usable instruction; a missing card is not.
function Screens() {
  const [books, setBooks] = useState(null);

  useEffect(() => {
    let cancelled = false;
    listBooks()
      .then((data) => !cancelled && setBooks(data.books ?? []))
      .catch(() => !cancelled && setBooks([]));
    return () => {
      cancelled = true;
    };
  }, []);

  const first = books?.[0];
  const onSale = books?.find((book) => book.status === "on_sale");

  const screens = [
    {
      name: "Your books",
      line: "Where a creator lands, and where a work is added. Open to you because an admin is in the studio by default.",
      to: "/studio/books",
    },
    {
      name: "One work",
      line: first
        ? `What it costs, what you keep at any price, the rights warranty, and the button that puts it on sale. Opens "${first.title}".`
        : "What it costs, what you keep at any price, the rights warranty, and the button that puts it on sale.",
      to: first ? `/studio/books/${first.publicId}` : null,
      blocked: "Add a work in Your books first, and this opens it.",
    },
    {
      name: "What a reader sees",
      line: "The page behind a shared link: a country, how many, an address. No account, and nothing is charged.",
      to: onSale ? `/book/${onSale.publicId}` : null,
      blocked: "Put a work on sale first. A draft has no reader page.",
    },
    {
      name: "The printer portal",
      line: "What a print shop signs in to. Expect it empty: nothing puts a shop on an order yet, so no job can reach one.",
      to: "/print",
    },
    {
      name: "An order",
      line: "Opened by a token in the address rather than by signing in, so the only way in is the link a buyer is handed after ordering.",
      to: null,
      blocked: "Order from a reader page, then follow the link it gives you.",
    },
    {
      name: "The two invitations",
      line: "A creator's and a printer's. Make one below, then open the link yourself to see exactly what they are sent.",
      to: null,
      blocked: "Made further down this page.",
    },
  ];

  return (
    <ul className="mt-8 grid gap-3 sm:grid-cols-2">
      {screens.map((screen) => (
        <li key={screen.name} className={`${CARD} flex flex-col`}>
          <h2 className="font-ui text-base font-bold text-white">{screen.name}</h2>
          <p className="mt-1.5 flex-1 font-ui text-sm leading-relaxed text-neutral-400">
            {screen.line}
          </p>
          {screen.to ? (
            <Link
              to={screen.to}
              className="mt-4 inline-flex min-h-[44px] w-fit items-center rounded-full bg-[#a855f7] px-5 font-ui text-sm font-bold text-white hover:opacity-90"
            >
              Open it
            </Link>
          ) : (
            <p className="mt-4 font-ui text-sm text-neutral-500">{screen.blocked}</p>
          )}
        </li>
      ))}
    </ul>
  );
}

// Letting a creator in. Same shape as the printer invite below it, and a
// separate thing: a printer accepts an agreement, a creator gets early
// access to a feature, and folding them together would be one control with
// two meanings.
function Creators() {
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [invites, setInvites] = useState([]);
  const [made, setMade] = useState(null);
  const [copied, setCopied] = useState(false);
  const [problem, setProblem] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = () =>
    listStudioInvites()
      .then((data) => setInvites(data.invites))
      .catch(() => setInvites([]));

  useEffect(() => {
    refresh();
  }, []);

  const send = async (event) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setProblem("");
    setCopied(false);
    try {
      const invite = await createStudioInvite(email, note);
      // Readable exactly once: only a hash is kept.
      setMade({ ...invite, link: `${window.location.origin}/studio/invite/${invite.token}` });
      setEmail("");
      setNote("");
      await refresh();
    } catch (error) {
      setProblem(error.message || "That did not send.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <form onSubmit={send} className="flex flex-wrap items-end gap-3">
        <div className="min-w-0 flex-[2_1_200px]">
          <label className="mb-1.5 block font-ui text-sm font-bold text-white" htmlFor="creator-email">
            Their email
          </label>
          <input
            id="creator-email"
            className={FIELD}
            type="email"
            required
            placeholder="them@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>
        <div className="min-w-0 flex-[2_1_180px]">
          <label className="mb-1.5 block font-ui text-sm font-bold text-white" htmlFor="creator-note">
            A note, for you
          </label>
          <input
            id="creator-note"
            className={FIELD}
            placeholder="Which comic, which conversation"
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
        </div>
        <button
          type="submit"
          disabled={busy}
          className="min-h-[44px] rounded-full bg-[#a855f7] px-6 font-ui text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {busy ? "Making it..." : "Make an invite link"}
        </button>
      </form>

      {made && (
        <div className="mt-5 rounded-xl border border-[#a855f7]/40 bg-[#2a2140] p-4">
          <p className="font-ui text-sm font-bold text-white">
            Send this to {made.email}. It is shown once.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <code className="min-w-0 flex-1 break-all rounded-lg bg-[#1b2233] px-3 py-2 font-mono text-xs text-[#9fd0ff]">
              {made.link}
            </code>
            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(made.link);
                  setCopied(true);
                } catch {
                  setCopied(false);
                }
              }}
              className="min-h-[40px] shrink-0 rounded-full bg-white px-5 font-ui text-sm font-bold text-black"
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>
      )}

      {invites.length > 0 && (
        <ul className="mt-6 flex flex-col gap-2">
          {invites.map((invite) => (
            <li
              key={invite.id}
              className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-3"
            >
              <span className="min-w-0 font-ui text-sm text-neutral-300">
                {invite.email}
                {invite.note && <span className="text-neutral-500"> ({invite.note})</span>}
                <span className="ml-2 text-neutral-500">{invite.state}</span>
              </span>
              {invite.state === "waiting" && (
                <button
                  type="button"
                  onClick={() => revokeStudioInvite(invite.id).then(refresh).catch(() => {})}
                  className="font-ui text-sm font-bold text-[#ffb4c4] hover:underline"
                >
                  Withdraw
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {problem && (
        <p role="alert" className="mt-4 font-ui text-sm text-[#ffb4c4]">
          {problem}
        </p>
      )}
    </>
  );
}

function Printers() {
  const [printers, setPrinters] = useState(null);
  const [chosen, setChosen] = useState("");
  const [email, setEmail] = useState("");
  const [invites, setInvites] = useState([]);
  const [made, setMade] = useState(null);
  const [problem, setProblem] = useState("");
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    loadDistributionRates()
      .then((data) => {
        setPrinters(data.printers);
        setChosen(data.printers[0]?.id ?? "");
      })
      .catch((error) => setProblem(error.message || "We could not load the printers."));
  }, []);

  useEffect(() => {
    if (!chosen) return;
    setMade(null);
    listInvites(chosen)
      .then((data) => setInvites(data.invites))
      .catch(() => setInvites([]));
  }, [chosen]);

  const send = async (event) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setProblem("");
    setCopied(false);
    try {
      const invite = await createInvite(chosen, email);
      // The link exists in a readable form exactly once, here. We store only
      // a hash of it, so if this is lost the invite is withdrawn and another
      // sent rather than recovered.
      setMade({ ...invite, link: `${window.location.origin}/print/invite/${invite.token}` });
      setEmail("");
      setInvites(await listInvites(chosen).then((d) => d.invites));
    } catch (error) {
      setProblem(error.message || "That did not send.");
    } finally {
      setBusy(false);
    }
  };

  const withdraw = async (id) => {
    try {
      await revokeInvite(id);
      setInvites(await listInvites(chosen).then((d) => d.invites));
    } catch (error) {
      setProblem(error.message || "That could not be withdrawn.");
    }
  };

  if (printers === null) return <Skeleton className="h-40 w-full rounded-2xl" />;

  if (!printers.length) {
    return (
      <p className="font-ui text-sm text-neutral-400">
        No printers yet. Add one under Costs and rates first, then invite them from here.
      </p>
    );
  }

  return (
    <>
      <form onSubmit={send} className="flex flex-wrap items-end gap-3">
        <div className="min-w-0 flex-[2_1_180px]">
          <label className="mb-1.5 block font-ui text-sm font-bold text-white" htmlFor="printer">
            Printer
          </label>
          <select
            id="printer"
            className={FIELD}
            value={chosen}
            onChange={(event) => setChosen(event.target.value)}
          >
            {printers.map((printer) => (
              <option key={printer.id} value={printer.id}>
                {printer.name}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-0 flex-[2_1_200px]">
          <label className="mb-1.5 block font-ui text-sm font-bold text-white" htmlFor="email">
            Their email
          </label>
          <input
            id="email"
            className={FIELD}
            type="email"
            required
            placeholder="print@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>
        <button
          type="submit"
          disabled={busy || !chosen}
          className="min-h-[44px] rounded-full bg-[#a855f7] px-6 font-ui text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {busy ? "Making it..." : "Make an invite link"}
        </button>
      </form>

      {made && (
        <div className="mt-5 rounded-xl border border-[#a855f7]/40 bg-[#2a2140] p-4">
          <p className="font-ui text-sm font-bold text-white">
            Send this to {made.email}. It is shown once.
          </p>
          <p className="mt-1 font-ui text-xs text-neutral-400">
            We keep only a hash of it, so if it is lost you withdraw this one and make another.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <code className="min-w-0 flex-1 break-all rounded-lg bg-[#1b2233] px-3 py-2 font-mono text-xs text-[#9fd0ff]">
              {made.link}
            </code>
            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(made.link);
                  setCopied(true);
                } catch {
                  setCopied(false);
                }
              }}
              className="min-h-[40px] shrink-0 rounded-full bg-white px-5 font-ui text-sm font-bold text-black"
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>
      )}

      {invites.length > 0 && (
        <ul className="mt-6 flex flex-col gap-2">
          {invites.map((invite) => (
            <li
              key={invite.id}
              className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-3"
            >
              <span className="min-w-0 font-ui text-sm text-neutral-300">
                {invite.email}
                <span className="ml-2 text-neutral-500">{invite.state}</span>
              </span>
              {invite.state === "waiting" && (
                <button
                  type="button"
                  onClick={() => withdraw(invite.id)}
                  className="font-ui text-sm font-bold text-[#ffb4c4] hover:underline"
                >
                  Withdraw
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {problem && (
        <p role="alert" className="mt-4 font-ui text-sm text-[#ffb4c4]">
          {problem}
        </p>
      )}
    </>
  );
}


export default function Studio() {
  usePrivatePage();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-white/10 px-5 py-4 sm:px-8">
        <Link to="/admin" className="flex items-center gap-2.5">
          <img src={logoMark} alt="" className="h-7 w-auto" aria-hidden="true" />
          <span className="font-ui text-base font-bold text-white">
            VantaOrigin <span className="text-neutral-400">Creator Studio</span>
          </span>
        </Link>
      </header>

      <main className="mx-auto max-w-[820px] px-5 pb-24 pt-10 sm:px-8">
        <h1 className="font-ui text-3xl font-bold text-white sm:text-[40px]">Creator Studio</h1>
        <p className="mt-3 font-ui text-base leading-relaxed text-neutral-300">
          Every screen in Distribution, and a way into each one. Working, and not open: nothing a
          creator can reach points here yet. The written version of who does what, and which of
          those steps exist, is in the admin under Flows.
        </p>

        <Screens />

        <section className={`${CARD} mt-6`} aria-label="Invite a creator">
          <h2 className="font-ui text-xl font-bold text-white">Invite a creator</h2>
          <p className="mt-1.5 font-ui text-sm leading-relaxed text-neutral-400">
            Creator Studio is not open, so this link is the only way in. It lasts 30 days and
            works once. Open one yourself to see what a creator is sent.
          </p>
          <div className="mt-5">
            <Creators />
          </div>
        </section>

        <section className={`${CARD} mt-6`} aria-label="Invite a printer">
          <h2 className="font-ui text-xl font-bold text-white">Invite a print partner</h2>
          <p className="mt-1.5 font-ui text-sm leading-relaxed text-neutral-400">
            The only way a printer account is made: one made the ordinary way is not one. The
            link lasts 14 days and works once.
          </p>
          <div className="mt-5">
            <Printers />
          </div>
        </section>

        <Link
          to="/admin"
          className="mt-10 inline-block font-ui text-sm text-neutral-400 hover:text-white"
        >
          Back to the admin
        </Link>
      </main>
    </div>
  );
}
