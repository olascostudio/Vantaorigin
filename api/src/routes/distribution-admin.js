// The costs the price floor is built from, and somewhere to type them.
//
// This exists because of a gap rather than a feature: when a printer finally
// quotes us, there is nowhere to put the number. Everything downstream, the
// floor, what a creator may charge, what anybody earns, is computed from
// these three tables, and until now they could only be filled in by hand
// written SQL.
//
// Admin only, by the same gate as the rest of the admin. Nothing here is
// reachable by a creator: these are the numbers their prices are judged
// against, and a creator who could edit them could price below cost.
import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "../db/client.js";
import {
  bookFormats,
  countries,
  deliveryRates,
  distributionSettings,
  printerCosts,
  printers,
} from "../db/schema.js";
import { requireAdmin } from "./admin.js";
import { GATEWAY_FEES, quote } from "../distribution/pricing.js";

// Money arrives as a string of whole minor units. Not a number, because a
// JSON number is a float and these are kobo; not a decimal of naira,
// because somebody would eventually send 1.1 and get 110 kobo back.
const minorUnits = z
  .string()
  .trim()
  .regex(/^\d{1,15}$/, "Give an amount in whole kobo or pence, digits only")
  .transform(Number);

const bandBody = z.object({
  printerId: z.string().uuid(),
  formatSlug: z.string().min(1),
  minQuantity: z.coerce.number().int().min(1),
  unitCostMinor: minorUnits,
  packagingMinor: minorUnits.optional(),
  perPageMinor: minorUnits.optional(),
  // The point of the screen: a real quote stops being a placeholder.
  isPlaceholder: z.boolean().optional(),
  notes: z.string().max(500).optional(),
});

const rateBody = z.object({
  parcelCostMinor: minorUnits,
  extraCopyMinor: minorUnits.optional(),
  estDaysMin: z.coerce.number().int().min(0),
  estDaysMax: z.coerce.number().int().min(0),
  courier: z.string().max(120).nullish(),
  isPlaceholder: z.boolean().optional(),
});

