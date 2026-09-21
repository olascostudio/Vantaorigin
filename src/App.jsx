import { Route, Routes } from "react-router-dom";
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
        <Route path="/discover" element={<Discover />} />
        <Route path="/creators-hub" element={<CreatorHub />} />
        <Route path="/creators-hub/character/new" element={<CreateCharacter />} />
        <Route path="/creators-hub/character" element={<CharacterView owner />} />
        <Route path="/creators-hub/character/profile" element={<CharacterProfile />} />
        <Route path="/character" element={<CharacterView />} />
        <Route path="/marketplace" element={<Marketplace />} />
        <Route path="/marketplace/how-it-works" element={<MarketplaceHowItWorks />} />
        <Route path="/community" element={<Community />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/settings/:tab" element={<Settings />} />
        <Route path="/auth" element={<AuthLanding />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/signup/verify" element={<VerifyEmail />} />
        <Route path="/signin" element={<SignIn />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route
          path="/forgot-password/verify"
          element={<VerifyEmail title="Reset Password" next="/forgot-password/reset" />}
        />
        <Route path="/forgot-password/reset" element={<ResetPassword />} />
      </Routes>
    </div>
  );
}
