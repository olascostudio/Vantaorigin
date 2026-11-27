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
import logoMark from "../assets/landing/hero/logo-mark.svg";

const CARD = "rounded-2xl border border-white/10 bg-[#222b3c] p-5 sm:p-6";
const FIELD =
  "w-full box-border min-h-[44px] rounded-xl border border-white/20 bg-[#1b2233] px-4 font-ui text-sm text-white outline-none placeholder:text-neutral-500 focus:border-[#a855f7]";

// The three journeys. Each step says what happens, and links to the screen
// where it happens when there is one. A step with no screen says so rather
// than being left out, because a flow with a gap in it is the thing worth
// seeing.
const FLOWS = [
  {
    id: "creator",
    who: "A creator",
    line: "Somebody with a book who wants printed copies of it sold.",
    tint: "#a855f7",
    steps: [
      {
        does: "Opens Creator Studio from their hub",
        note: "Not wired up, on purpose: Distribution is not open, so nothing a creator can reach points here. When it opens this becomes a tab in the hub.",
        missing: true,
      },
      {
        does: "Makes a book",
        note: "A title, a format and a page count. The page count has to suit the format: a comic stops at 64 pages, a saddle stitched book folds in fours.",
        to: "/studio/books",
        label: "Your books",
      },
      {
        does: "Sees what it would earn",
        note: "Printing, delivery, the card fee, our cut and what is left, worked out by the engine the checkout uses. Type a price and it answers as you type.",
      },
      {
        does: "Sets a price",
        note: "Refused below the floor, and refused above it where a fee steps up and still leaves them short. The refusal names the floor.",
      },
      {
        does: "Signs the rights warranty",
        note: "That the work is theirs to sell. Recorded with the version agreed to, so a change of wording asks again.",
      },
      {
        does: "Puts it on sale",
        note: "Both conditions checked again, because a printer quote can move after a price is set.",
      },
      {
        does: "Copies the link and shares it",
        note: "The page where a reader buys a printed copy. This is the thing that goes in a post.",
      },
      {
        does: "Gets paid",
        note: "Waiting on payouts, which wait on payment. Their share is already written to the ledger the moment an order is placed.",
        missing: true,
      },
    ],
  },
  {
    id: "printer",
    who: "A print partner",
    line: "A shop we invited. There is no other way to become one.",
    tint: "#f5af32",
    steps: [
      {
        does: "Gets an invitation from us",
        note: "One link, to one shop, lasting 14 days and working once. Made below on this page.",
      },
      {
        does: "Reads the agreement",
        note: "The whole thing on the page, not a link to a document. The signup form does not appear until it is opened.",
      },
      {
        does: "Makes an account",
        note: "Attached to their shop, with the version of the agreement they accepted. An account made the ordinary way is not a printer account.",
      },
      {
        does: "Sees the job queue",
        note: "What to print, where it goes, one button. No money on it: they are paid their quoted cost, and what the book sold for is not their business.",
        to: "/print",
        label: "The portal",
      },
      {
        does: "Prints it and ships it",
        note: "A shipped job needs a tracking number, or the buyer has nothing to follow.",
      },
      {
        does: "Gets paid",
        note: "After the 48 hour inspection window. Waiting on payouts.",
        missing: true,
      },
    ],
  },
  {
    id: "admin",
    who: "You",
    line: "Whoever runs the place. Everything here is admin only.",
    tint: "#4ea1ff",
    steps: [
      {
        does: "Adds a printer and types in their quote",
        note: "Per copy, per format, in bands at one and five, plus packaging. Every price on the site is worked out from these.",
        to: "/admin",
        label: "Costs and rates, in the admin",
      },
      {
        does: "Adds a courier's delivery rates",
        note: "Per parcel plus each extra copy, which is why five copies cost less than five singles.",
      },
      {
        does: "Marks a quote real rather than a guess",
        note: "The flag that lets a book be sold. While any cost under a book is a placeholder it stays off sale however good its price is.",
      },
      {
        does: "Opens a country for selling",
        note: "Countries ship closed, so nobody prices into somewhere we cannot deliver to. One cannot be opened until it has a delivery rate, and closing one is always allowed in case we need to stop in a hurry.",
      },
      {
        does: "Invites a print partner",
        note: "Below on this page. The link is shown once and kept only as a hash.",
      },
      {
        does: "Sets the platform fee",
        note: "The one number here that is ours rather than somebody else's.",
      },
      {
        does: "Assigns an order to a printer",
        note: "Nothing does this yet. An order arrives with no shop attached, and a printer only sees jobs that name them.",
        missing: true,
      },
      {
        does: "Handles a defect claim and pays everybody",
        note: "The tables are there, the screens are not.",
        missing: true,
      },
    ],
  },
];

