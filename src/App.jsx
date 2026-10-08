import { Navigate, Route, Routes, useLocation, useParams } from "react-router-dom";
import Footer from "./components/Footer";
import RequireAuth from "./components/RequireAuth.jsx";
import RequireAdmin from "./components/RequireAdmin.jsx";
import Landing from "./pages/Landing";
import Blog from "./pages/Blog";
import BlogPost from "./pages/BlogPost";
import BlogEditor from "./pages/BlogEditor";
import Discover from "./pages/Discover";
import CreatorHub from "./pages/CreatorHub";
import CreateCharacter from "./pages/CreateCharacter";
import CharacterProfile from "./pages/CharacterProfile";
import CharacterView from "./pages/CharacterView";
import Settings from "./pages/Settings";
import Community from "./pages/Community";
import About from "./pages/About";
import Admin from "./pages/Admin";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import Contact from "./pages/Contact";
import Help from "./pages/Help";
import CreatorPage from "./pages/CreatorPage";
import Marketplace from "./pages/Marketplace";
import MarketplaceHowItWorks from "./pages/MarketplaceHowItWorks";
import ProjectRequest from "./pages/ProjectRequest";
import AuthLanding from "./pages/auth/AuthLanding";
import SignUp from "./pages/auth/SignUp";
import SignIn from "./pages/auth/SignIn";
import VerifyEmail from "./pages/auth/VerifyEmail";
import ForgotPassword from "./pages/auth/ForgotPassword";
import ResetPassword from "./pages/auth/ResetPassword";

// Links shared before the rename carry /realm/ in them. They are somebody
// else's post, out of our hands, so they land on the same page rather than a
// dead end.
function OldRealmLink() {
  const { username } = useParams();
  const { search } = useLocation();
  return <Navigate to={`/creator/${username}${search}`} replace />;
}

// studio.vantaorigin.com is the marketplace's own address: visiting its root
// lands on the marketplace rather than the marketing home page. Every other
// route still works there, so links between pages never break.
function StudioHome() {
  const { search } = useLocation();
  const onStudio = window.location.hostname.startsWith("studio.");
  return onStudio ? <Navigate to={`/marketplace${search}`} replace /> : <Landing />;
}

export default function App() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-background">
      <Routes>
        <Route path="/" element={<StudioHome />} />
        {/* Open to anyone. Discovery is how a character is found, and asking
            a stranger to sign in first is asking them not to look. */}
        <Route path="/discover" element={<Discover />} />
        <Route path="/blog" element={<Blog />} />
        <Route path="/blog/:slug" element={<BlogPost />} />
        <Route path="/creators-hub" element={<RequireAuth><CreatorHub /></RequireAuth>} />
        <Route path="/creators-hub/character/new" element={<RequireAuth><CreateCharacter /></RequireAuth>} />
        <Route path="/creators-hub/character" element={<RequireAuth><CharacterView owner /></RequireAuth>} />
        <Route path="/creators-hub/character/profile" element={<RequireAuth><CharacterProfile /></RequireAuth>} />
        {/* A character has an address that says its name; the id form is
            what earlier links carry, and still works. */}
        <Route path="/character/:slug" element={<CharacterView />} />
        <Route path="/character" element={<CharacterView />} />
        <Route path="/marketplace" element={<Marketplace />} />
        <Route path="/marketplace/how-it-works" element={<MarketplaceHowItWorks />} />
        <Route path="/marketplace/project-request" element={<ProjectRequest />} />
        <Route path="/community" element={<Community />} />
        <Route path="/about" element={<About />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/help" element={<Help />} />
        {/* Only opens for an account named in the API setting. */}
        <Route
          path="/admin"
          element={
            <RequireAuth>
              <RequireAdmin>
                <Admin />
              </RequireAdmin>
            </RequireAuth>
          }
        />
        <Route
          path="/admin/blog/:id"
          element={
            <RequireAuth>
              <RequireAdmin>
                <BlogEditor />
              </RequireAdmin>
            </RequireAuth>
          }
        />
        {/* The page a creator shares. It used to be called a Realm, and links
            with that word in them are already out in the world, so they keep
            working. */}
        <Route path="/creator/:username" element={<CreatorPage />} />
        <Route path="/realm/:username" element={<OldRealmLink />} />
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
