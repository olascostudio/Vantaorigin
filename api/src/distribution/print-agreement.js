// What a print partner is agreeing to.
//
// Shown in full before they can make an account, because "the printer can
// only get access to signup when I send the invite link" is half the rule
// and this is the other half: an invitation is not consent, and somebody
// who has not read the terms has not agreed to them.
//
// Written to be read by a printer rather than by a lawyer. It is a plain
// statement of the working relationship, not a contract: the contract is
// whatever gets signed on paper, and this says so.
//
// Versioned by date. If any of this changes, the version changes with it and
// anybody who agreed to the old wording is asked again, because an
// acceptance of the old one does not say what the new one says.

export const AGREEMENT_VERSION = "2026-11-26";

export const AGREEMENT = {
  version: AGREEMENT_VERSION,
  title: "Printing for VantaOrigin",
  intro:
    "This is what working with us looks like, in plain terms. It is not the contract: anything binding is signed separately. Read it before you make an account.",
  sections: [
    {
      heading: "What we send you",
      points: [
        "A print ready file, the format and page count agreed for that book, and a delivery address.",
        "One job at a time. We do not hold stock, so nothing is printed before somebody has bought it.",
        "The quantity on the order, which is usually one copy and occasionally five.",
      ],
    },
    {
      heading: "What you tell us",
      points: [
        "Your price per copy for each format, at one copy and at five, and what packaging costs.",
        "When a quote changes. We price every book against your numbers, so a quote we do not know about is a book sold at the wrong price.",
        "Whether you can take a job, before you take it. A job you accept is one we tell the buyer is being printed.",
      ],
    },
    {
      heading: "What we pay",
      points: [
        "Your quoted cost per copy plus packaging, for every copy printed and collected.",
        "Paid after the buyer's inspection window closes, which is 48 hours from delivery.",
        "If a copy is misprinted and we agree it is a print fault, the reprint is at your cost. If the fault is in the file we sent, it is at ours.",
      ],
    },
    {
      heading: "The buyer's details",
      points: [
        "You see a name, an address and a phone number, because a parcel needs them.",
        "Use them for that delivery and nothing else. Do not keep them after the order is complete, do not add them to a mailing list, and do not pass them to anybody except the courier.",
        "This is the one term we will end the arrangement over.",
      ],
    },
    {
      heading: "Ending it",
      points: [
        "Either of us can stop at any time, with no notice and no penalty.",
        "Jobs already accepted get finished.",
        "Your past orders stay on record, because a buyer asking what happened to their book deserves an answer.",
      ],
    },
  ],
};
