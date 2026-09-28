// Entry point. Applies any pending migrations, then listens. The same command
// runs on a laptop, on managed hosting and on a VPS.
import { buildApp } from "./app.js";
import { config, isProduction } from "./config.js";
import { migrate } from "./db/migrate.js";
import { endConnection } from "./db/client.js";
import { startKeepAwake } from "./keep-awake.js";

const ran = await migrate();
if (ran.length) console.log(`Applied migrations: ${ran.join(", ")}`);

const app = await buildApp();

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, async () => {
    await app.close();
    await endConnection();
    process.exit(0);
  });
}

await app.listen({ port: config.PORT, host: config.HOST });
console.log(`API listening on http://localhost:${config.PORT}`);

// Only where the host actually sleeps; locally there is nothing to keep up.
startKeepAwake({ url: config.API_PUBLIC_URL, enabled: isProduction });