export default async function distributionAdminRoutes(app) {
  // Everything the screen needs, in one request. Separate calls would show
  // the page half filled while somebody is trying to read a floor off it.
  app.get("/admin/distribution/rates", { preHandler: requireAdmin() }, async () => {
    const [formats, places, shops, bands, rates, settings] = await Promise.all([
      db.select().from(bookFormats).orderBy(asc(bookFormats.position)),
      db.select().from(countries).orderBy(asc(countries.code)),
      db.select().from(printers).orderBy(asc(printers.name)),
      db
        .select()
        .from(printerCosts)
        .orderBy(asc(printerCosts.formatSlug), asc(printerCosts.minQuantity)),
      db
        .select()
        .from(deliveryRates)
        .orderBy(asc(deliveryRates.countryCode), asc(deliveryRates.region)),
      db.select().from(distributionSettings),
    ]);

    const asNumbers = Object.fromEntries(settings.map((row) => [row.key, row.value]));

    return {
      formats,
      countries: places,
      printers: shops,
      printerCosts: bands,
      deliveryRates: rates,
      settings: {
        platformFeeBps: Number(asNumbers.platform_fee_bps ?? 1000),
        inspectionWindowHours: Number(asNumbers.inspection_window_hours ?? 48),
      },
      // So the screen can say which numbers are still guesses without
      // working it out again in the browser.
      gatewayFees: Object.fromEntries(
        Object.entries(GATEWAY_FEES).map(([name, rule]) => [name, { ...rule }])
      ),
      placeholders: {
        printerCosts: bands.filter((b) => b.isPlaceholder).length,
        deliveryRates: rates.filter((r) => r.isPlaceholder).length,
      },
    };
  });

  // What a quote would mean, before anybody saves it.
  //
  // The whole reason the screen is worth having: type a printer's number and
  // watch the lowest sellable price move. It runs the real engine, so what
  // it shows and what the checkout will later charge cannot drift apart.
  app.post("/admin/distribution/preview", { preHandler: requireAdmin() }, async (request, reply) => {
    const body = z
      .object({
        formatSlug: z.string().min(1),
        countryCode: z.string().length(2),
        region: z.string().nullish(),
        pageCount: z.coerce.number().int().min(1),
        quantity: z.coerce.number().int().min(1).max(100),
        retailMinor: minorUnits.nullish(),
      })
      .safeParse(request.body ?? {});

    if (!body.success) {
      return reply.code(400).send({ error: body.error.issues[0]?.message ?? "Check those numbers" });
    }

    const { formatSlug, countryCode, region, pageCount, quantity, retailMinor } = body.data;

    const [place] = await db.select().from(countries).where(eq(countries.code, countryCode)).limit(1);
    if (!place) return reply.code(404).send({ error: `We have no country ${countryCode}` });

    const bands = await db
      .select()
      .from(printerCosts)
      .where(eq(printerCosts.formatSlug, formatSlug));

    const rates = await db
      .select()
      .from(deliveryRates)
      .where(eq(deliveryRates.countryCode, countryCode));

    // A named region wins over the country's catch-all.
    const rate =
      rates.find((r) => region && r.region === region) ?? rates.find((r) => !r.region) ?? null;

    if (!bands.length) {
      return reply.code(409).send({ error: `No printer has quoted for ${formatSlug} yet` });
    }
    if (!rate) {
      return reply.code(409).send({ error: `No delivery rate for ${countryCode} yet` });
    }

    const [{ value: feeBps } = { value: "1000" }] = await db
      .select()
      .from(distributionSettings)
      .where(eq(distributionSettings.key, "platform_fee_bps"))
      .limit(1);

    try {
      return quote({
        bands,
        rate,
        pageCount,
        quantity,
        provider: place.paymentProvider,
        currency: place.currency,
        platformFeeBps: Number(feeBps),
        retailMinor: retailMinor ?? null,
      });
    } catch (error) {
      // A bad combination is the admin's answer, not a crash: they are
      // feeling out what a quote would mean.
      return reply.code(409).send({ error: error.message });
    }
  });

  app.post("/admin/distribution/printers", { preHandler: requireAdmin() }, async (request, reply) => {
    const body = z
      .object({
        name: z.string().trim().min(1).max(120),
        countryCode: z.string().length(2),
        contactEmail: z.string().email().nullish(),
        contactPhone: z.string().max(40).nullish(),
        notes: z.string().max(500).nullish(),
      })
      .safeParse(request.body ?? {});

    if (!body.success) {
      return reply.code(400).send({ error: body.error.issues[0]?.message ?? "Check those details" });
    }

    const [place] = await db
      .select()
      .from(countries)
      .where(eq(countries.code, body.data.countryCode))
      .limit(1);
    if (!place) return reply.code(404).send({ error: `We have no country ${body.data.countryCode}` });

    const [made] = await db.insert(printers).values(body.data).returning();
    return reply.code(201).send(made);
  });

  app.post("/admin/distribution/printer-costs", { preHandler: requireAdmin() }, async (request, reply) => {
    const body = bandBody.safeParse(request.body ?? {});
    if (!body.success) {
      return reply.code(400).send({ error: body.error.issues[0]?.message ?? "Check those numbers" });
    }

    const [format] = await db
      .select()
      .from(bookFormats)
      .where(eq(bookFormats.slug, body.data.formatSlug))
      .limit(1);
    if (!format) return reply.code(404).send({ error: `We have no format ${body.data.formatSlug}` });

    // One band per printer per format per step, so saving the same step
    // twice corrects it rather than quietly making a second one the lookup
    // might pick instead.
    const [existing] = await db
      .select()
      .from(printerCosts)
      .where(
        and(
          eq(printerCosts.printerId, body.data.printerId),
          eq(printerCosts.formatSlug, body.data.formatSlug),
          eq(printerCosts.minQuantity, body.data.minQuantity)
        )
      )
      .limit(1);

    // A quote date belongs to a real quote and to nothing else. Setting it
    // without ever clearing it left rows saying both things at once: a band
    // marked a placeholder, carrying the date it was quoted on, which is the
    // one question this table exists to answer.
    const values = { ...body.data, updatedAt: new Date() };
    if (body.data.isPlaceholder === false) values.quotedAt = new Date();
    if (body.data.isPlaceholder === true) values.quotedAt = null;

    if (existing) {
      const [updated] = await db
        .update(printerCosts)
        .set(values)
        .where(eq(printerCosts.id, existing.id))
        .returning();
      return updated;
    }

    const [made] = await db.insert(printerCosts).values(values).returning();
    return reply.code(201).send(made);
  });

  app.patch("/admin/distribution/delivery-rates/:id", { preHandler: requireAdmin() }, async (request, reply) => {
    const body = rateBody.partial().safeParse(request.body ?? {});
    if (!body.success) {
      return reply.code(400).send({ error: body.error.issues[0]?.message ?? "Check those numbers" });
    }

    const next = { ...body.data, updatedAt: new Date() };
    if (next.estDaysMin !== undefined && next.estDaysMax !== undefined && next.estDaysMax < next.estDaysMin) {
      return reply.code(400).send({ error: "The longest delivery cannot be shorter than the shortest" });
    }

    const [updated] = await db
      .update(deliveryRates)
      .set(next)
      .where(eq(deliveryRates.id, request.params.id))
      .returning();

    if (!updated) return reply.code(404).send({ error: "No such delivery rate" });
    return updated;
  });

  app.post("/admin/distribution/delivery-rates", { preHandler: requireAdmin() }, async (request, reply) => {
    const body = rateBody
      .extend({ countryCode: z.string().length(2), region: z.string().max(120).nullish() })
      .safeParse(request.body ?? {});

    if (!body.success) {
      return reply.code(400).send({ error: body.error.issues[0]?.message ?? "Check those numbers" });
    }
    if (body.data.estDaysMax < body.data.estDaysMin) {
      return reply.code(400).send({ error: "The longest delivery cannot be shorter than the shortest" });
    }

    const [made] = await db.insert(deliveryRates).values(body.data).returning();
    return reply.code(201).send(made);
  });

  // The one number that is entirely ours rather than somebody else's.
  app.patch("/admin/distribution/settings", { preHandler: requireAdmin() }, async (request, reply) => {
    const body = z
      .object({
        platformFeeBps: z.coerce.number().int().min(0).max(5000).optional(),
        inspectionWindowHours: z.coerce.number().int().min(1).max(720).optional(),
      })
      .safeParse(request.body ?? {});

    if (!body.success) {
      return reply.code(400).send({ error: body.error.issues[0]?.message ?? "Check those numbers" });
    }

    const writes = [];
    if (body.data.platformFeeBps !== undefined) {
      writes.push(["platform_fee_bps", String(body.data.platformFeeBps)]);
    }
    if (body.data.inspectionWindowHours !== undefined) {
      writes.push(["inspection_window_hours", String(body.data.inspectionWindowHours)]);
    }

    for (const [key, value] of writes) {
      await db
        .insert(distributionSettings)
        .values({ key, value, updatedAt: new Date() })
        .onConflictDoUpdate({ target: distributionSettings.key, set: { value, updatedAt: new Date() } });
    }

    const rows = await db.select().from(distributionSettings);
    const map = Object.fromEntries(rows.map((row) => [row.key, row.value]));
    return {
      platformFeeBps: Number(map.platform_fee_bps ?? 1000),
      inspectionWindowHours: Number(map.inspection_window_hours ?? 48),
    };
  });
}
