import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";

// Everything here describes what VantaOrigin actually does today. Where a
// feature isn't built yet, the answer says so rather than describing it as if
// it were: a help centre that over-promises creates support tickets.
const SECTIONS = [
  {
    title: "Getting started",
    items: [
      {
        q: "What is VantaOrigin?",
        a: [
          "VantaOrigin is a platform built for creators to give their characters and creative work a home.",
          "You create character profiles, organise them into categories, publish the ones you want people to see, and share them. You can also browse other creators' work and find creative services through VantaOrigin Studios.",
        ],
      },
      {
        q: "How do I create an account?",
        a: [
          "Choose Sign up, then enter a username, your email address and a password of at least 8 characters, and confirm that you are 18 or over.",
          "We email you a 4-digit code. Enter it on the next screen to verify your email. The code lasts 15 minutes, allows five attempts, and can be resent.",
          "You are signed in as soon as the account is created, so you can start straight away and verify afterwards. Staying signed in lasts 30 days on that device.",
        ],
      },
    ],
  },
  {
    title: "Realms and characters",
    items: [
      {
        q: "What is a Realm?",
        a: [
          "Your Realm is your space on VantaOrigin: the Creator's Hub, where your categories, characters and highlights live.",
          "A single public link for a whole Realm isn't live yet. Today each published character has its own page that you can share, and published characters appear on the Discovery page.",
        ],
      },
      {
        q: "How do I add a character?",
        a: [
          "In Creator's Hub, open the Character tab. Create a category first — one per comic, book or project — then choose Add Character inside it.",
          "You'll be asked for a name, then a cover image, origin story (up to 800 characters), the universe they belong to and a tagline. All of these are needed before the character can be saved, because they all appear on the character card.",
          "Your creator name is filled in from your username automatically.",
        ],
      },
      {
        q: "Can I edit a character after creating it?",
        a: [
          "Yes. Open the character and click any field to edit it: name, universe, tagline, origin story, abilities, stats and notes.",
          "Changes save on their own about a second after you stop typing, and the page tells you when it last saved. There is no separate publish step for edits.",
        ],
      },
      {
        q: "What's the difference between a private and a public character?",
        a: [
          "A private character is visible only to you. A public one appears on the Discovery page and can be opened by anyone with its link.",
          "When you create a character you're asked: “Would you like to keep this character private or publish it publicly so it can appear on the Discovery page?”",
          "You can change your mind at any time using the Public/Private switch at the top of the character's edit page. Changes take effect immediately.",
        ],
      },
      {
        q: "Why isn't my character on Discovery?",
        a: [
          "Check that the switch on its edit page is set to Public. Private characters never appear there.",
          "Publishing is immediate — there's no review queue or waiting period. Discovery shows the most recent published characters, up to 24 at a time.",
          "If it's public and still missing, contact support.",
        ],
      },
    ],
  },
  {
    title: "Images and uploads",
    items: [
      {
        q: "What files can I upload?",
        a: [
          "JPEG, PNG, WebP and GIF images, up to 8MB each. That covers cover art, character artwork, story backgrounds, your avatar and your profile banner.",
          "Uploads are stored on Cloudflare R2 and served from there, so they load quickly and aren't tied to the device you uploaded from.",
        ],
      },
      {
        q: "My image won't upload.",
        a: [
          "Check the format and that it's under 8MB. Very large photos straight from a camera are the usual cause.",
          "If an upload fails, the page tells you rather than failing silently. If it keeps happening, contact support and mention what you were uploading.",
        ],
      },
    ],
  },
  {
    title: "Account and security",
    items: [
      {
        q: "What can I change in my settings?",
        a: [
          "Your first and last name, username, date of birth, bio, profile picture and banner. Profile pictures and banners are saved when you press Save.",
          "Your email address is shown in Account Management but can't be changed yet. Contact support if you need it changed.",
        ],
      },
      {
        q: "I forgot my password.",
        a: [
          "Choose “Forgot Password?” on the login screen and enter your email address. We send a 4-digit code that lasts 15 minutes and allows five attempts.",
          "Enter the code, then choose a new password of at least 8 characters. Resetting signs you out everywhere, so anyone using your account on another device is signed out too.",
          "For security, the reset screen gives the same response whether or not an email address has an account, so it can't be used to find out who is registered.",
        ],
      },
      {
        q: "How do I change my password while signed in?",
        a: [
          "Settings → Account Management. You need your current password to set a new one.",
        ],
      },
      {
        q: "How does VantaOrigin protect my account?",
        a: [
          "Passwords are stored as argon2id hashes — we never store the password itself, and can't see it.",
          "Signing in creates a session token that's kept in a cookie your browser's scripts can't read, and only a hashed version is stored in our database, so a stolen database copy can't be replayed as a login.",
          "All traffic runs over HTTPS, and every request that touches your characters checks that they belong to you.",
          "Two-factor authentication isn't available yet.",
        ],
      },
      {
        q: "I can't log in.",
        a: [
          "Check the email address and password. For security we give the same message whether the email is unknown or the password is wrong, so it's worth trying the reset flow if you're unsure.",
          "There's no account lockout, so repeated attempts won't lock you out, though very rapid attempts are rate-limited.",
        ],
      },
      {
        q: "How do I delete my account?",
        a: [
          "Settings → Account Management → Delete Account. You'll be asked to confirm, then to enter your password.",
          "Deletion is permanent and takes everything with it: your categories, characters, artwork and highlight posts. Published characters disappear from Discovery straight away.",
          "After deletion starts, some information may remain briefly for security, fraud prevention, dispute resolution and legal obligations. Our general retention period is 14 days, unless something must be kept longer under legal, contractual or accounting requirements.",
        ],
      },
    ],
  },
  {
    title: "VantaOrigin Studios",
    items: [
      {
        q: "What is VantaOrigin Studios?",
        a: [
          "The creative services side of VantaOrigin: vetted artists and specialists who can help bring a project to life, across more than character illustration.",
          "The Marketplace shows the studio's portfolio, organised into the same categories as our ArtStation albums and updated automatically as new work is posted.",
        ],
      },
      {
        q: "How do I request a service?",
        a: [
          "Browse the Marketplace, then use Project Request to tell us about your project. It opens a form where you describe what you need.",
          "We follow up by email to agree scope, timing and price before any work starts.",
        ],
      },
      {
        q: "How do payments and invoices work?",
        a: [
          "Payments aren't handled on the platform yet. Projects are arranged by email and contract, with invoicing outside VantaOrigin for now.",
          "When on-platform payments arrive, the terms, price and deliverables will be shown before you pay. Refunds follow the policy in our Terms of Service.",
        ],
      },
      {
        q: "Something went wrong with a project.",
        a: [
          "Contact support with the project details. We may review the project, contract, messages and deliverables to work out the right next step.",
        ],
      },
    ],
  },
  {
    title: "Content rules",
    items: [
      {
        q: "What can I publish?",
        a: [
          "Your own creative work, characters and projects, or work you're authorised to represent. You're responsible for what you upload.",
          "Nothing that breaks our Terms of Service or infringes someone else's rights.",
        ],
      },
      {
        q: "Can I publish AI-assisted work?",
        a: [
          "Yes, when it's used responsibly and you have the right to publish the result.",
          "AI must not be used to copy another creator's work or misrepresent ownership. Mass-produced or low-effort AI content may be limited or removed.",
        ],
      },
      {
        q: "Can I publish adult creative content?",
        a: [
          "VantaOrigin is an 18+ platform and may support lawful adult creative work, subject to our content rules and applicable law.",
        ],
      },
      {
        q: "Can I upload someone else's artwork?",
        a: [
          "Only if you have the right to use it. Copyright infringement or passing off another creator's work as your own can lead to removal or account action.",
        ],
      },
    ],
  },
  {
    title: "Email",
    items: [
      {
        q: "I didn't receive an email from VantaOrigin.",
        a: [
          "Check your spam folder and that the address you entered is right.",
          "While we finish verifying our sending domain, verification and reset emails only reach a limited set of addresses. If you're expecting a code and nothing arrives, email hello@vantaorigin.com and we'll verify your account manually.",
          "Codes last 15 minutes. If yours has expired, request a new one — the old code stops working as soon as a new one is sent.",
        ],
      },
    ],
  },
];

