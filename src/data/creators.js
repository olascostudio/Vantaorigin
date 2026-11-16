// Everybody with something published, for the browse page.
import { api } from "./api";

// The stored handle carries its own @, which is right for reading and wrong
// for a URL. Both forms come from here so no caller has to remember.
export const handleOf = (username) => String(username || "").replace(/^@+/, "");

export async function loadPublicCreators(limit = 60) {
  const rows = await api.get(`/public/creators?limit=${limit}`);
  return rows.map((row) => ({
    username: row.username,
    handle: handleOf(row.username),
    name: row.name,
    bio: row.bio || "",
    avatarUrl: row.avatarUrl,
    published: row.published || 0,
    characters: row.characters || [],
  }));
}
