import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import { usePageMeta } from "../data/pageMeta";

// Same shape as the Terms page: a string is a paragraph, an array is a list.
const UPDATED = "14 November 2026";

const SECTIONS = [
  {
    title: "Information we collect",
    body: [
      "Depending on how you use VantaOrigin, we may collect:",
      [
        "Your name or display name",
        "Email address",
        "Username and account information",
        "Profile information",
        "Page information",
        "Character information and creative content you upload",
        "Information related to services you request or purchase",
        "Communications you send to us",
        "Information required to provide, secure, and maintain your account",
        "Which creators you have subscribed to, and the date you subscribed to each",
      ],
      "We may also collect technical information needed to operate and secure the platform, such as login activity, device information, IP addresses, and security logs. What we collect depends on how VantaOrigin is configured and the services we use to run it.",
    ],
  },
  {
    title: "How we use your information",
    body: [
      "We use your information to:",
      [
        "Create and manage your VantaOrigin account",
        "Provide and maintain VantaOrigin services",
        "Let you create and manage your page and characters",
        "Display information you choose to make public",
        "Provide customer support",
        "Communicate with you about your account and services",
        "Process and manage services purchased through VantaOrigin",
        "Protect accounts and the platform from unauthorised access, fraud, and abuse",
        "Improve and maintain the platform",
        "Meet legal and contractual obligations",
        "Respond to lawful requests from authorities when required",
      ],
    ],
  },
  {
    title: "The VantaOrigin creator newsletter",
    body: [
      "We run a free newsletter for people who want updates and creative opportunities from the platform. It may include creator projects, featured work, platform updates, creator resources, and opportunities or services.",
      "We use your email address for these messages when you have subscribed, or otherwise given permission where that is required.",
      "You can unsubscribe at any time using the link in any of those emails.",
      "Some emails are necessary to run your account and are separate from the newsletter: account notifications, security messages, service-related messages, and important changes to our services.",
    ],
  },
  {
    title: "Subscribing to a creator",
    body: [
      "Creators on VantaOrigin have their own pages, and you can subscribe to one. This is separate from the VantaOrigin creator newsletter described above, and subscribing to one creator is not subscribing to any other.",
      "When you subscribe to a creator, we share two things with that creator: your email address, and the date you subscribed. We do so because that is the point of subscribing, so that they can write to you about their work. We record the date you agreed and the network address you agreed from, so that there is a record of your consent for each creator separately.",
      "Creators can see that information in their own dashboard and can download it as a file. Nobody else gets it.",
      "You can unsubscribe at any time. Every email a creator sends through VantaOrigin carries an unsubscribe link, and you can also unsubscribe from the creator's page while signed in. Unsubscribing stops the creator from reaching you through us, and removes you from the list they can download in future.",
      "There is one limit we want to state plainly rather than leave you to discover. Once a creator has downloaded their subscriber list, that copy is in their hands and not in ours. If you unsubscribe, or ask us to delete your data, we can remove our records and stop the creator reaching you through VantaOrigin, but we cannot reach into a file they already saved. If you want a creator to delete a copy they hold, contact us and we will pass the request on, and you can also contact the creator directly.",
    ],
  },
  {
    title: "If you are a creator with subscribers",
    body: [
      "When someone subscribes to you, you are given their email address so you can write to them. That makes you responsible for how you use it, and these rules are part of the agreement you accept by using the feature:",
      [
        "Write to subscribers about your own creative work, and nothing else",
        "Include a way to unsubscribe in every message you send them",
        "Act on an unsubscribe request promptly, whoever it reaches first",
        "Never sell, rent, trade, or pass a subscriber list to anybody else",
        "Never use a list from VantaOrigin to send anything you were not given it for",
        "Follow the laws that apply to you and to the people you are writing to",
      ],
      "If you break these rules we may remove your access to subscriber information, suspend the feature for your account, or remove the account. We may also act on a report from a subscriber.",
      "You are responsible for keeping any list you download safe, and for deleting it when you no longer need it.",
    ],
  },
  {
    title: "Public and private information",
    body: [
      "You decide what creative content you make public.",
      "Anything you publish publicly, such as a public page or character profile, may be seen by other visitors and may be indexed or shared outside VantaOrigin.",
      "Private content is not intended to be displayed publicly. Creators are responsible for understanding what they choose to publish.",
    ],
  },
  {
    title: "VantaOrigin Studios and services",
    body: [
      "When you use VantaOrigin Studios or request creative services, we may process the information needed to manage the project: your contact details, project requirements, service details, communications, contracts, invoices, and anything else needed to coordinate the work.",
      "Where relevant, project information may be shared with the vetted creator or specialist providing the service.",
    ],
  },
  {
    title: "Payments and service transactions",
    body: [
      "For services arranged through VantaOrigin, payments may be managed through contracts and invoices.",
      "Where VantaOrigin manages a transaction, funds may be held by VantaOrigin while the agreed service is completed, according to the applicable contract.",
      "Payment and transaction information may be kept where needed for accounting, dispute resolution, fraud prevention, legal obligations, and records of completed transactions. What we store depends on the payment method and providers used.",
    ],
  },
  {
    title: "Account security",
    body: [
      "We take reasonable technical and organisational measures to protect accounts and personal information from unauthorised access, loss, misuse, alteration, or disclosure.",
      "These may include authentication controls, access controls, encryption, monitoring, security logging, and backups. The specific measures may change as VantaOrigin develops.",
      "No online service can guarantee absolute security.",
    ],
  },
  {
    title: "Information sharing",
    body: [
      "VantaOrigin does not sell your personal information.",
      "We share information only where it is needed to operate VantaOrigin, provide services you asked for, process transactions, maintain security, or comply with the law. Depending on the service, that may include:",
      [
        "Service providers that help us operate the platform",
        "Payment or financial service providers",
        "Email and communication providers",
        "Hosting, storage, security, analytics, or technical providers",
        "VantaOrigin Studios creators or specialists, when needed to provide a service you requested",
        "Law enforcement or government authorities, where we are legally required to respond",
      ],
    ],
  },
  {
    title: "Account deletion and how long we keep data",
    body: [
      "You can ask us to delete your VantaOrigin account.",
      "When an account is deleted, we begin the deletion process and remove or anonymise information we no longer have a legitimate reason to keep.",
      "For security, fraud prevention, dispute resolution, legal obligations, and lawful requests from authorities, certain account and transaction records may be kept for up to 14 days after deletion.",
      "After that period, the information is deleted or anonymised, unless a longer period is required or permitted by law. Some transaction, contractual, accounting, or legal records may need to be kept longer where the law requires it, or where they are needed to establish, exercise, or defend legal claims.",
      "Subscriptions to a creator are kept for as long as you are subscribed. When you unsubscribe we keep the record that you subscribed and then unsubscribed, including the dates, because that record is the evidence of what you agreed to and when you changed your mind, and deleting it would leave us unable to answer a question about either. It is no longer used to send you anything. If you delete your account, these records go with it.",
    ],
  },
  {
    title: "Your privacy rights",
    body: [
      "Depending on where you live, you may have rights over your personal information, including the right to:",
      [
        "Request access to your personal information",
        "Request correction of inaccurate information",
        "Request deletion of your information",
        "Request that we restrict certain processing",
        "Object to certain uses of your information",
        "Withdraw consent where processing is based on consent",
        "Request a copy of certain information in a portable format",
      ],
      "These rights may have exceptions or limits under applicable law. To make a request, email hello@vantaorigin.com. We may need to verify your identity first.",
    ],
  },
  {
    title: "Cookies and similar technologies",
    body: [
      "We keep this small, and here is the whole of it.",
      [
        "A session cookie, so that you stay signed in. Removing it signs you out.",
        "Your browser remembers that you closed the beta notice, so it does not come back on every page.",
        "If you press Subscribe before signing in, your browser remembers which creator you meant, so we can finish it once you are signed in. It is forgotten when you close the tab.",
      ],
      "We do not use advertising cookies, and we do not track you across other websites.",
    ],
  },
  {
    title: "Third-party services",
    body: [
      "Some companies handle information on our behalf so that VantaOrigin can run. These are the ones we use:",
      [
        "Resend, which delivers our email",
        "Cloudflare R2, which stores uploaded images",
        "Our hosting and database providers, which run the site and hold its records",
        "Google, if you choose to sign in with a Google account",
      ],
      "We do not currently use any analytics or error tracking service. If that changes, we will name the provider here before we start.",
      "These providers handle information only to do the job we use them for, and we take reasonable steps to check they handle it in line with applicable privacy and security requirements.",
    ],
  },
  {
    title: "The laws that apply, and why we are allowed to hold your information",
    body: [
      "VantaOrigin is run from Nigeria and used by people in many countries, so more than one set of rules can apply. In plain language:",
      [
        "Nigeria's Data Protection Act applies to us, as a Nigerian service",
        "If you are in the UK or the European Economic Area, the GDPR gives you rights over your information, and this policy describes how to use them",
        "CAN-SPAM and similar rules govern the email we send, which is why every newsletter and every creator update carries a way to unsubscribe",
      ],
      "We hold and use your information for a small number of reasons. Because you asked us to, which covers the newsletter and subscribing to a creator, and which you can withdraw at any time. Because it is needed to give you the service you signed up for, which covers your account and the emails about it. Because we have to, where a law requires us to keep something. And because we have a legitimate interest in keeping the platform secure and working.",
      "Withdrawing consent stops future sending. It does not undo what was already sent, and where a creator has already downloaded a list, the limit described earlier applies.",
    ],
  },
  {
    title: "International data transfers",
    body: [
      "Some of our service providers may operate or store information in countries other than the one you live in.",
      "Where personal information is transferred internationally, we take the steps required by applicable data protection laws.",
    ],
  },
  {
    title: "Children's privacy",
    body: [
      "VantaOrigin is intended for people aged 18 or over. We do not knowingly allow anyone under 18 to create or keep an account.",
      "If we become aware that an account belongs to someone under that age, we may suspend or remove the account and delete the information associated with it where appropriate.",
    ],
  },
  {
    title: "Changes to this Privacy Policy",
    body: [
      "We may update this policy as VantaOrigin develops, adds services, or changes how information is processed.",
      "When a change materially affects how we handle your information, we will tell you about it rather than leaving you to notice. That means an email to the address on your account, or a notice in the app, before the change takes effect where we can. The latest version is always available here, with the date it was last updated at the top.",
    ],
  },
];

