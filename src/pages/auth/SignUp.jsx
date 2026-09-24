import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
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
  TermsNote,
} from "./authUi";

export default function SignUp() {
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const [agreed, setAgreed] = useState(true);
  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const set = (key) => (event) => setForm({ ...form, [key]: event.target.value });

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const result = await signUp(form);
      // devCode only exists while the API prints emails instead of sending them
      navigate("/signup/verify", { state: { devCode: result.devCode } });
    } catch (problem) {
      setError(problem.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell>
      <h1 className="mt-[34px] text-center font-ui text-[32px] font-bold leading-[1.2] text-white sm:text-[40px]">
        Start Creating with VantaOrigin
      </h1>
      <p className="mt-[38px] text-center font-ui text-lg leading-[27px] text-[#f5f5f5] sm:text-[22px]">
        Create your Realm, add your characters, and build a public home for your creative
        work.
      </p>

      <form className="mt-[60px] flex flex-col items-center" onSubmit={submit}>
        <div className="flex w-full max-w-[328px] flex-col gap-[21px]">
          {error && (
            <p role="alert" className="text-center font-ui text-base text-[#f2415f]">
              {error}
            </p>
          )}
          <input
            className={FIELD}
            type="text"
            name="username"
            value={form.username}
            onChange={set("username")}
            placeholder="Username"
            aria-label="Username"
            required
          />
          <input
            className={FIELD}
            type="email"
            name="email"
            value={form.email}
            onChange={set("email")}
            placeholder="Email address"
            aria-label="Email address"
            required
          />
          <PasswordField
            name="password"
            value={form.password}
            onChange={set("password")}
            minLength={8}
            required
          />
        </div>

        <div className="mt-[19px]">
          <Checkbox
            checked={agreed}
            onChange={setAgreed}
            label="I am 18+ and agree to the creator code."
            labelClassName="text-center"
          />
        </div>

        <button
          type="submit"
          disabled={busy || !agreed}
          className={`${PILL} mt-[25px] h-16 w-full max-w-[326px] ${GRADIENT} disabled:cursor-not-allowed disabled:opacity-50`}
        >
          {busy ? "Creating your account…" : "Sign up"}
        </button>

        <p className="mt-4 font-ui text-base text-white">
          Already have an account?{" "}
          <Link to="/signin" className="font-bold text-primary hover:underline">
            Log in
          </Link>
        </p>

        <div className="mt-[21px]">
          <OrDivider />
        </div>

        <div className="mt-[24px] flex w-full flex-col items-center gap-[25px]">
          <SocialButtons label="Sign up" />
        </div>

        <div className="mt-[46px]">
          <TermsNote />
        </div>
      </form>
    </AuthShell>
  );
}