export default function Help() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="mx-auto max-w-[820px] px-6 pb-24 pt-12 sm:pt-16">
        <h1 className="font-ui text-[34px] font-bold leading-tight text-white sm:text-[46px]">
          Help Center
        </h1>
        <p className="mt-4 font-ui text-lg leading-relaxed text-neutral-200 sm:text-xl">
          Quick answers about your account, characters, Discovery, VantaOrigin Studios and common
          problems.
        </p>

        {/* Jump list: the page is long enough to want one */}
        <nav aria-label="Topics" className="mt-8 flex flex-wrap gap-3">
          {SECTIONS.map(({ title }) => (
            <a
              key={title}
              href={`#${title.toLowerCase().replace(/[^a-z]+/g, "-")}`}
              className="rounded-full border border-white/20 px-4 py-2 font-ui text-sm text-white transition-colors hover:border-[#6b8ff5] hover:bg-white/5"
            >
              {title}
            </a>
          ))}
        </nav>

        {SECTIONS.map(({ title, items }) => (
          <section key={title} id={title.toLowerCase().replace(/[^a-z]+/g, "-")} className="mt-12 scroll-mt-24">
            <h2 className="font-ui text-2xl font-bold text-white sm:text-[28px]">{title}</h2>

            <div className="mt-5 flex flex-col gap-4">
              {items.map(({ q, a }) => (
                <details
                  key={q}
                  className="group rounded-2xl border border-white/10 bg-[#222b3c] px-5 py-4 open:border-[#6b8ff5]/50 sm:px-6"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-ui text-lg font-bold text-white marker:hidden">
                    {q}
                    <span
                      aria-hidden="true"
                      className="shrink-0 font-ui text-xl text-[#6b8ff5] transition-transform group-open:rotate-45"
                    >
                      +
                    </span>
                  </summary>
                  <div className="mt-4 flex flex-col gap-3 font-ui text-base leading-relaxed text-neutral-200 sm:text-lg">
                    {a.map((paragraph) => (
                      <p key={paragraph}>{paragraph}</p>
                    ))}
                  </div>
                </details>
              ))}
            </div>
          </section>
        ))}

        <section className="mt-14 rounded-2xl border border-[#465578] bg-[#252f46] p-6 sm:p-8">
          <h2 className="font-ui text-xl font-bold text-white">Still need help?</h2>
          <p className="mt-2 font-ui text-base leading-relaxed text-neutral-200">
            If you can't find the answer here, contact the VantaOrigin team at{" "}
            <a href="mailto:hello@vantaorigin.com" className="font-bold text-primary hover:underline">
              hello@vantaorigin.com
            </a>
            , or send us a message.
          </p>
          <Link
            to="/contact"
            className="mt-5 inline-block rounded-full bg-gradient-to-r from-[#c2185b] to-[#a855f7] px-8 py-3 font-ui text-base font-bold text-white transition-opacity hover:opacity-90"
          >
            Contact Us
          </Link>
        </section>
      </main>
    </div>
  );
}
