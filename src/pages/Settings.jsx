import { useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import DashboardNav from "../components/DashboardNav";
import { loadSettings, saveSettings } from "../data/settings";
import { readImage } from "../data/readImage";

const TABS = [
  { id: "profile", label: "My Profile" },
  { id: "personal", label: "Personal Information" },
  { id: "account", label: "Account Management" },
];

const FIELD =
  "w-full rounded-xl bg-[#111827] px-5 py-4 font-ui text-base text-white outline-none placeholder:text-[#7a8699] focus:ring-2 focus:ring-[#6b8ff5]";

function PencilIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Label({ children, htmlFor, onEdit, editLabel }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-4">
      <label htmlFor={htmlFor} className="font-ui text-base font-bold text-white">
        {children}
      </label>
      {onEdit && (
        <button
          type="button"
          onClick={onEdit}
          aria-label={editLabel}
          className="text-white transition-opacity hover:opacity-70"
        >
          <PencilIcon />
        </button>
      )}
    </div>
  );
}

function ProfileTab({ settings, update, onSaved }) {
  const bannerInput = useRef(null);
  const avatarInput = useRef(null);
  // Pictures are held here until Save, so nothing changes by accident.
  const [draft, setDraft] = useState({ banner: settings.banner, avatar: settings.avatar });
  const [busy, setBusy] = useState(false);
  const dirty = draft.banner !== settings.banner || draft.avatar !== settings.avatar;

  const pick = (input) => input.current?.click();
  const onFile = (key) => async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setBusy(true);
    try {
      // stored as a data URL; a blob: URL would be empty after a reload
      const image = await readImage(file, key === "banner" ? 1600 : 400);
      setDraft((prev) => ({ ...prev, [key]: image }));
    } catch {
      onSaved("That image could not be read");
    } finally {
      setBusy(false);
    }
  };

  const save = () => {
    if (update(draft)) onSaved("Profile saved");
    else onSaved("Could not save — your pictures may be too large");
  };

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-ui text-2xl font-bold text-white">My Profile</h1>
        <button
          type="button"
          onClick={save}
          disabled={!dirty || busy}
          className="rounded-full bg-[#2f6fed] px-10 py-3 font-ui text-base font-bold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? "Reading…" : "Save"}
        </button>
      </div>
      <div className="relative flex h-[290px] flex-col items-center justify-center overflow-hidden rounded-2xl bg-[#2a3448]">
        {draft.banner && (
          <>
            <img src={draft.banner} alt="" className="absolute inset-0 size-full object-cover" />
            <div className="absolute inset-0 bg-black/25" />
          </>
        )}
        <div className="relative text-center">
          <p className="font-ui text-2xl font-bold text-white">Change banner image</p>
          <p className="mt-2 font-ui text-base font-bold text-white">
            Recommended Dimension 1728 X 290pixels
          </p>
          <div className="mt-5 flex items-center justify-center gap-6">
            <button
              type="button"
              onClick={() => pick(bannerInput)}
              className="rounded-full bg-[#a855f7] px-7 py-2.5 font-ui text-base font-bold text-white hover:opacity-90"
            >
              Replace
            </button>
            <button
              type="button"
              onClick={() => setDraft((prev) => ({ ...prev, banner: null }))}
              className="font-ui text-base font-bold text-white hover:underline"
            >
              Remove
            </button>
          </div>
        </div>
        <input ref={bannerInput} type="file" accept="image/*" className="hidden" onChange={onFile("banner")} />
      </div>

      <div className="mt-16 flex flex-col items-center gap-6 pb-10">
        {draft.avatar ? (
          <img src={draft.avatar} alt="Your avatar" className="size-[104px] rounded-full object-cover" />
        ) : (
          <span className="flex size-[104px] items-center justify-center rounded-full bg-[#2f3a4f]">
            <svg viewBox="0 0 24 24" className="size-14 text-[#55648a]" fill="currentColor" aria-hidden="true">
              <path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10zm0 2c-4 0-8 2-8 5v1h16v-1c0-3-4-5-8-5z" />
            </svg>
          </span>
        )}

        <div className="flex flex-wrap items-center justify-center gap-4">
          {draft.avatar && (
            <button
              type="button"
              onClick={() => setDraft((prev) => ({ ...prev, avatar: null }))}
              className="flex items-center gap-2 rounded-full border-2 border-[#f2415f] px-7 py-3 font-ui text-base font-bold text-[#f2415f] hover:bg-[#f2415f]/10"
            >
              <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Remove Avatar
            </button>
          )}
          <button
            type="button"
            onClick={() => pick(avatarInput)}
            className="flex items-center gap-2 rounded-full border-2 border-white px-7 py-3 font-ui text-base font-bold text-white hover:bg-white/10"
          >
            <PencilIcon />
            Edit
          </button>
        </div>
        <input ref={avatarInput} type="file" accept="image/*" className="hidden" onChange={onFile("avatar")} />
      </div>
    </>
  );
}

