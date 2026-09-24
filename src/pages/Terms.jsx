import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";

// Kept as data so the wording stays easy to edit without touching layout.
// A paragraph is a string; a list is an array.
const UPDATED = "24 September 2026";

const SECTIONS = [
  {
    title: "1. Eligibility",
    body: [
      "VantaOrigin is an adult-only platform. You must be at least 18 years old to create an account or use our services.",
      "By registering, you confirm that you meet this age requirement and that the information you provide is accurate.",
      "We may suspend or terminate accounts where we reasonably believe the user does not meet our age requirement.",
    ],
  },
  {
    title: "2. Your account",
    body: [
      "You are responsible for maintaining the security of your account and for activity carried out through it.",
      "You must not:",
      [
        "Impersonate another person or creator.",
        "Provide false information about your identity or projects.",
        "Share or sell access to your account.",
        "Use VantaOrigin for fraudulent, abusive, or unlawful activity.",
        "Attempt to interfere with or compromise the platform.",
      ],
      "We reserve the right to suspend or terminate accounts that violate these Terms.",
    ],
  },
  {
    title: "3. Creator content",
    body: [
      "VantaOrigin allows creators to create Realms, upload characters, showcase creative projects, and share related creative work.",
      "You remain responsible for the content you upload. You must have the necessary rights or permissions to upload and display anything you publish on VantaOrigin.",
      "You may only publish content relating to your own creative projects or projects you are authorised to represent.",
      "By uploading content, you grant VantaOrigin the limited permission necessary to host, display, distribute, and operate that content as part of the VantaOrigin platform and its features.",
      "You retain ownership of your original creative work unless you separately agree otherwise through a contract or other written agreement.",
    ],
  },
  {
    title: "4. Copyright and intellectual property",
    body: [
      "VantaOrigin does not permit copyright infringement or the unauthorised use of another person's creative work.",
      "You must not upload, publish, or represent another person's artwork, characters, writing, designs, or other protected work as your own.",
      "If we verify that an account has deliberately stolen or misrepresented another creator's work, we may suspend or permanently terminate that account. Repeated or serious infringement may result in permanent removal from VantaOrigin.",
      "VantaOrigin and its licensors retain ownership of the VantaOrigin name, logo, branding, software, platform design, marketplace systems, and other VantaOrigin-owned intellectual property. You may not copy, reproduce, modify, or commercially exploit it without permission.",
    ],
  },
  {
    title: "5. AI-assisted content",
    body: [
      "VantaOrigin permits responsible use of AI-assisted creative work where the user has the right to use and publish the resulting content.",
      "AI tools must not be used to impersonate other creators, steal or reproduce another creator's work, misrepresent ownership, or otherwise violate these Terms.",
      "We may remove accounts or content where AI-generated or AI-assisted material is used in a way that violates our rules, and we may limit or remove excessive low-effort, repetitive, or mass-produced AI-generated content that harms the quality and discoverability of the platform.",
      "Our goal is to maintain space for genuine creative work and meaningful creator projects.",
    ],
  },
  {
    title: "6. Adult and sensitive creative content",
    body: [
      "VantaOrigin is an 18+ platform and permits creators to publish lawful adult-oriented creative artwork within the limits of applicable law and VantaOrigin's content rules.",
      "Creators remain responsible for ensuring that their content is lawful and appropriately represented on the platform.",
      "Nothing in this section permits illegal, exploitative, or otherwise prohibited material.",
    ],
  },
  {
    title: "7. Platform content rules",
    body: [
      "VantaOrigin is primarily a platform for creators to showcase and manage their creative projects. It is not intended to function as a general social media feed.",
      "Users must not use VantaOrigin primarily for:",
      [
        "Political campaigning or political posting.",
        "Personal status updates or unrelated regular social posts.",
        "Live-streaming or live image feeds.",
        "Spam or unrelated promotional content.",
        "Content unrelated to their creative projects.",
        "Harassment, abuse, fraud, or other prohibited activity.",
      ],
      "Content that does not fit the purpose of VantaOrigin may be removed, and accounts that repeatedly misuse the platform may be suspended or terminated.",
    ],
  },
  {
    title: "8. Public and private content",
    body: [
      "Creators may control whether certain characters or creative content remain private or are made public.",
      "Public content may be displayed through VantaOrigin's discovery features and other public areas of the platform.",
      "Creators are responsible for checking the visibility settings of their content before publishing it.",
    ],
  },
  {
    title: "9. VantaOrigin Studios",
    body: [
      "VantaOrigin Studios is VantaOrigin's network of vetted creative professionals working together under the VantaOrigin brand. Studios and artists may collaborate, share resources, and work together on larger creative projects.",
      "Where work is arranged through VantaOrigin Studios, we may use contracts, defined deliverables, pricing, and project-management processes to establish expectations between the parties. VantaOrigin may manage projects and coordinate participating creators to help maintain consistent delivery.",
      "Specific project terms, deliverables, prices, timelines, ownership rights, and other obligations may be governed by a separate contract or project agreement.",
    ],
  },
  {
    title: "10. Marketplace and payments",
    body: [
      "Where VantaOrigin facilitates a paid creative service, the applicable service terms, price, deliverables, and payment conditions will be presented before the transaction is completed.",
      "Users are responsible for reviewing the relevant project or service terms before making a payment. Additional terms may apply to specific marketplace transactions or contracts.",
    ],
  },
  {
    title: "11. Refund policy",
    body: [
      "For eligible VantaOrigin purchases, users may request a refund in accordance with the applicable service or transaction terms.",
      "Where a refund is approved, the user will receive 80% of the eligible payment. The remaining 20% is retained to cover platform, management, processing, and administrative costs.",
      "Refund requests submitted more than 24 hours after the applicable transaction, unless otherwise required by applicable law or an applicable project agreement, may not be eligible for a refund. Certain services may have additional refund conditions disclosed before purchase.",
      "Nothing in this policy limits any rights that cannot legally be excluded or restricted under applicable law.",
    ],
  },
  {
    title: "12. Account suspension and termination",
    body: [
      "VantaOrigin may suspend, restrict, or terminate an account where we reasonably determine that the user has:",
      [
        "Violated these Terms.",
        "Infringed another person's intellectual property.",
        "Uploaded prohibited or unlawful content.",
        "Used the platform fraudulently or abusively.",
        "Misused VantaOrigin's services.",
        "Repeatedly published content outside the purpose of the platform.",
        "Attempted to compromise the security or operation of VantaOrigin.",
      ],
      "Serious violations may result in immediate and permanent account termination.",
    ],
  },
  {
    title: "13. Disclaimer",
    body: [
      "VantaOrigin provides a platform for creators and creative projects. We do not guarantee that the platform will always be available, uninterrupted, or free from errors.",
      "Creators are responsible for the content they publish and the rights associated with that content. VantaOrigin is not responsible for how users choose to access, share, or distribute publicly available content outside the platform.",
      "Because VantaOrigin is an 18+ service, users are responsible for managing access to their own devices, accounts, and environments appropriately. Parents and guardians are responsible for supervising minors in their care and preventing unauthorised access to age-restricted services.",
    ],
  },
  {
    title: "14. Platform changes",
    body: [
      "VantaOrigin may add, remove, modify, or discontinue features and services as the platform develops.",
      "We may also update these Terms when necessary to reflect changes to the platform, our services, or applicable requirements.",
    ],
  },
  {
    title: "15. Changes to these Terms",
    body: [
      "When we make significant changes to these Terms, we may provide notice through the platform or other appropriate means.",
      "Your continued use of VantaOrigin after updated Terms take effect means that you accept the revised Terms.",
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

export default function Terms() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="mx-auto max-w-[820px] px-6 pb-24 pt-12 sm:pt-16">
        <h1 className="font-ui text-[34px] font-bold leading-tight text-white sm:text-[46px]">
          Terms of Service
        </h1>
        <p className="mt-3 font-ui text-base text-neutral-400">Last updated: {UPDATED}</p>

        <div className="mt-6 flex flex-col gap-4 font-ui text-lg leading-relaxed text-neutral-200">
          <p>
            These Terms govern your access to and use of VantaOrigin, including our website,
            creator tools, Realms, character profiles, discovery features, VantaOrigin Studios,
            marketplace services, and related services.
          </p>
          <p>
            By creating an account or using VantaOrigin, you agree to these Terms. If you do not
            agree with them, you must not use the platform.
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
          <h2 className="font-ui text-xl font-bold text-white sm:text-2xl">16. Contact</h2>
          <p className="mt-3 font-ui text-lg leading-relaxed text-neutral-200">
            For questions, concerns, reports, or requests relating to these Terms, contact{" "}
            <a href="mailto:hello@vantaorigin.com" className="font-bold text-primary hover:underline">
              hello@vantaorigin.com
            </a>
            .
          </p>
        </section>

        <section className="mt-10">
          <h2 className="font-ui text-xl font-bold text-white sm:text-2xl">17. Acceptance</h2>
          <p className="mt-3 font-ui text-lg leading-relaxed text-neutral-200">
            By creating an account or using VantaOrigin, you acknowledge that you have read,
            understood, and agreed to these Terms of Service.
          </p>
        </section>

        <div className="mt-14">
          <Link
            to="/about"
            className="font-ui text-lg font-bold text-[#6b8ff5] hover:underline"
          >
            About VantaOrigin
          </Link>
        </div>
      </main>
    </div>
  );
}
