import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthShell, FIELD, GRADIENT, PILL } from "./authUi";
import { useAuth } from "../../data/AuthContext.jsx";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const { forgotPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const result = await forgotPassword(email.trim());
      // Carries the email to the code screen; devCode only exists while
      // emails print to the terminal.
      navigate("/forgot-password/verify", {
        state: { email: email.trim(), devCode: result.devCode },
      });
    } catch (problem) {
      setError(problem.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell>
      <h1 className="mt-[34px] text-center font-ui text-[32px] font-bold leading-[1.2] text-white sm:text-[40px]">
        Forgot Password
      </h1>
      <p className="mt-[38px] text-center font-ui text-lg leading-[27px] text-[#f5f5f5] sm:text-[22px]">
        Please enter the email address associated with this account to obtain a{" "}
        <strong className="font-bold">4-digits</strong> code for password reset.
      </p>

      <form className="mt-[70px] flex w-full flex-col items-center" onSubmit={submit}>
        {error && (
          <p role="alert" className="mb-4 text-center font-ui text-base text-[#f2415f]">
            {error}
          </p>
        )}
        <input
          className={`${FIELD} max-w-[328px]`}
          type="email"
          name="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="Email address"
          aria-label="Email address"
          required
        />

        <button
          type="submit"
          disabled={busy}
          className={`${PILL} mt-[57px] h-16 w-full max-w-[328px] ${GRADIENT} disabled:cursor-not-allowed disabled:opacity-50`}
        >
          {busy ? "Sending…" : "Proceed"}
        </button>
      </form>
    </AuthShell>
  );
}
