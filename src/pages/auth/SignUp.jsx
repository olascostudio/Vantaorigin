import { useState } from "react";
import { useNavigate } from "react-router-dom";
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
  const [agreed, setAgreed] = useState(true);

  return (
    <AuthShell>
      <h1 className="mt-[34px] text-center font-ui text-[32px] font-bold leading-[1.2] text-white sm:text-[40px]">
        Start Creating with VantaOrigin
      </h1>
      <p className="mt-[38px] text-center font-ui text-lg leading-[27px] text-[#f5f5f5] sm:text-[22px]">
        Build your profile, publish your stories, and gain access to the tools and community that
        bring your creativity to life.
      </p>

      <form
        className="mt-[89px] flex flex-col items-center"
        onSubmit={(event) => {
          event.preventDefault();
          // Front-end only: no account is created yet.
          navigate("/signup/verify");
        }}
      >
        <div className="flex w-full max-w-[328px] flex-col gap-[21px]">
          <input
            className={FIELD}
            type="text"
            name="username"
            placeholder="Username"
            aria-label="Username"
            required
          />
          <input
            className={FIELD}
            type="text"
            name="account"
            placeholder="Email/Phone number"
            aria-label="Email or phone number"
            required
          />
          <PasswordField name="password" minLength={8} required />
        </div>

        <div className="mt-[19px]">
          <Checkbox
            checked={agreed}
            onChange={setAgreed}
            label="I am 13+ and agree to the creator code."
            labelClassName="text-center"
          />
        </div>

        <button type="submit" className={`${PILL} mt-[25px] h-16 w-full max-w-[326px] ${GRADIENT}`}>
          Sign up
        </button>

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
