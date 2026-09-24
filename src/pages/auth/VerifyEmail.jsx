import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AuthShell, GRADIENT, PILL } from "./authUi";
import { useAuth } from "../../data/AuthContext.jsx";

const CODE_LENGTH = 4;
const RESEND_SECONDS = 39;

const format = (total) =>
  `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;

// Used twice: after signing up (mode "signup", checked against the session)
// and during a password reset (mode "reset", checked against the email typed
// on the previous screen).
export default function VerifyEmail({
  title = "Email verification",
  next = "/creators-hub",
  mode = "signup",
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, verifyEmail, resendCode, checkResetCode, forgotPassword } = useAuth();
  const [digits, setDigits] = useState(Array(CODE_LENGTH).fill(""));
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const inputs = useRef([]);

  // Resetting a password carries the address from the previous screen;
  // verifying an account uses the one on the account itself.
  const email = location.state?.email || (mode === "signup" ? user?.email : "");
  // Sign-up succeeded but the code email did not go out: say so, rather than
  // leaving someone waiting for a message that never arrives.
  const [emailFailed, setEmailFailed] = useState(location.state?.emailSent === false);
  // Shown only while emails print to the API's terminal instead of being sent.
  const [devCode, setDevCode] = useState(location.state?.devCode);

  useEffect(() => {
    if (secondsLeft === 0) return undefined;
    const id = setInterval(() => setSecondsLeft((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, [secondsLeft]);

  const setDigit = (index, value) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    setDigits((prev) => prev.map((d, i) => (i === index ? digit : d)));
    if (digit && index < CODE_LENGTH - 1) inputs.current[index + 1]?.focus();
  };

  const onKeyDown = (index, event) => {
    if (event.key === "Backspace" && !digits[index] && index > 0) inputs.current[index - 1]?.focus();
  };

  // Pasting the whole code into the first box fills them all.
  const onPaste = (event) => {
    const pasted = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, CODE_LENGTH);
    if (!pasted) return;
    event.preventDefault();
    setDigits(Array.from({ length: CODE_LENGTH }, (_, i) => pasted[i] ?? ""));
    inputs.current[Math.min(pasted.length, CODE_LENGTH - 1)]?.focus();
  };

  const submit = async (event) => {
    event.preventDefault();
    const code = digits.join("");
    if (code.length < CODE_LENGTH) {
      setError("Enter all four digits");
      return;
    }

    setError("");
    setBusy(true);
    try {
      if (mode === "reset") {
        await checkResetCode(email, code);
        // The code is used up on the next screen, with the new password.
        navigate(next, { state: { email, code } });
      } else {
        await verifyEmail(code);
        navigate(next);
      }
    } catch (problem) {
      setError(problem.message);
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    setError("");
    try {
      const result = mode === "reset" ? await forgotPassword(email) : await resendCode();
      setDevCode(result?.devCode);
      setEmailFailed(false);
      setSecondsLeft(RESEND_SECONDS);
    } catch (problem) {
      setError(problem.message);
    }
  };

  return (
    <AuthShell>
      <h1 className="mt-[34px] text-center font-ui text-[32px] font-bold leading-[1.2] text-white sm:text-[40px]">
        {title}
      </h1>
      <p className="mt-[38px] text-center font-ui text-lg leading-[27px] text-[#f5f5f5] sm:text-[22px]">
        We sent a 4-digit code to{" "}
        {email ? <b className="break-all">{email}</b> : "the email address on this account"}.
      </p>

      {emailFailed && (
        <p role="alert" className="mt-5 rounded-xl bg-[#3a2030] px-5 py-4 text-center font-ui text-base leading-relaxed text-[#ffb4c4]">
          Your account was created, but we couldn’t send the code. Try Resend Code below, or email
          hello@vantaorigin.com and we’ll verify you by hand. You can keep using VantaOrigin
          meanwhile.
        </p>
      )}

      {devCode && (
        <p className="mt-4 text-center font-ui text-base text-[#5fdc8a]">
          Development mode — your code is <b>{devCode}</b>
        </p>
      )}

      <form className="mt-[50px] flex flex-col items-center" onSubmit={submit}>
        {error && (
          <p role="alert" className="mb-5 text-center font-ui text-base text-[#f2415f]">
            {error}
          </p>
        )}

        <div className="flex gap-4 sm:gap-[39px]">
          {digits.map((digit, index) => (
            <input
              key={index}
              ref={(el) => {
                inputs.current[index] = el;
              }}
              value={digit}
              onChange={(event) => setDigit(index, event.target.value)}
              onKeyDown={(event) => onKeyDown(index, event)}
              onPaste={onPaste}
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={1}
              aria-label={`Digit ${index + 1}`}
              placeholder="•"
              className="size-14 rounded-2xl border border-[#7faef8] bg-[#252f46] text-center font-ui text-2xl font-bold text-white outline-none placeholder:text-[#7e99d9] focus:ring-2 focus:ring-[#7faef8] sm:size-16"
            />
          ))}
        </div>

        <div className="mt-[31px] flex w-full max-w-[373px] items-center justify-between">
          <button
            type="button"
            disabled={secondsLeft > 0}
            onClick={resend}
            className="font-ui text-base font-bold text-[#df1871] underline disabled:opacity-50"
          >
            Resend Code
          </button>
          <span className="font-ui text-base text-white" aria-live="polite">
            {format(secondsLeft)}
          </span>
        </div>

        <button
          type="submit"
          disabled={busy}
          className={`${PILL} mt-[66px] h-16 w-full max-w-[328px] ${GRADIENT} disabled:cursor-not-allowed disabled:opacity-50`}
        >
          {busy ? "Checking…" : "Verify"}
        </button>

        {mode !== "reset" && (
          <Link
            to="/creators-hub"
            className="mt-5 font-ui text-base text-neutral-300 underline hover:text-white"
          >
            Skip for now
          </Link>
        )}
      </form>
    </AuthShell>
  );
}
