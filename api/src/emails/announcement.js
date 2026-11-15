// Why this one arrived.
//
// A service announcement is the only thing we send that nobody chose. It
// carries no unsubscribe link, because there is no list to leave: it goes
// to people because they hold an account. Somebody opening one has every
// right to wonder what it is and why they cannot stop it, and the worst
// answer is silence followed by a wall of text.
//
// So every announcement says, before anything else, what kind of thing it
// is and why it reached them. Said plainly and without apology: these are
// the messages we are obliged to send, and treating that as embarrassing
// is how it ends up buried in a footer nobody reads.
import { escape } from "./layout.js";
import {
  ACCOUNT_POLICY,
  DOWNTIME,
  PRIVACY_CHANGE,
  SECURITY_NOTICE,
  TERMS_CHANGE,
} from "../email-classes.js";

const WHY = {
  [TERMS_CHANGE]: "This is about a change to the terms that govern your VantaOrigin account.",
  [PRIVACY_CHANGE]: "This is about a change to how VantaOrigin handles your information.",
  [SECURITY_NOTICE]: "This is a security notice about your VantaOrigin account.",
  [DOWNTIME]: "This is about planned downtime on VantaOrigin.",
  [ACCOUNT_POLICY]: "This is about a change to the rules for VantaOrigin accounts.",
};

// Said once, at the top, in words rather than a label.
//
// The second sentence is the part people actually want: not what this is,
// but why they cannot make it stop. Answering it here is cheaper than
// answering it one reply at a time.
export const whyThisArrived = (reasonCategory) => {
  const what = WHY[reasonCategory];
  if (!what) return "";

  return `${what} You are receiving it because you have a VantaOrigin account, not because you joined anything, so there is nothing here to unsubscribe from.`;
};

// The same thing as a band across the top of the letter.
//
// Grey rather than red or amber. An announcement about a terms change is
// not an alarm, and a colour that says emergency on a maintenance notice
// teaches people to ignore the colour by the third one.
export const noticeBand = (reasonCategory) => {
  const words = whyThisArrived(reasonCategory);
  if (!words) return "";

  return `
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 26px;">
    <tr>
      <td style="background:#f4f5f7;border-left:4px solid #6b7585;border-radius:6px;padding:14px 18px;font-family:Helvetica,Arial,sans-serif;font-size:14px;line-height:1.6;color:#39435a;">
        ${escape(words)}
      </td>
    </tr>
  </table>`;
};