const BUYER = {
  who: "A reader",
  line: "The fourth journey, and the shortest: one screen, no account.",
  steps:
    "Opens a link somebody shared, picks a country and how many, types an address, and gets a link to follow the order afterwards. Nothing is charged: every order waits at pending payment until there is a payment provider.",
};

function Step({ step, tint, index, last }) {
  return (
    <li className="relative flex gap-4 pb-6 last:pb-0">
      {/* The line down the side, so a sequence reads as one thing. */}
      {!last && (
        <span
          aria-hidden="true"
          className="absolute left-[11px] top-7 h-[calc(100%-1.75rem)] w-px bg-white/15"
        />
      )}
      <span
        className="relative z-10 flex size-6 shrink-0 items-center justify-center rounded-full font-ui text-[11px] font-bold"
        style={
          step.missing
            ? { background: "#2b3547", color: "#8893a8" }
            : { background: tint, color: "#10121a" }
        }
      >
        {index + 1}
      </span>
      <div className="min-w-0 flex-1">
        <p
          className={`font-ui text-base font-bold ${
            step.missing ? "text-neutral-400" : "text-white"
          }`}
        >
          {step.does}
          {step.missing && (
            <span className="ml-2 rounded-full bg-[#3a3320] px-2 py-0.5 font-ui text-[11px] text-[#f5af32]">
              not yet
            </span>
          )}
        </p>
        <p className="mt-1 font-ui text-sm leading-relaxed text-neutral-400">{step.note}</p>
        {step.to && (
          <Link
            to={step.to}
            className="mt-1.5 inline-block font-ui text-sm font-bold text-[#4ea1ff] hover:underline"
          >
            {step.label}
          </Link>
        )}
      </div>
    </li>
  );
}

function Flow({ flow }) {
  const missing = flow.steps.filter((step) => step.missing).length;

  return (
    <section className={CARD} aria-label={`${flow.who}: the flow`}>
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="font-ui text-xl font-bold text-white">{flow.who}</h2>
        <span className="font-ui text-sm text-neutral-500">
          {flow.steps.length - missing} of {flow.steps.length} working
        </span>
      </div>
      <p className="mt-1.5 font-ui text-sm text-neutral-400">{flow.line}</p>

      <ol className="mt-6">
        {flow.steps.map((step, index) => (
          <Step
            key={step.does}
            step={step}
            tint={flow.tint}
            index={index}
            last={index === flow.steps.length - 1}
          />
        ))}
      </ol>
    </section>
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
          Selling printed copies of a creator's book. Three people use it, and this is each of
          their journeys through it, step by step, with anything that does not exist yet marked
          as such. Working, and not open: nothing a creator can reach points here, and no book
          can go on sale until a real printer has quoted us.
        </p>

        <div className="mt-8 flex flex-col gap-6">
          {FLOWS.map((flow) => (
            <Flow key={flow.id} flow={flow} />
          ))}

          {/* The buyer, who gets a paragraph rather than a flow: their whole
              journey is one screen, and it is the only one of the four a
              stranger ever sees. */}
          <section className={CARD} aria-label="A reader: the flow">
            <h2 className="font-ui text-xl font-bold text-white">{BUYER.who}</h2>
            <p className="mt-1.5 font-ui text-sm text-neutral-400">{BUYER.line}</p>
            <p className="mt-4 font-ui text-base leading-relaxed text-neutral-300">
              {BUYER.steps}
            </p>
          </section>
        </div>

        <section className={`${CARD} mt-6`} aria-label="Invite a creator">
          <h2 className="font-ui text-xl font-bold text-white">Invite a creator</h2>
          <p className="mt-1.5 font-ui text-sm leading-relaxed text-neutral-400">
            Step one of the creator flow above. Creator Studio is not open, so this link is the
            only way in. It lasts 30 days and works once.
          </p>
          <div className="mt-5">
            <Creators />
          </div>
        </section>

        <section className={`${CARD} mt-6`} aria-label="Invite a printer">
          <h2 className="font-ui text-xl font-bold text-white">Invite a print partner</h2>
          <p className="mt-1.5 font-ui text-sm leading-relaxed text-neutral-400">
            Step one of the printer's flow above, and the only way a printer account is made. The
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
