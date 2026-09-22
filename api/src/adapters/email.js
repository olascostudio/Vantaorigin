// Email behind one method: send({ to, subject, html }).
//
// "resend" posts to Resend's HTTP API — no SDK, so there is nothing to remove
// if we switch to SMTP or Postmark on a VPS. "console" prints the message,
// which is what local development uses.
import { config } from "../config.js";

const consoleMailer = {
  name: "console",
  async send({ to, subject, html }) {
    console.log(`\n--- email ---\nto: ${to}\nsubject: ${subject}\n${html}\n-------------\n`);
    return { id: "console" };
  },
};

const resendMailer = {
  name: "resend",
  async send({ to, subject, html }) {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: config.EMAIL_FROM, to, subject, html }),
    });

    if (!response.ok) {
      throw new Error(`Email failed (${response.status}): ${await response.text()}`);
    }
    return response.json();
  },
};

export const mailer = config.EMAIL_DRIVER === "resend" ? resendMailer : consoleMailer;
