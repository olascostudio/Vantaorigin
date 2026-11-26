// Creator Studio: Distribution, as far as it has been built.
//
// Reached only from the bottom of the admin, and admin only behind that
// link as well, because a door whose only protection is that nobody has
// been told about it is not protected. It is live in the sense that it
// works, not in the sense that it is open: no creator is pointed here yet.
//
// Two jobs. It says honestly which parts of Distribution exist, so there is
// one place to look rather than a commit log. And it carries the one tool
// that has nowhere else to live: inviting a print partner, which is the
// only way a printer account can be made.
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { usePrivatePage } from "../data/pageMeta";
import { Skeleton } from "../components/Loading.jsx";
import { loadDistributionRates } from "../data/admin";
import { createInvite, listInvites, revokeInvite } from "../data/invites";
import logoMark from "../assets/landing/hero/logo-mark.svg";

const CARD = "rounded-2xl border border-white/10 bg-[#222b3c] p-5 sm:p-6";
const FIELD =
  "w-full box-border min-h-[44px] rounded-xl border border-white/20 bg-[#1b2233] px-4 font-ui text-sm text-white outline-none placeholder:text-neutral-500 focus:border-[#a855f7]";

// What exists, said plainly. A roadmap that calls everything "in progress"
// tells nobody anything.
const PIECES = [
  {
    name: "The pricing engine",
    state: "working",
    detail:
      "Works out the lowest a book can sell for from real printing and delivery costs, solving for the gateway fee rather than adding it up. 41 tests.",
  },
  {
    name: "Costs and rates",
    state: "working",
    detail: "Where a printer's quote and a courier's rate get typed in. Everything else prices from these.",
    to: "/admin",
    linkLabel: "In the admin, under Selling books",
  },
  {
    name: "A creator's books",
    state: "working",
    detail:
      "Create a book, check it suits its format, see what it would earn, set a price that covers its costs, sign the rights warranty.",
    to: "/studio/books",
    linkLabel: "Open your books",
  },
  {
    name: "The checkout",
    state: "working",
    detail:
      "A reader orders a printed copy with no account, and follows it afterwards with a token in the link. Nothing is charged: it stops at pending payment.",
  },
  {
    name: "The printer's portal",
    state: "working",
    detail:
      "An invitation, the agreement, an account attached to a shop, and a job queue with the address and a way to mark it shipped.",
    to: "/print",
    linkLabel: "Open the portal",
  },
  {
    name: "Payment",
    state: "waiting",
    detail: "Waiting on a Paystack account. Every order sits at pending payment until there is one.",
  },
  {
    name: "Real costs",
    state: "waiting",
    detail:
      "Waiting on a printer's quote for one copy and five, in each format, and a courier's rates. Until those exist every cost is a placeholder and no book can go on sale, which is the rule working rather than failing.",
  },
];

function Piece({ piece }) {
  return (
    <div className="border-t border-white/10 py-5 first:border-t-0 first:pt-0">
      <div className="flex flex-wrap items-center gap-3">
        <h3 className="font-ui text-base font-bold text-white">{piece.name}</h3>
        <span
          className={`rounded-full px-2.5 py-0.5 font-ui text-xs font-bold ${
            piece.state === "working"
              ? "bg-[#1d4030] text-[#5fdc8a]"
              : "bg-[#3a3320] text-[#f5af32]"
          }`}
        >
          {piece.state === "working" ? "Working" : "Waiting"}
        </span>
      </div>
      <p className="mt-1.5 font-ui text-sm leading-relaxed text-neutral-300">{piece.detail}</p>
      {piece.to && (
        <Link
          to={piece.to}
          className="mt-2 inline-block font-ui text-sm font-bold text-[#4ea1ff] hover:underline"
        >
          {piece.linkLabel}
        </Link>
      )}
    </div>
  );
}

// Inviting a print partner. The only way a printer account comes into
// being, so it needs somewhere to be done from.
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
          Selling printed copies of a creator's book. Working, and not open: nothing here is
          pointed at from anywhere a creator can reach, and no book can go on sale until a real
          printer has quoted us.
        </p>

        <section className={`${CARD} mt-8`} aria-label="What exists">
          <h2 className="font-ui text-xl font-bold text-white">Where it is</h2>
          <div className="mt-5">
            {PIECES.map((piece) => (
              <Piece key={piece.name} piece={piece} />
            ))}
          </div>
        </section>

        <section className={`${CARD} mt-6`} aria-label="Invite a printer">
          <h2 className="font-ui text-xl font-bold text-white">Invite a print partner</h2>
          <p className="mt-1.5 font-ui text-sm leading-relaxed text-neutral-400">
            The only way a printer account is made. They open the link, read the agreement, and
            make an account attached to their shop. The link lasts 14 days.
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
