// The page at the end of an invitation.
//
// A printer who has never heard of us opens a link and has two questions:
// what is this, and what am I agreeing to. So the agreement is the page,
// not a checkbox next to one, and the account form sits underneath it where
// somebody arrives having read the thing.
//
// There is no other way in. An account made the ordinary way is not a
// printer's account, so this screen is the whole door.
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { usePrivatePage } from "../data/pageMeta";
import { Skeleton } from "../components/Loading.jsx";
import { acceptInvite, loadInvite } from "../data/printer";
import logoMark from "../assets/landing/hero/logo-mark.svg";

const FIELD =
  "w-full box-border min-h-[48px] rounded-xl border border-white/20 bg-[#222b3c] px-4 py-3 font-ui text-base text-white outline-none placeholder:text-neutral-500 focus:border-[#a855f7] focus:ring-2 focus:ring-[#a855f7]/40";
const LABEL = "block font-ui text-sm font-bold text-white mb-1.5";

export default function PrintInvite() {
  const { token } = useParams();
  const navigate = useNavigate();

  const [invite, setInvite] = useState(null);
  const [problem, setProblem] = useState("");
  const [read, setRead] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [sending, setSending] = useState(false);
  const [form, setForm] = useState({ username: "", password: "" });

  // Never indexed: the address is the invitation.
  usePrivatePage();

  useEffect(() => {
    let cancelled = false;
    loadInvite(token)
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
      const done = await acceptInvite(token, {
        accepted: true,
        agreementVersion: invite.agreement.version,
        username: form.username,
        password: form.password,
      });
      navigate(done.nextStep === "portal" ? "/print" : "/signin?next=/print");
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
        <main className="mx-auto max-w-[720px] px-5 py-16">
          <Skeleton className="h-10 w-2/3" />
          <Skeleton className="mt-6 h-64 w-full rounded-2xl" />
        </main>
      </div>
    );
  }

  const { agreement } = invite;

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-[720px] px-5 pb-24 pt-12 sm:px-8">
        <header>
          <img src={logoMark} alt="" className="h-9 w-auto" aria-hidden="true" />
          <p className="mt-6 font-ui text-sm font-bold uppercase tracking-wider text-[#a855f7]">
            An invitation
          </p>
          <h1 className="mt-2 font-ui text-3xl font-bold text-white sm:text-[40px]">
            Print for VantaOrigin
          </h1>
          <p className="mt-4 font-ui text-base leading-relaxed text-neutral-300">
            We would like {invite.printer.name} to print books for creators here. This is what
            that means. Read it before you make an account.
          </p>
        </header>

        {/* The agreement, in full and on the page. A link to a document
            somebody has to go and find is a document nobody reads, and
            "they get to see a read document button" is only worth having if
            the document is what the button leads to. */}
        <section className="mt-10 rounded-2xl border border-white/10 bg-[#222b3c] p-6 sm:p-8">
          <h2 className="font-ui text-xl font-bold text-white">{agreement.title}</h2>
          <p className="mt-2 font-ui text-sm text-neutral-400">
            Version {agreement.version}
          </p>
          <p className="mt-4 font-ui text-base leading-relaxed text-neutral-300">
            {agreement.intro}
          </p>

          {!read ? (
            <button
              type="button"
              onClick={() => setRead(true)}
              className="mt-6 min-h-[48px] rounded-full bg-white px-7 font-ui text-base font-bold text-black transition-opacity hover:opacity-90"
            >
              Read the agreement
            </button>
          ) : (
            <div className="mt-8 flex flex-col gap-8">
              {agreement.sections.map((section) => (
                <div key={section.heading}>
                  <h3 className="font-ui text-base font-bold text-white">{section.heading}</h3>
                  <ul className="mt-3 flex list-disc flex-col gap-2 pl-5">
                    {section.points.map((point) => (
                      <li
                        key={point}
                        className="font-ui text-base leading-relaxed text-neutral-300"
                      >
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* The form only appears once they have opened it. Not a lock, a
            sequence: somebody who has not seen the terms has not agreed to
            them, and putting the password field above the reading is how
            you get a signature on an unread page. */}
        {read && (
          <form onSubmit={send} className="mt-10">
            <h2 className="font-ui text-xl font-bold text-white">Make your account</h2>
            <p className="mt-1 font-ui text-sm text-neutral-400">
              It will be attached to {invite.printer.name}, on {invite.email}.
            </p>

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

              <label className="flex items-start gap-3 py-2">
                <input
                  type="checkbox"
                  className="mt-1 size-5 shrink-0 accent-[#a855f7]"
                  checked={agreed}
                  onChange={(event) => setAgreed(event.target.checked)}
                />
                <span className="font-ui text-base leading-relaxed text-neutral-300">
                  I have read the agreement above and I accept it on behalf of{" "}
                  {invite.printer.name}.
                </span>
              </label>
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
              disabled={!agreed || sending}
              className="mt-6 min-h-[52px] w-full rounded-full bg-[#a855f7] px-8 font-ui text-base font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-40 sm:w-auto"
            >
              {sending ? "Setting it up..." : "Accept and make my account"}
            </button>
          </form>
        )}
      </main>
    </div>
  );
}
