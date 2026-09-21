import { useNavigate } from "react-router-dom";
import { AuthShell, FIELD, GRADIENT, PILL } from "./authUi";

export default function ForgotPassword() {
  const navigate = useNavigate();

  return (
    <AuthShell>
      <h1 className="mt-[34px] text-center font-ui text-[32px] font-bold leading-[1.2] text-white sm:text-[40px]">
        Forgot Password
      </h1>
      <p className="mt-[38px] text-center font-ui text-lg leading-[27px] text-[#f5f5f5] sm:text-[22px]">
        Please enter the email address associated with this account to obtain a{" "}
        <strong className="font-bold">4-digits</strong> code for password reset.
      </p>

      <form
        className="mt-[89px] flex flex-col items-center"
        onSubmit={(event) => {
          event.preventDefault();
          // Front-end only: no reset code is sent yet.
          navigate("/forgot-password/verify");
        }}
      >
        <input
          className={`${FIELD} max-w-[328px]`}
          type="text"
          name="account"
          placeholder="Email/Phone number"
          aria-label="Email or phone number"
          required
        />

        <button type="submit" className={`${PILL} mt-[57px] h-16 w-full max-w-[328px] ${GRADIENT}`}>
          Proceed
        </button>
      </form>
    </AuthShell>
  );
}