function Paragraph({ item }) {
  if (Array.isArray(item)) {
    return (
      <ul className="flex flex-col gap-2 pl-1">
        {item.map((line) => (
          <li key={line} className="flex gap-3">
            <span aria-hidden="true" className="text-[#ff8fc7]">
              ✦
            </span>
            {line}
          </li>
        ))}
      </ul>
    );
  }
  return <p>{item}</p>;
}

export default function Privacy() {
  usePageMeta({
    title: "Privacy Policy",
    description: "What VantaOrigin collects, why, and what you can ask us to do with it.",
    canonicalPath: "/privacy",
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="mx-auto max-w-[820px] px-6 pb-24 pt-12 sm:pt-16">
        <h1 className="font-ui text-[34px] font-bold leading-tight text-white sm:text-[46px]">
          Privacy Policy
        </h1>
        <p className="mt-3 font-ui text-base text-neutral-400">Last updated: {UPDATED}</p>

        <div className="mt-6 flex flex-col gap-4 font-ui text-lg leading-relaxed text-neutral-200">
          <p>
            VantaOrigin respects your privacy and is committed to protecting the personal
            information you give us when you use the platform.
          </p>
          <p>
            This policy explains what we collect, how we use it, how we protect it, and how long we
            keep it. By creating an account or using VantaOrigin, you acknowledge the practices
            described here.
          </p>
        </div>

        {SECTIONS.map(({ title, body }, index) => (
          <section key={title} className="mt-10">
            <h2 className="font-ui text-xl font-bold text-white sm:text-2xl">
              {index + 1}. {title}
            </h2>
            <div className="mt-3 flex flex-col gap-3 font-ui text-lg leading-relaxed text-neutral-200">
              {body.map((item, index) => (
                <Paragraph key={index} item={item} />
              ))}
            </div>
          </section>
        ))}

        <section className="mt-10">
          {/* Counted from the list above rather than written in. It said 16
              while the list had grown past that, so the page ended with a
              section number it had already used. */}
          <h2 className="font-ui text-xl font-bold text-white sm:text-2xl">
            {SECTIONS.length + 1}. Contact us
          </h2>
          <p className="mt-3 font-ui text-lg leading-relaxed text-neutral-200">
            Questions about this policy, your personal information, or how we handle your data?
            Email{" "}
            <a href="mailto:hello@vantaorigin.com" className="font-bold text-primary hover:underline">
              hello@vantaorigin.com
            </a>
            .
          </p>
        </section>

        <div className="mt-14 flex flex-wrap gap-6">
          <Link to="/terms" className="font-ui text-lg font-bold text-[#6b8ff5] hover:underline">
            Terms of Service
          </Link>
          <Link to="/about" className="font-ui text-lg font-bold text-[#6b8ff5] hover:underline">
            About VantaOrigin
          </Link>
        </div>
      </main>
    </div>
  );
}
