import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";

// Same shape as the Terms page: a string is a paragraph, an array is a list.
const UPDATED = "24 September 2026";

const SECTIONS = [
  {
    title: "1. Information we collect",
    body: [
      "Depending on how you use VantaOrigin, we may collect:",
      [
        "Your name or display name",
        "Email address",
        "Username and account information",
        "Profile information",
        "Realm information",
        "Character information and creative content you upload",
        "Information related to services you request or purchase",
        "Communications you send to us",
        "Information required to provide, secure, and maintain your account",
      ],
      "We may also collect technical information needed to operate and secure the platform, such as login activity, device information, IP addresses, and security logs. What we collect depends on how VantaOrigin is configured and the services we use to run it.",
    ],
  },
  {
    title: "2. How we use your information",
    body: [
      "We use your information to:",
      [
        "Create and manage your VantaOrigin account",
        "Provide and maintain VantaOrigin services",
        "Let you create and manage your Realm and characters",
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
    title: "3. The VantaOrigin creator newsletter",
    body: [
      "We run a free newsletter for people who want updates and creative opportunities from the platform. It may include creator projects, featured work, platform updates, creator resources, and opportunities or services.",
      "We use your email address for these messages when you have subscribed, or otherwise given permission where that is required.",
      "You can unsubscribe at any time using the link in any of those emails.",
      "Some emails are necessary to run your account and are separate from the newsletter: account notifications, security messages, service-related messages, and important changes to our services.",
    ],
  },
  {
    title: "4. Public and private information",
    body: [
      "You decide what creative content you make public.",
      "Anything you publish publicly, such as a public Realm or character profile, may be seen by other visitors and may be indexed or shared outside VantaOrigin.",
      "Private content is not intended to be displayed publicly. Creators are responsible for understanding what they choose to publish.",
    ],
  },
  {
    title: "5. VantaOrigin Studios and services",
    body: [
      "When you use VantaOrigin Studios or request creative services, we may process the information needed to manage the project: your contact details, project requirements, service details, communications, contracts, invoices, and anything else needed to coordinate the work.",
      "Where relevant, project information may be shared with the vetted creator or specialist providing the service.",
    ],
  },
  {
    title: "6. Payments and service transactions",
    body: [
      "For services arranged through VantaOrigin, payments may be managed through contracts and invoices.",
      "Where VantaOrigin manages a transaction, funds may be held by VantaOrigin while the agreed service is completed, according to the applicable contract.",
      "Payment and transaction information may be kept where needed for accounting, dispute resolution, fraud prevention, legal obligations, and records of completed transactions. What we store depends on the payment method and providers used.",
    ],
  },
  {
    title: "7. Account security",
    body: [
      "We take reasonable technical and organisational measures to protect accounts and personal information from unauthorised access, loss, misuse, alteration, or disclosure.",
      "These may include authentication controls, access controls, encryption, monitoring, security logging, and backups. The specific measures may change as VantaOrigin develops.",
      "No online service can guarantee absolute security.",
    ],
  },
  {
    title: "8. Information sharing",
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
    title: "9. Account deletion and how long we keep data",
    body: [
      "You can ask us to delete your VantaOrigin account.",
      "When an account is deleted, we begin the deletion process and remove or anonymise information we no longer have a legitimate reason to keep.",
      "For security, fraud prevention, dispute resolution, legal obligations, and lawful requests from authorities, certain account and transaction records may be kept for up to 14 days after deletion.",
      "After that period, the information is deleted or anonymised, unless a longer period is required or permitted by law. Some transaction, contractual, accounting, or legal records may need to be kept longer where the law requires it, or where they are needed to establish, exercise, or defend legal claims.",
    ],
  },
  {
    title: "10. Your privacy rights",
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
    title: "11. Cookies and similar technologies",
    body: [
      "We may use cookies, local storage, analytics tools, or similar technologies to run the platform, remember preferences, keep you signed in, understand how the platform is used, and improve security and performance.",
      "The specific technologies may change as VantaOrigin develops. Where required, we will provide appropriate choices or notices about non-essential cookies.",
    ],
  },
  {
    title: "12. Third-party services",
    body: [
      "We rely on third-party services for things like hosting, email delivery, authentication, storage, analytics, security, and payments. These providers may process information on our behalf to provide their services.",
      "Where appropriate, we take reasonable steps to ensure providers handle information in line with applicable privacy and security requirements.",
    ],
  },
  {
    title: "13. International data transfers",
    body: [
      "Some of our service providers may operate or store information in countries other than the one you live in.",
      "Where personal information is transferred internationally, we take the steps required by applicable data protection laws.",
    ],
  },
  {
    title: "14. Children's privacy",
    body: [
      "VantaOrigin is intended for people aged 18 or over. We do not knowingly allow anyone under 18 to create or keep an account.",
      "If we become aware that an account belongs to someone under that age, we may suspend or remove the account and delete the information associated with it where appropriate.",
    ],
  },
  {
    title: "15. Changes to this Privacy Policy",
    body: [
      "We may update this policy as VantaOrigin develops, adds services, or changes how information is processed.",
      "When we make significant changes, we may give additional notice where appropriate. The latest version is always available here.",
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

        {SECTIONS.map(({ title, body }) => (
          <section key={title} className="mt-10">
            <h2 className="font-ui text-xl font-bold text-white sm:text-2xl">{title}</h2>
            <div className="mt-3 flex flex-col gap-3 font-ui text-lg leading-relaxed text-neutral-200">
              {body.map((item, index) => (
                <Paragraph key={index} item={item} />
              ))}
            </div>
          </section>
        ))}

        <section className="mt-10">
          <h2 className="font-ui text-xl font-bold text-white sm:text-2xl">16. Contact us</h2>
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
