// Account settings, stored locally until there's an API.

export const SETTINGS_KEY = "vantaorigin:settings";

export const DEFAULT_SETTINGS = {
  banner: null,
  avatar: null,
  firstName: "",
  lastName: "",
  username: "@josephmaroon001",
  dateOfBirth: "",
  bio: "",
  email: "josephmaroon677@gmail.com",
};

export function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

// Rough size of the saved settings, so the UI can warn before the browser
// refuses a write (localStorage is about 5MB per site).
export function settingsSize(settings) {
  return JSON.stringify(settings).length;
}

export function saveSettings(settings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    return true;
  } catch {
    return false;
  }
}
