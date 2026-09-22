import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../data/AuthContext.jsx";
import {
  AuthShell,
  Checkbox,
  FIELD,
  GRADIENT,
  OrDivider,
  PILL,
  PasswordField,
  SocialButtons,
} from "./authUi";

function ErrorMark() {
  return (
    <span
      aria-hidden="true"
      className="absolute left-full ml-8 top-1/2 hidden size-6 lg:flex -translate-y-1/2 items-center justify-center rounded-full bg-[#f2415f] font-ui text-sm font-bold text-white"
    >
      !
    </span>
  );
}

export default function SignIn() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn } = useAuth();
  const [remember, setRemember] = useState(true);
  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setError(null);
    setMessage("");
    setBusy(true);
    try {
      await signIn({ email: account.trim(), password });
      // back to wherever they were headed before being asked to sign in
      navigate(location.state?.from || "/creators-hub", { replace: true });
    } catch (problem) {
      // The API answers the same way for an unknown email and a wrong
      // password, so accounts cannot be discovered from this form.
      setError("password");
      setMessage(problem.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell>
      <h1 className="mt-[34px] text-center font-ui text-[32px] font-bold leading-[1.2] text-white sm:text-[40px]">
        Welcome Back to VantaOrigin
      </h1>
      <p className="mt-[38px] text-center font-ui text-lg leading-[27px] text-[#f5f5f5] sm:text-[22px]">
        Log in to manage your Realm, update your characters, and keep your creative hub up to
        date.
      </p>

      <form className="mt-[67px] flex flex-col items-center" onSubmit={submit} noValidate>
        <div className="flex w-full max-w-[328px] flex-col gap-[21px]">
          <div>
            <p className="mb-2 h-6 font-ui text-base text-white" role={error ? "alert" : undefined}>
              {message}
            </p>
            <div className="relative">
              <input
                className={FIELD}
                type="email"
                name="account"
                value={account}
                onChange={(event) => setAccount(event.target.value)}
                placeholder="Email address"
                aria-label="Email address"
                aria-invalid={error === "account"}
                required
              />
              {error === "account" && <ErrorMark />}
            </div>
          </div>

          <div className="relative">
            <PasswordField
              name="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              aria-invalid={error === "password"}
              required
            />
            {error === "password" && <ErrorMark />}
          </div>
        </div>

        <div className="mt-[22px]">
          <Checkbox checked={remember} onChange={setRemember} label="Remember me" />
        </div>

        <button
          type="submit"
          disabled={busy}
          className={`${PILL} mt-[25px] h-16 w-full max-w-[326px] ${GRADIENT} disabled:cursor-not-allowed disabled:opacity-50`}
        >
          {busy ? "Logging in…" : "Log in"}
        </button>

        <p className="mt-4 font-ui text-base text-white">
          New here?{" "}
          <Link to="/signup" className="font-bold text-primary hover:underline">
            Create an account
          </Link>
        </p>

        <div className="mt-[21px]">
          <OrDivider />
        </div>

        <div className="mt-[24px] flex w-full flex-col items-center gap-[25px]">
          <SocialButtons label="Login" />
        </div>

        <p className="mt-[30px] max-w-[330px] text-center font-ui text-base text-[#f5f5f5]">
          By joining you agree to the{" "}
          <a href="#codes" className="font-bold text-primary hover:underline">
            codes
          </a>{" "}
          of the realms.
        </p>
      </form>

      <Link
        to="/forgot-password"
        className="mt-auto pt-[100px] text-center font-ui text-base text-white hover:underline"
      >
        Forgot <span className="font-bold text-primary">Password?</span>
      </Link>
    </AuthShell>
  );
}
