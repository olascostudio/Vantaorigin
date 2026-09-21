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

export function saveSettings(settings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    return true;
  } catch {
    return false;
  }
}
