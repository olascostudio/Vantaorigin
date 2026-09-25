// The messages themselves. Each returns { subject, html, text } — the plain
// version matters: an email with no text part is treated as more likely to be
// junk, and some people read their mail that way.
import { codeBlock, escape, link, p, shell, strong } from "./layout.js";

// Where creators can put their work forward for the network.
const SUBMIT_WORK = "https://forms.gle/etXJkqVVKKCmHSft6";

// "@name" reads oddly in a greeting.
const firstName = (user) =>
  (user?.firstName || "").trim() || (user?.username || "").replace(/^@/, "") || "there";

export function verificationEmail({ user, code, minutes }) {
  const name = firstName(user);
  const body = `
    ${p(`Hi ${escape(name)},`, { top: 0 })}
    ${p("To complete your action, please use the verification code below:")}
    ${codeBlock(code)}
    ${p(
      `This code will expire in ${strong(`${minutes} minutes`)} for security purposes. If you did not request this code, please ignore this email.`
    )}
    ${p("Stay secured,", { top: 34 })}
    ${p(strong("VantaOrigin Security Team."), { top: 2 })}
  `;

  return {
    subject: "Your VantaOrigin Verification Code",
    html: shell({ preview: `Your code is ${code}`, body }),
    text: [
      `Hi ${name},`,
      "",
      "To complete your action, please use the verification code below:",
      "",
      `    ${code}`,
      "",
      `This code will expire in ${minutes} minutes for security purposes. If you did not request this code, please ignore this email.`,
      "",
      "Stay secured,",
      "VantaOrigin Security Team.",
    ].join("\n"),
  };
}

export function resetEmail({ user, code, minutes }) {
  const name = firstName(user);
  const body = `
    ${p(`Hi ${escape(name)},`, { top: 0 })}
    ${p("Use the code below to set a new password on your VantaOrigin account:")}
    ${codeBlock(code)}
    ${p(
      `This code will expire in ${strong(`${minutes} minutes`)} for security purposes. If you did not ask to reset your password, ignore this email — your password stays as it is.`
    )}
    ${p("Stay secured,", { top: 34 })}
    ${p(strong("VantaOrigin Security Team."), { top: 2 })}
  `;

  return {
    subject: "Your VantaOrigin Password Reset Code",
    html: shell({ preview: `Your reset code is ${code}`, body }),
    text: [
      `Hi ${name},`,
      "",
      "Use the code below to set a new password on your VantaOrigin account:",
      "",
      `    ${code}`,
      "",
      `This code will expire in ${minutes} minutes. If you did not ask to reset your password, ignore this email — your password stays as it is.`,
      "",
      "Stay secured,",
      "VantaOrigin Security Team.",
    ].join("\n"),
  };
}

// The founder's letter, in his words. It asks for a reply, so it is sent with
// a reply-to that reaches a person.
export function welcomeEmail({ user }) {
  const name = firstName(user);
  const body = `
    ${p(`Hey ${escape(name)},`, { top: 0 })}
    ${p("Welcome to VantaOrigin!")}
    ${p("I'm Ola, the founder and leader of the VantaOrigin team.")}
    ${p(
      "I created VantaOrigin because I wanted creators to have a dedicated place to bring their characters and creative work together, instead of having everything scattered across different platforms."
    )}
    ${p("But there's a bigger reason behind it too.")}
    ${p(
      "I wanted to find a better way to create awareness around indie-created work and help more creators get discovered. We're building a growing network of creators and creative projects under one banner, giving indie creators another way to put their work in front of people who may discover, follow, support, or work with them."
    )}
    ${p(
      `If you'd like to be part of this network, you can submit your creative work for free ${link(
        "here",
        SUBMIT_WORK
      )}. You'll be able to tell us about your project, share your social media and shop links, Kickstarter or other project pages, and provide a description of your work.`
    )}
    ${p(
      "VantaOrigin gives you a place to create your own Realm, build character profiles, showcase your creative work, and share everything through one simple link."
    )}
    ${p(strong("Here are 3 things you can do to get started:"), { top: 26 })}
    <ol style="margin:10px 0 0;padding-left:22px;color:#e8ecf5;font-size:16px;line-height:1.7;">
      <li>Create your Realm</li>
      <li>Add your characters and build their profiles</li>
      <li>Share your Realm with your audience</li>
    </ol>
    ${p(
      "You can also explore other creators, discover their Realms, and find creative services through VantaOrigin Studios."
    )}
    ${p(
      `${strong("P.S.")} Why did you sign up for VantaOrigin? What are you hoping to create, showcase, or discover here? Just hit "Reply" and let me know. I'd genuinely love to hear from you.`,
      { top: 26 }
    )}
    ${p("Welcome to VantaOrigin,", { top: 30 })}
    ${p(`${strong("Ola")}<br />Founder &amp; Leader, VantaOrigin`, { top: 2 })}
  `;

  return {
    subject: "Welcome to VantaOrigin — Where Stories Become Realms",
    html: shell({
      preview: "A place for your characters, and one link to share them.",
      body,
    }),
    text: [
      `Hey ${name},`,
      "",
      "Welcome to VantaOrigin!",
      "",
      "I'm Ola, the founder and leader of the VantaOrigin team.",
      "",
      "I created VantaOrigin because I wanted creators to have a dedicated place to bring their characters and creative work together, instead of having everything scattered across different platforms.",
      "",
      "But there's a bigger reason behind it too.",
      "",
      "I wanted to find a better way to create awareness around indie-created work and help more creators get discovered. We're building a growing network of creators and creative projects under one banner, giving indie creators another way to put their work in front of people who may discover, follow, support, or work with them.",
      "",
      `If you'd like to be part of this network, you can submit your creative work for free here: ${SUBMIT_WORK}`,
      "You'll be able to tell us about your project, share your social media and shop links, Kickstarter or other project pages, and provide a description of your work.",
      "",
      "VantaOrigin gives you a place to create your own Realm, build character profiles, showcase your creative work, and share everything through one simple link.",
      "",
      "Here are 3 things you can do to get started:",
      "  1. Create your Realm",
      "  2. Add your characters and build their profiles",
      "  3. Share your Realm with your audience",
      "",
      "You can also explore other creators, discover their Realms, and find creative services through VantaOrigin Studios.",
      "",
      'P.S. Why did you sign up for VantaOrigin? What are you hoping to create, showcase, or discover here? Just hit "Reply" and let me know. I\'d genuinely love to hear from you.',
      "",
      "Welcome to VantaOrigin,",
      "Ola",
      "Founder & Leader, VantaOrigin",
    ].join("\n"),
  };
}