function PersonalTab({ settings, update, onSaved }) {
  const [form, setForm] = useState({
    firstName: settings.firstName,
    lastName: settings.lastName,
    username: settings.username,
    dateOfBirth: settings.dateOfBirth,
    bio: settings.bio,
  });
  const set = (key) => (event) => setForm({ ...form, [key]: event.target.value });

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSaved(update(form) ? "Personal information saved" : "Could not save — please try again");
      }}
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-ui text-2xl font-bold text-white">Personal Informations</h1>
        <button
          type="submit"
          className="rounded-full bg-[#2f6fed] px-10 py-3 font-ui text-base font-bold text-white hover:opacity-90"
        >
          Save
        </button>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-x-10 gap-y-6 sm:grid-cols-2">
        <div>
          <Label htmlFor="firstName">First Name</Label>
          <input id="firstName" className={FIELD} value={form.firstName} onChange={set("firstName")} placeholder="Enter  first name" />
        </div>
        <div>
          <Label htmlFor="lastName">Last Name</Label>
          <input id="lastName" className={FIELD} value={form.lastName} onChange={set("lastName")} placeholder="Enter last name" />
        </div>
      </div>

      <div className="mt-6">
        <Label htmlFor="username" onEdit={() => document.getElementById("username")?.focus()} editLabel="Edit username">
          Username
        </Label>
        <input id="username" className={FIELD} value={form.username} onChange={set("username")} placeholder="@username" />
      </div>

      <div className="mt-6">
        <Label htmlFor="dateOfBirth">Date of Birth</Label>
        <div className="relative">
          <input
            id="dateOfBirth"
            type="date"
            className={`${FIELD} [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-5 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0`}
            value={form.dateOfBirth}
            onChange={set("dateOfBirth")}
          />
          <svg
            viewBox="0 0 24 24"
            className="pointer-events-none absolute right-5 top-1/2 size-5 -translate-y-1/2 text-white"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            aria-hidden="true"
          >
            <rect x="3" y="5" width="18" height="16" rx="2" />
            <path d="M3 10h18M8 3v4M16 3v4" />
          </svg>
        </div>
      </div>

      <div className="mt-6">
        <Label htmlFor="bio" onEdit={() => document.getElementById("bio")?.focus()} editLabel="Edit bio">
          Bio
        </Label>
        <textarea
          id="bio"
          rows={4}
          className={FIELD}
          value={form.bio}
          onChange={set("bio")}
          placeholder="Tell us a bit about yourself..."
        />
      </div>
    </form>
  );
}

function AccountTab({ settings, update, onSaved }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState(settings.email);
  const [passwords, setPasswords] = useState({ current: "", next: "", confirm: "" });
  const [error, setError] = useState("");

  const set = (key) => (event) => setPasswords({ ...passwords, [key]: event.target.value });

  const updatePassword = (event) => {
    event.preventDefault();
    if (!passwords.current || !passwords.next) {
      setError("Enter your current and new password.");
      return;
    }
    if (passwords.next !== passwords.confirm) {
      setError("New passwords do not match.");
      return;
    }
    setError("");
    setPasswords({ current: "", next: "", confirm: "" });
    update({ email });
    onSaved("Password updated");
  };

  return (
    <form onSubmit={updatePassword}>
      <h1 className="font-ui text-2xl font-bold text-white">Account Management</h1>

      <div className="mt-8">
        <Label htmlFor="email" onEdit={() => document.getElementById("email")?.focus()} editLabel="Edit email address">
          Email Address
        </Label>
        <input
          id="email"
          type="email"
          className={FIELD}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
        />
      </div>

      <div className="mt-10 flex flex-wrap items-center justify-between gap-4">
        <h2 className="font-ui text-2xl font-bold text-white">Change Password</h2>
        <button
          type="submit"
          className="rounded-full bg-[#2f6fed] px-10 py-3 font-ui text-base font-bold text-white hover:opacity-90"
        >
          Update
        </button>
      </div>

      <div className="mt-5 flex flex-col gap-5">
        <div>
          <Label htmlFor="current">Current password</Label>
          <input id="current" type="password" className={FIELD} value={passwords.current} onChange={set("current")} placeholder="Enter password" />
        </div>
        <div>
          <Label htmlFor="next">New password</Label>
          <input id="next" type="password" className={FIELD} value={passwords.next} onChange={set("next")} placeholder="Enter password" />
        </div>
        <div>
          <Label htmlFor="confirm">Confirm new password</Label>
          <input id="confirm" type="password" className={FIELD} value={passwords.confirm} onChange={set("confirm")} placeholder="Enter password" />
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-4 font-ui text-sm text-[#f2415f]">
          {error}
        </p>
      )}

      <div className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => {
            if (window.confirm("Delete your account? This cannot be undone.")) navigate("/");
          }}
          className="flex items-center justify-center gap-3 rounded-xl bg-[#111827] py-5 font-ui text-base font-bold text-[#f2415f] hover:bg-[#161f33]"
        >
          <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Delete Account
        </button>
        <button
          type="button"
          onClick={() => navigate("/signin")}
          className="flex items-center justify-center gap-3 rounded-xl bg-[#111827] py-5 font-ui text-base font-bold text-[#f2415f] hover:bg-[#161f33]"
        >
          <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Log out
        </button>
      </div>
    </form>
  );
}

