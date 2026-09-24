import { Link } from "react-router-dom";
import { useAuth } from "../data/AuthContext.jsx";

// Signing up works without verifying, so this is the reminder that follows the
// creator around until they do. It says nothing at all once verified.
export default function VerifyBanner() {
  const { user } = useAuth();
  if (!user || user.emailVerified) return null;

  return (
    <div className="bg-[#3a2c12] px-4 py-3 text-center">
      <p className="font-ui text-sm text-[#ffd98a] sm:text-base">
        Your email isn’t verified yet.{" "}
        <Link to="/signup/verify" className="font-bold underline hover:text-white">
          Enter your code
        </Link>{" "}
        to secure your account.
      </p>
    </div>
  );
}
