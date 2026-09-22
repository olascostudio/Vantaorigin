import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { AuthShell, FIELD, GRADIENT, PILL, PasswordField } from "./authUi";
import { useAuth } from "../../data/AuthContext.jsx";

export default function ResetPassword() {
  const navigate = useNavigate();
  const location = useLocation();
  const { resetPassword } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const mismatch = confirmation.length > 0 && confirmation !== password;

  // The email and code come from the screen before; without them there is
  // nothing to reset.
  const { email, code } = location.state || {};
  if (!email || !code) return <Navigate to="/forgot-password" replace />;

  const submit = async (event) => {
    event.preventDefault();
    if (mismatch) return;

    setError("");
    setBusy(true);
    try {
      await resetPassword(email, code, password);
      navigate("/signin", { replace: true });
    } catch (problem) {
      setError(problem.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell>
      <h1 className="mt-[34px] text-center font-ui text-[32px] font-bold leading-[1.2] text-white sm:text-[40px]">
        Enter New Password
      </h1>
      <p className="mt-[38px] text-center font-ui text-lg leading-[27px] text-[#f5f5f5] sm:text-[22px]">
        Enter a new password to continue to log in
      </p>

      <form className="mt-[70px] flex flex-col items-center" onSubmit={submit}>
        <div className="flex w-full max-w-[328px] flex-col gap-[23px]">
          {error && (
            <p role="alert" className="text-center font-ui text-base text-[#f2415f]">
              {error}
            </p>
          )}
          <input
            className={FIELD}
            type="password"
            name="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Enter new password"
            aria-label="New password"
            minLength={8}
            required
          />
          <PasswordField
            name="confirmation"
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            placeholder="Re-Enter password"
            required
          />
          {mismatch && (
            <p role="alert" className="font-ui text-sm text-[#f2415f]">
              Passwords do not match.
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={busy || mismatch}
          className={`${PILL} mt-[80px] h-16 w-full max-w-[328px] ${GRADIENT} disabled:cursor-not-allowed disabled:opacity-50`}
        >
          {busy ? "Saving…" : "Save and log in"}
        </button>
      </form>
    </AuthShell>
  );
}
