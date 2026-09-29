// Writing the newsletter: drafts, and seeing what one will look like.
//
// A draft is kept as blocks rather than as finished HTML, so the email is
// built at the moment it goes out and always lands in the current shell. The
// preview here renders the same way sending will, which is the point: what is
// on the screen is what will arrive.
//
// Sent issues are read-only. What went out cannot be edited, or the record of
// what people were sent stops being true.
import { z } from "zod";
import { desc, eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { newsletterIssues, users } from "../db/schema.js";
import { renderIssue, startingBlocks } from "../emails/issue.js";
import { requireAdmin } from "./admin.js";

// What a written block may hold. Anything else is refused rather than stored
// and quietly ignored at sending time.
const block = z.discriminatedUnion("type", [
  z.object({ type: z.literal("heading"), text: z.string().max(200).default("") }),
  z.object({ type: z.literal("text"), text: z.string().max(20_000).default("") }),
  z.object({
    type: z.literal("image"),
    url: z.string().max(2000).default(""),
    alt: z.string().max(300).default(""),
    href: z.string().max(2000).default(""),
  }),
  z.object({
    type: z.literal("button"),
    text: z.string().max(80).default(""),
    href: z.string().max(2000).default(""),
  }),
  z.object({ type: z.literal("divider") }),
]);

const writing = z.object({
  subject: z.string().max(200).optional(),
  preheader: z.string().max(200).optional(),
  blocks: z.array(block).max(200).optional(),
});

// The columns a list needs. The blocks themselves are left out: a list of
// twenty issues does not need twenty letters' worth of writing in it.
const summary = {
  id: newsletterIssues.id,
  subject: newsletterIssues.subject,
  preheader: newsletterIssues.preheader,
  status: newsletterIssues.status,
  sentAt: newsletterIssues.sentAt,
  sentCount: newsletterIssues.sentCount,
  failedCount: newsletterIssues.failedCount,
  createdAt: newsletterIssues.createdAt,
  updatedAt: newsletterIssues.updatedAt,
  author: users.username,
};

export default async function newsletterAdminRoutes(app) {
  app.get("/admin/newsletter/issues", { preHandler: requireAdmin() }, async () =>
    db
      .select(summary)
      .from(newsletterIssues)
      .leftJoin(users, eq(users.id, newsletterIssues.authorId))
      .orderBy(desc(newsletterIssues.createdAt))
      .limit(100)
  );

  app.post("/admin/newsletter/issues", { preHandler: requireAdmin() }, async (request, reply) => {
    const body = writing.parse(request.body ?? {});

    const [issue] = await db
      .insert(newsletterIssues)
      .values({
        subject: body.subject ?? "",
        preheader: body.preheader ?? "",
        // A new draft opens on something to type over, not on nothing.
        blocks: body.blocks ?? startingBlocks(),
        authorId: request.user.id,
      })
      .returning();

    return reply.code(201).send(issue);
  });

  app.get("/admin/newsletter/issues/:id", { preHandler: requireAdmin() }, async (request, reply) => {
    const [issue] = await db
      .select()
      .from(newsletterIssues)
      .where(eq(newsletterIssues.id, request.params.id))
      .limit(1);

    if (!issue) return reply.code(404).send({ error: "No such issue" });
    return issue;
  });

  app.patch("/admin/newsletter/issues/:id", { preHandler: requireAdmin() }, async (request, reply) => {
    const body = writing.parse(request.body ?? {});

    const [issue] = await db
      .select({ status: newsletterIssues.status })
      .from(newsletterIssues)
      .where(eq(newsletterIssues.id, request.params.id))
      .limit(1);

    if (!issue) return reply.code(404).send({ error: "No such issue" });
    if (issue.status !== "draft") {
      return reply
        .code(409)
        .send({ error: "This issue has already gone out, so it cannot be changed." });
    }

    const [saved] = await db
      .update(newsletterIssues)
      .set({
        ...(body.subject === undefined ? {} : { subject: body.subject }),
        ...(body.preheader === undefined ? {} : { preheader: body.preheader }),
        ...(body.blocks === undefined ? {} : { blocks: body.blocks }),
        updatedAt: new Date(),
      })
      .where(eq(newsletterIssues.id, request.params.id))
      .returning();

    return saved;
  });

  app.delete("/admin/newsletter/issues/:id", { preHandler: requireAdmin() }, async (request, reply) => {
    const [issue] = await db
      .select({ status: newsletterIssues.status })
      .from(newsletterIssues)
      .where(eq(newsletterIssues.id, request.params.id))
      .limit(1);

    if (!issue) return reply.code(404).send({ error: "No such issue" });
    // Throwing away a sent issue would throw away the record of what people
    // were sent, which is the one thing history is for.
    if (issue.status !== "draft") {
      return reply.code(409).send({ error: "A sent issue is kept as a record." });
    }

    await db.delete(newsletterIssues).where(eq(newsletterIssues.id, request.params.id));
    return { ok: true };
  });

  // What it will look like, rendered exactly as sending will render it. Takes
  // the writing rather than an id, so the editor can show unsaved changes.
  //
  // The unsubscribe link is a pretend one: a preview is not addressed to
  // anybody, and the real link is somebody's private key. It is here so the
  // footer that will appear is the footer being looked at.
  app.post("/admin/newsletter/preview", { preHandler: requireAdmin() }, async (request) => {
    const body = writing.parse(request.body ?? {});
    return renderIssue(
      { subject: body.subject, preheader: body.preheader, blocks: body.blocks ?? [] },
      { unsubscribeUrl: "https://www.vantaorigin.com/newsletter/unsubscribe?token=preview" }
    );
  });
}
