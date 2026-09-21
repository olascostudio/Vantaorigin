import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
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

// Stand-ins until a backend answers: these values trigger the designed errors.
const KNOWN_EMAIL = "johnson765@gmail.com";
const KNOWN_PASSWORD = "vantaorigin";

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
  const [remember, setRemember] = useState(true);
  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);

  const submit = (event) => {
    event.preventDefault();
    if (account.trim().toLowerCase() !== KNOWN_EMAIL) {
      setError("account");
      return;
    }
    if (password !== KNOWN_PASSWORD) {
      setError("password");
      return;
    }
    setError(null);
    // Front-end only: no session is created yet.
    navigate("/discover");
  };

  return (
    <AuthShell>
      <h1 className="mt-[34px] text-center font-ui text-[32px] font-bold leading-[1.2] text-white sm:text-[40px]">
        Welcome Back to VantaOrigin
      </h1>
      <p className="mt-[38px] text-center font-ui text-lg leading-[27px] text-[#f5f5f5] sm:text-[22px]">
        Log in to explore new stories, manage your creations, and stay connected with the world of
        imagination.
      </p>

      <form className="mt-[67px] flex flex-col items-center" onSubmit={submit} noValidate>
        <div className="flex w-full max-w-[328px] flex-col gap-[21px]">
          <div>
            <p className="mb-2 h-6 font-ui text-base text-white" role={error ? "alert" : undefined}>
              {error === "account" && "Email does not exist!"}
              {error === "password" && "Wrong password"}
            </p>
            <div className="relative">
              <input
                className={FIELD}
                type="text"
                name="account"
                value={account}
                onChange={(event) => setAccount(event.target.value)}
                placeholder="Email/Phone number"
                aria-label="Email or phone number"
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

        <button type="submit" className={`${PILL} mt-[25px] h-16 w-full max-w-[326px] ${GRADIENT}`}>
          Log in
        </button>

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
