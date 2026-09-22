import { Route, Routes } from "react-router-dom";
import Footer from "./components/Footer";
import RequireAuth from "./components/RequireAuth.jsx";
import Landing from "./pages/Landing";
import Discover from "./pages/Discover";
import CreatorHub from "./pages/CreatorHub";
import CreateCharacter from "./pages/CreateCharacter";
import CharacterProfile from "./pages/CharacterProfile";
import CharacterView from "./pages/CharacterView";
import Settings from "./pages/Settings";
import Community from "./pages/Community";
import Marketplace from "./pages/Marketplace";
import MarketplaceHowItWorks from "./pages/MarketplaceHowItWorks";
import ProjectRequest from "./pages/ProjectRequest";
import AuthLanding from "./pages/auth/AuthLanding";
import SignUp from "./pages/auth/SignUp";
import SignIn from "./pages/auth/SignIn";
import VerifyEmail from "./pages/auth/VerifyEmail";
import ForgotPassword from "./pages/auth/ForgotPassword";
import ResetPassword from "./pages/auth/ResetPassword";

export default function App() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-background">
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/discover" element={<RequireAuth><Discover /></RequireAuth>} />
        <Route path="/creators-hub" element={<RequireAuth><CreatorHub /></RequireAuth>} />
        <Route path="/creators-hub/character/new" element={<RequireAuth><CreateCharacter /></RequireAuth>} />
        <Route path="/creators-hub/character" element={<RequireAuth><CharacterView owner /></RequireAuth>} />
        <Route path="/creators-hub/character/profile" element={<RequireAuth><CharacterProfile /></RequireAuth>} />
        <Route path="/character" element={<CharacterView />} />
        <Route path="/marketplace" element={<Marketplace />} />
        <Route path="/marketplace/how-it-works" element={<MarketplaceHowItWorks />} />
        <Route path="/marketplace/project-request" element={<ProjectRequest />} />
        <Route path="/community" element={<Community />} />
        <Route path="/settings" element={<RequireAuth><Settings /></RequireAuth>} />
        <Route path="/settings/:tab" element={<RequireAuth><Settings /></RequireAuth>} />
        <Route path="/auth" element={<AuthLanding />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/signup/verify" element={<VerifyEmail />} />
        <Route path="/signin" element={<SignIn />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route
          path="/forgot-password/verify"
          element={<VerifyEmail mode="reset" title="Reset Password" next="/forgot-password/reset" />}
        />
        <Route path="/forgot-password/reset" element={<ResetPassword />} />
      </Routes>
      {/* Shared across every route so it stays consistent site-wide */}
      <Footer />
    </div>
  );
}
