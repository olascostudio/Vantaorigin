// Account settings now live with the account, on the API. The page holds the
// signed-in user from AuthContext and saves through here.
import { api } from "./api";
import { uploadImage } from "./character";

// Shape the Settings page works with.
export function toSettings(user) {
  return {
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
    username: user?.username || "",
    dateOfBirth: user?.dateOfBirth || "",
    bio: user?.bio || "",
    email: user?.email || "",
    avatar: user?.avatarUrl || null,
    banner: user?.bannerUrl || null,
  };
}

// Only the fields the API knows about, under its own names.
export function toProfilePatch(settings) {
  const patch = {};
  for (const key of ["firstName", "lastName", "username", "dateOfBirth", "bio"]) {
    if (settings[key] !== undefined) patch[key] = settings[key];
  }
  if (settings.avatar !== undefined) patch.avatarUrl = settings.avatar;
  if (settings.banner !== undefined) patch.bannerUrl = settings.banner;
  return patch;
}

export const uploadProfileImage = (file, kind) => uploadImage(file, kind);

export const changePassword = (currentPassword, password) =>
  api.post("/me/password", { currentPassword, password });

// Permanent: the account and everything filed under it are removed.
export const deleteAccount = (password) => api.delete("/me", { password });
