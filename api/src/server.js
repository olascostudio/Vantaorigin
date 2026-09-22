// Entry point. Applies any pending migrations, then listens. The same command
// runs on a laptop, on managed hosting and on a VPS.
import { buildApp } from "./app.js";
import { config } from "./config.js";
import { migrate } from "./db/migrate.js";
import { sql } from "./db/client.js";

const ran = await migrate();
if (ran.length) console.log(`Applied migrations: ${ran.join(", ")}`);

const app = await buildApp();

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, async () => {
    await app.close();
    await sql.end();
    process.exit(0);
  });
}

await app.listen({ port: config.PORT, host: config.HOST });
console.log(`API listening on http://localhost:${config.PORT}`);
