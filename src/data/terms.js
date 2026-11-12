import { api } from "./api";

// Which terms are current, and whether this person has accepted them. Both
// are the server's to answer: the browser has no business deciding either.
export const currentTerms = () => api.get("/terms/current");

export const acceptTerms = (version) => api.post("/terms/accept", { version });
