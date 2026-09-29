// Puts the studio's portfolio where anything can read it.
//
// The marketplace draws itself from src/data/portfolio.json, which is bundled
// into the app and therefore invisible to a crawler. Copying it into public/
// publishes the same data at /portfolio.json, which is what the API reads to
// build the marketplace page for readers that cannot run the app.
//
// Copied at build time rather than committed twice, so there is one file to
// keep true and no chance of the two drifting apart.
import { copyFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const from = join(root, "src", "data", "portfolio.json");
const to = join(root, "public", "portfolio.json");

await mkdir(dirname(to), { recursive: true });
await copyFile(from, to);
console.log("Published portfolio.json for crawlers.");
