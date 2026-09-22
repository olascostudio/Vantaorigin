// Used by `npm run db:generate` to turn schema.js changes into a new .sql
// migration file. The files, not the tool, are what the database needs.
export default {
  schema: "./src/db/schema.js",
  out: "./migrations",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL || "" },
};
