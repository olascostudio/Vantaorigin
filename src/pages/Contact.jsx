import { useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";

const REASONS = [
  "General Inquiry",
  "Technical Support",
  "Account Issue",
  "Creator/Artist Application",
  "VantaOrigin Studios",
  "Payment or Service Issue",
  "Report an Issue",
  "Other",
];

const FIELD =
  "w-full rounded-xl border border-white/15 bg-[#2b3547] px-5 py-3.5 font-ui text-base text-white outline-none placeholder:text-neutral-400 focus:border-[#6b8ff5] focus:ring-2 focus:ring-[#6b8ff5]/40";

function Label({ htmlFor, children }) {
  return (
    <label htmlFor={htmlFor} className="mb-2 block font-ui text-base font-bold text-white">
      {children}
    </label>
  );
}

export default function Contact() {
  const [form, setForm] = useState({ name: "", email: "", reason: REASONS[0], message: "" });
  const [notice, setNotice] = useState("");

  const set = (key) => (event) => setForm({ ...form, [key]: event.target.value });

  // TODO(backend): submit this to the API — store the message and email it to
  // hello@vantaorigin.com. Until that exists, the form does not pretend to
  // send: it points the sender at the email address instead.
  const submit = (event) => {
    event.preventDefault();
    setNotice(
      "Sending from this form isn’t connected yet. Please email hello@vantaorigin.com and we’ll pick it up there."
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="mx-auto max-w-[760px] px-6 pb-24 pt-12 sm:pt-16">
        <h1 className="font-ui text-[34px] font-bold leading-tight text-white sm:text-[46px]">
          Contact VantaOrigin
        </h1>
        <p className="mt-4 font-ui text-lg leading-relaxed text-neutral-200 sm:text-xl">
          Have a question, found an issue, or need help with something? Send us a message and we’ll
          get back to you.
        </p>

        <form className="mt-10 flex flex-col gap-6" onSubmit={submit}>
          <div>
            <Label htmlFor="name">Name</Label>
            <input
              id="name"
              className={FIELD}
              value={form.name}
              onChange={set("name")}
              placeholder="Enter your name"
              required
            />
          </div>

          <div>
            <Label htmlFor="email">Email</Label>
            <input
              id="email"
              type="email"
              className={FIELD}
              value={form.email}
              onChange={set("email")}
              placeholder="Enter your email address"
              required
            />
          </div>

          <div>
            <Label htmlFor="reason">Reason for contacting us</Label>
            <select
              id="reason"
              value={form.reason}
              onChange={set("reason")}
              className={`${FIELD} cursor-pointer appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22white%22 stroke-width=%222%22><path d=%22M6 9l6 6 6-6%22/></svg>')] bg-[length:22px] bg-[right_1.25rem_center] bg-no-repeat pr-12`}
            >
              {REASONS.map((reason) => (
                <option key={reason} value={reason} className="bg-[#2b3547]">
                  {reason}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="message">Message</Label>
            <textarea
              id="message"
              rows={7}
              className={`${FIELD} resize-y leading-relaxed`}
              value={form.message}
              onChange={set("message")}
              placeholder="Tell us how we can help..."
              required
            />
          </div>

          <button
            type="submit"
            className="self-start rounded-full bg-gradient-to-r from-[#c2185b] to-[#a855f7] px-10 py-3.5 font-ui text-lg font-bold text-white transition-opacity hover:opacity-90"
          >
            Send Message
          </button>

          {notice && (
            <p role="alert" className="font-ui text-base leading-relaxed text-[#ffb4c4]">
              {notice}
            </p>
          )}
        </form>

        <section className="mt-14 rounded-2xl border border-white/10 bg-[#222b3c] p-6 sm:p-8">
          <h2 className="font-ui text-xl font-bold text-white">Prefer email?</h2>
          <p className="mt-2 font-ui text-base leading-relaxed text-neutral-200">
            You can also reach the VantaOrigin team directly at{" "}
            <a
              href="mailto:hello@vantaorigin.com"
              className="font-bold text-primary hover:underline"
            >
              hello@vantaorigin.com
            </a>
            .
          </p>
          <p className="mt-4 font-ui text-base leading-relaxed text-neutral-300">
            We aim to respond to support and general inquiries as soon as possible. Response times
            may vary depending on the type of request.
          </p>
        </section>

        <section className="mt-8 flex flex-col gap-4 rounded-2xl border border-[#465578] bg-[#252f46] p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div>
            <h2 className="font-ui text-xl font-bold text-white">Looking for a quick answer?</h2>
            <p className="mt-2 font-ui text-base leading-relaxed text-neutral-200">
              Check the VantaOrigin Help Center for answers to common questions.
            </p>
          </div>

          <Link
            to="/help"
            className="shrink-0 rounded-full border-2 border-white px-7 py-3 font-ui text-base font-bold text-white transition-colors hover:bg-white/10"
          >
            Visit Help Center →
          </Link>
        </section>

        <div className="mt-12 flex flex-wrap gap-6">
          <Link to="/terms" className="font-ui text-lg font-bold text-[#6b8ff5] hover:underline">
            Terms of Service
          </Link>
          <Link to="/privacy" className="font-ui text-lg font-bold text-[#6b8ff5] hover:underline">
            Privacy Policy
          </Link>
          <Link to="/about" className="font-ui text-lg font-bold text-[#6b8ff5] hover:underline">
            About VantaOrigin
          </Link>
        </div>
      </main>
    </div>
  );
}
