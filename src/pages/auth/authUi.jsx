import { useState } from "react";
import { Link } from "react-router-dom";
import authArt from "../../assets/auth/banner.webp";

export const PILL =
  "flex items-center justify-center gap-3 rounded-full font-ui text-lg font-bold transition-transform hover:-translate-y-0.5";

export const GRADIENT = "bg-gradient-to-r from-[#df1f99] to-[#9333ea] text-white";

export function BackHome() {
  return (
    <Link
      to="/"
      className="flex items-center gap-2 self-start font-ui text-base text-white transition-opacity hover:opacity-80"
    >
      <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M19 12H5M11 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      Back home
    </Link>
  );
}

export function OrDivider() {
  return (
    <div className="flex w-full max-w-[308px] items-center gap-3">
      <span className="h-px flex-1 bg-[#2c323f]" />
      <span className="font-ui text-sm text-white">OR</span>
      <span className="h-px flex-1 bg-[#2c323f]" />
    </div>
  );
}

export function TermsNote() {
  return (
    <p className="max-w-[330px] text-center font-ui text-base text-[#f5f5f5]">
      By joining you agree to the VantaOrigin Studios{" "}
      <a href="#terms" className="text-[#04a8d5] hover:underline">
        Terms and Conditions
      </a>
    </p>
  );
}

export function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" className="size-6 shrink-0" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.6 2.4 30.2 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.2C12.4 13.7 17.7 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.1 24.6c0-1.6-.1-3.2-.4-4.6H24v9.1h12.4c-.5 2.9-2.2 5.3-4.7 7l7.7 6c4.5-4.1 6.7-10.2 6.7-17.5z" />
      <path fill="#FBBC05" d="M10.5 28.6c-.5-1.4-.8-2.9-.8-4.6s.3-3.2.8-4.6l-7.9-6.2C1 16.3 0 20 0 24s1 7.7 2.6 10.8l7.9-6.2z" />
      <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.7-6c-2.1 1.4-4.8 2.3-8.2 2.3-6.3 0-11.6-4.2-13.5-9.9l-7.9 6.2C6.5 42.6 14.6 48 24 48z" />
    </svg>
  );
}

export function AppleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-6 shrink-0" fill="currentColor" aria-hidden="true">
      <path d="M16.365 1.43c0 1.14-.42 2.2-1.25 3.03-.9.92-2 1.45-3.02 1.37a3.3 3.3 0 0 1 .86-2.4c.57-.65 1.53-1.3 2.54-1.4.1.13.13.27.13.4h.74zM20.5 17.2c-.4.93-.6 1.34-1.12 2.16-.72 1.14-1.74 2.56-3 2.57-1.12.01-1.4-.73-2.92-.72-1.52.01-1.83.74-2.95.73-1.26-.01-2.22-1.29-2.95-2.43-2.03-3.19-2.24-6.93-.99-8.92.89-1.41 2.29-2.24 3.61-2.24 1.34 0 2.19.74 3.3.74 1.08 0 1.74-.74 3.29-.74 1.17 0 2.42.64 3.3 1.75-2.9 1.59-2.43 5.73.43 7.1z" />
    </svg>
  );
}

export function SocialButtons({ label = "Sign up" }) {
  return (
    <>
      <button type="button" className={`${PILL} h-[60px] w-full max-w-[324px] bg-white text-black`}>
        <GoogleIcon />
        {label} with Google
      </button>
      <button type="button" className={`${PILL} h-[60px] w-full max-w-[324px] bg-white text-black`}>
        <AppleIcon />
        {label} with Apple
      </button>
    </>
  );
}

// Split layout shared by the signup / signin / verification screens.
export function AuthShell({ children }) {
  return (
    <div className="flex min-h-screen bg-auth-bg">
      <div aria-hidden="true" className="relative hidden w-[639px] shrink-0 overflow-hidden lg:block">
        <img src={authArt} alt="" className="size-full object-cover object-left-top" />
        <div className="absolute inset-y-0 right-0 w-40 bg-gradient-to-r from-transparent to-auth-bg" />
      </div>

      <div className="flex flex-1 justify-center px-6 pb-14 pt-[83px]">
        <div className="flex w-full max-w-[762px] flex-col">
          <BackHome />
          {children}
        </div>
      </div>
    </div>
  );
}

export const FIELD =
  "h-16 w-full rounded-2xl border border-transparent bg-[#252f46] px-6 font-ui text-lg text-white outline-none placeholder:text-[#7e99d9] focus:border-[#7faef8] [&:not(:placeholder-shown)]:border-[#7faef8]";

export function EyeIcon({ hidden }) {
  return (
    <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="3.2" />
      {hidden && <path d="M3 3l18 18" strokeLinecap="round" />}
    </svg>
  );
}

export function PasswordField({ placeholder = "Password", ...props }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input
        className={`${FIELD} pr-16`}
        type={visible ? "text" : "password"}
        placeholder={placeholder}
        aria-label={placeholder}
        {...props}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
        className="absolute right-5 top-1/2 -translate-y-1/2 text-[#7e99d9] transition-opacity hover:opacity-80"
      >
        <EyeIcon hidden={!visible} />
      </button>
    </div>
  );
}

export function Checkbox({ checked, onChange, label, labelClassName = "" }) {
  return (
    <label className="flex w-full max-w-[328px] items-start gap-4">
      <span className="relative mt-0.5 flex size-[26px] shrink-0 items-center justify-center rounded-md bg-[#7e99d9]">
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          className="peer absolute inset-0 cursor-pointer appearance-none rounded-md"
        />
        <svg
          viewBox="0 0 24 24"
          className="pointer-events-none size-[18px] text-white opacity-0 peer-checked:opacity-100"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          aria-hidden="true"
        >
          <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <span className={`flex-1 font-ui text-base text-[#f5f5f5] ${labelClassName}`}>{label}</span>
    </label>
  );
}