export default function Settings() {
  const { tab = "profile" } = useParams();
  const [settings, setSettings] = useState(loadSettings);
  const [toast, setToast] = useState("");
  const [menuOpen, setMenuOpen] = useState(true);

  const update = (patch) => {
    const next = { ...settings, ...patch };
    const saved = saveSettings(next);
    if (saved) setSettings(next);
    return saved;
  };

  const onSaved = (message) => {
    setToast(message);
    setTimeout(() => setToast(""), 2500);
  };

  const active = TABS.some((t) => t.id === tab) ? tab : "profile";

  return (
    <div className="min-h-screen bg-[#1b2233]">
      <DashboardNav />

      <div className="flex justify-center border-b border-white/10 py-6">
        <Link
          to="/creators-hub"
          className="flex items-center gap-3 rounded-full bg-[#3ecf6a] px-8 py-3 font-ui text-lg font-bold text-white hover:opacity-90"
        >
          <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M19 12H5M11 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back to profile
        </Link>
      </div>

      <div className="mx-auto flex max-w-[1680px] flex-col gap-8 px-4 py-8 lg:flex-row lg:px-12">
        <nav aria-label="Settings" className="w-full shrink-0 lg:w-[290px]">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
            className="flex w-full items-center gap-3 rounded-xl bg-[#0d1424] px-5 py-4 font-ui text-lg font-bold text-white"
          >
            <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <circle cx="12" cy="12" r="3.2" />
              <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2V21a2 2 0 1 1-4 0v-.1A1.7 1.7 0 0 0 7 19.4a1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.7 1.7 0 0 0 3 14a1.7 1.7 0 0 0-1.6-1H1a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 3 7.6a1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.7 1.7 0 0 0 8 3.2V3a2 2 0 1 1 4 0v.1A1.7 1.7 0 0 0 14.6 5" />
            </svg>
            General Settings
            <span aria-hidden="true" className="ml-auto text-sm">▾</span>
          </button>

          {menuOpen && (
            <ul className="ml-6 mt-4 flex flex-col gap-2 border-l border-white/15">
              {TABS.map(({ id, label }) => {
                const isActive = id === active;
                return (
                  <li key={id} className="-ml-6">
                    <Link
                      to={`/settings/${id}`}
                      aria-current={isActive ? "page" : undefined}
                      className={`block rounded-xl py-4 pl-8 pr-4 font-ui text-base transition-colors ${
                        isActive
                          ? "border-l-4 border-[#f5f5f5] bg-[#a855f7] pl-7 font-bold text-white"
                          : "text-white hover:bg-white/5"
                      }`}
                    >
                      {label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </nav>

        <section className="min-h-[790px] flex-1 rounded-2xl bg-[#222c40] p-5 sm:p-10">
          {active === "profile" && (
            <ProfileTab settings={settings} update={update} onSaved={onSaved} />
          )}
          {active === "personal" && (
            <PersonalTab key="personal" settings={settings} update={update} onSaved={onSaved} />
          )}
          {active === "account" && (
            <AccountTab key="account" settings={settings} update={update} onSaved={onSaved} />
          )}
        </section>
      </div>

      {toast && (
        <p
          role="status"
          className="fixed bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-[#3ecf6a] px-6 py-3 font-ui text-base font-bold text-white shadow-lg"
        >
          {toast}
        </p>
      )}
    </div>
  );
}
