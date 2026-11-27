// The page at the end of a creator's invitation.
//
// Shorter than the printer's on purpose. A printer is agreeing to a working
// relationship about money and somebody's home address, so their invite is
// an agreement to read. A creator is being let into a feature early, and
// the one thing specific to selling a printed book, that the work is
// theirs, is signed per book where it belongs rather than once in the
// abstract here.
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { usePrivatePage } from "../data/pageMeta";
import { Skeleton } from "../components/Loading.jsx";
import { acceptStudioInvite, loadStudioInvite } from "../data/studio";
import logoMark from "../assets/landing/hero/logo-mark.svg";

const FIELD =
  "w-full box-border min-h-[48px] rounded-xl border border-white/20 bg-[#222b3c] px-4 py-3 font-ui text-base text-white outline-none placeholder:text-neutral-500 focus:border-[#a855f7] focus:ring-2 focus:ring-[#a855f7]/40";
const LABEL = "mb-1.5 block font-ui text-sm font-bold text-white";

const WHAT_YOU_GET = [
  "Add a book: a title, a format and a page count.",
  "See exactly what it costs to print and deliver, and what you would keep at any price.",
  "Set a price. We refuse anything that would lose you money, and tell you the lowest it can go.",
  "Get a link to share. Anybody who opens it can order a printed copy.",
];

export default function StudioInvite() {
  const { token } = useParams();
  const navigate = useNavigate();

  const [invite, setInvite] = useState(null);
  const [problem, setProblem] = useState("");
  const [sending, setSending] = useState(false);
  const [form, setForm] = useState({ username: "", password: "" });

  usePrivatePage();

  useEffect(() => {
    let cancelled = false;
    loadStudioInvite(token)
      .then((row) => !cancelled && setInvite(row))
      .catch(
        (error) =>
          !cancelled &&
          setProblem(
            error.message ||
              "That invitation is not open. It may have been used already, or withdrawn."
          )
      );
    return () => {
      cancelled = true;
    };
  }, [token]);

  const send = async (event) => {
    event.preventDefault();
    if (sending) return;
    setSending(true);
    setProblem("");
    try {
      const done = await acceptStudioInvite(token, {
        username: form.username,
        password: form.password,
      });
      navigate(done.nextStep === "studio" ? "/studio/books" : "/signin?next=/studio/books");
    } catch (error) {
      setProblem(error.message || "That did not go through.");
      setSending(false);
    }
  };

  if (problem && !invite) {
    return (
      <div className="min-h-screen bg-background">
        <main className="mx-auto max-w-[560px] px-5 py-24 text-center">
          <img src={logoMark} alt="" className="mx-auto h-10 w-auto" aria-hidden="true" />
          <h1 className="mt-6 font-ui text-2xl font-bold text-white">
            This invitation is not open
          </h1>
          <p className="mt-3 font-ui text-base leading-relaxed text-neutral-300">{problem}</p>
          <p className="mt-6 font-ui text-sm text-neutral-500">
            If you think it should be, reply to the email it came in and we will send another.
          </p>
        </main>
      </div>
    );
  }

  if (!invite) {
    return (
      <div className="min-h-screen bg-background">
        <main className="mx-auto max-w-[640px] px-5 py-16">
          <Skeleton className="h-10 w-2/3" />
          <Skeleton className="mt-6 h-48 w-full rounded-2xl" />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-[640px] px-5 pb-24 pt-12 sm:px-8">
        <img src={logoMark} alt="" className="h-9 w-auto" aria-hidden="true" />
        <p className="mt-6 font-ui text-sm font-bold uppercase tracking-wider text-[#a855f7]">
          An invitation
        </p>
        <h1 className="mt-2 font-ui text-3xl font-bold text-white sm:text-[40px]">
          Sell printed copies of your comic
        </h1>
        <p className="mt-4 font-ui text-base leading-relaxed text-neutral-300">
          Creator Studio is not open yet. We are letting a few creators in first, and we would
          like you to be one of them.
        </p>

        <section className="mt-8 rounded-2xl border border-white/10 bg-[#222b3c] p-6 sm:p-8">
          <h2 className="font-ui text-lg font-bold text-white">What you can do with it</h2>
          <ul className="mt-4 flex list-disc flex-col gap-2 pl-5">
            {WHAT_YOU_GET.map((line) => (
              <li key={line} className="font-ui text-base leading-relaxed text-neutral-300">
                {line}
              </li>
            ))}
          </ul>
          <p className="mt-5 font-ui text-sm leading-relaxed text-neutral-400">
            Books are printed one at a time when somebody buys one, so there is nothing to pay
            up front and no stock to hold. Nothing can be charged yet: payment is not connected,
            so orders stop before anybody's card is involved.
          </p>
        </section>

        <form onSubmit={send} className="mt-10">
          <h2 className="font-ui text-xl font-bold text-white">Make your account</h2>
          <p className="mt-1 font-ui text-sm text-neutral-400">It will be on {invite.email}.</p>

          <div className="mt-5 flex flex-col gap-4">
            <div>
              <label className={LABEL} htmlFor="username">
                A username
              </label>
              <input
                id="username"
                className={FIELD}
                required
                autoComplete="username"
                value={form.username}
                onChange={(event) => setForm({ ...form, username: event.target.value })}
              />
            </div>
            <div>
              <label className={LABEL} htmlFor="password">
                A password
              </label>
              <input
                id="password"
                className={FIELD}
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={form.password}
                onChange={(event) => setForm({ ...form, password: event.target.value })}
              />
              <p className="mt-1.5 font-ui text-xs text-neutral-500">At least 8 characters.</p>
            </div>
          </div>

          {problem && (
            <p
              role="alert"
              className="mt-5 rounded-xl border border-[#f3a0b8]/40 bg-[#3a2030] px-4 py-3 font-ui text-sm text-[#ffb4c4]"
            >
              {problem}
            </p>
          )}

          <button
            type="submit"
            disabled={sending}
            className="mt-6 min-h-[52px] w-full rounded-full bg-[#a855f7] px-8 font-ui text-base font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-40 sm:w-auto"
          >
            {sending ? "Setting it up..." : "Accept and make my account"}
          </button>

          <p className="mt-3 font-ui text-xs text-neutral-500">
            Already have a VantaOrigin account on this address? Sign in first, then open this
            link again and it will attach to the account you are on.
          </p>
        </form>
      </main>
    </div>
  );
}
