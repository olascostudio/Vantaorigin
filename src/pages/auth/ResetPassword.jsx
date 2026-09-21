import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthShell, FIELD, GRADIENT, PILL, PasswordField } from "./authUi";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const mismatch = confirmation.length > 0 && confirmation !== password;

  return (
    <AuthShell>
      <h1 className="mt-[34px] text-center font-ui text-[32px] font-bold leading-[1.2] text-white sm:text-[40px]">
        Enter New Password
      </h1>
      <p className="mt-[38px] text-center font-ui text-lg leading-[27px] text-[#f5f5f5] sm:text-[22px]">
        Enter a new password to continue to log in
      </p>

      <form
        className="mt-[87px] flex flex-col items-center"
        onSubmit={(event) => {
          event.preventDefault();
          if (mismatch) return;
          // Front-end only: no password is actually changed yet.
          navigate("/signin");
        }}
      >
        <div className="flex w-full max-w-[328px] flex-col gap-[23px]">
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

        <button type="submit" className={`${PILL} mt-[90px] h-16 w-full max-w-[328px] ${GRADIENT}`}>
          Log in
        </button>
      </form>
    </AuthShell>
  );
}
