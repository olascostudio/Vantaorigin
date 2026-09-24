import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../data/AuthContext.jsx";
import Loading from "./Loading.jsx";

// Wraps the pages that belong to a creator. While the session is being
// checked it shows nothing rather than flashing the sign-in screen.
export default function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1b2233]">
        <Loading label="Checking your session" className="min-h-screen" />
      </div>
    );
  }

  if (!user) {
    // Remember where they were going, so signing in carries on from here.
    return <Navigate to="/signin" replace state={{ from: location.pathname + location.search }} />;
  }

  return children;
}
