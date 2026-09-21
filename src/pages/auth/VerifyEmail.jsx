import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthShell, GRADIENT, PILL } from "./authUi";

const CODE_LENGTH = 4;
const RESEND_SECONDS = 39;

const format = (total) =>
  `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;

export default function VerifyEmail({
  title = "Email verification",
  description = "We sent a 4-digits code to the email address associated with this account.",
  next = "/discover",
}) {
  const navigate = useNavigate();
  const [digits, setDigits] = useState(Array(CODE_LENGTH).fill(""));
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS);
  const inputs = useRef([]);

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

  return (
    <AuthShell>
      <h1 className="mt-[34px] text-center font-ui text-[32px] font-bold leading-[1.2] text-white sm:text-[40px]">
        {title}
      </h1>
      <p className="mt-[38px] text-center font-ui text-lg leading-[27px] text-[#f5f5f5] sm:text-[22px]">
        {description}
      </p>

      <form
        className="mt-[62px] flex flex-col items-center"
        onSubmit={(event) => {
          event.preventDefault();
          // Front-end only: the code isn't checked against anything yet.
          navigate(next);
        }}
      >
        <div className="flex gap-[39px]">
          {digits.map((digit, index) => (
            <input
              key={index}
              ref={(el) => {
                inputs.current[index] = el;
              }}
              value={digit}
              onChange={(event) => setDigit(index, event.target.value)}
              onKeyDown={(event) => onKeyDown(index, event)}
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={1}
              aria-label={`Digit ${index + 1}`}
              placeholder="•"
              className="size-16 rounded-2xl border border-[#7faef8] bg-[#252f46] text-center font-ui text-2xl font-bold text-white outline-none placeholder:text-[#7e99d9] focus:ring-2 focus:ring-[#7faef8]"
            />
          ))}
        </div>

        <div className="mt-[31px] flex w-full max-w-[373px] items-center justify-between">
          <button
            type="button"
            disabled={secondsLeft > 0}
            onClick={() => setSecondsLeft(RESEND_SECONDS)}
            className="font-ui text-base font-bold text-[#df1871] underline disabled:opacity-50"
          >
            Resend Code
          </button>
          <span className="font-ui text-base text-white" aria-live="polite">
            {format(secondsLeft)}
          </span>
        </div>

        <button type="submit" className={`${PILL} mt-[66px] h-16 w-full max-w-[328px] ${GRADIENT}`}>
          Verify
        </button>
      </form>
    </AuthShell>
  );
}
