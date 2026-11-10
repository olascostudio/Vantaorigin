import { api } from "./api";

// A line from somebody using the site. Open to anyone, signed in or not:
// during a beta the message worth having often comes from the person who
// looked, found it confusing and left without making an account.
export const sendFeedback = ({ message, email = "", page = "" }) =>
  api.post("/feedback", { message, email, page });
