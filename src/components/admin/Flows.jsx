// The three journeys through Distribution, on the screen that runs it.
//
// Laid out as flows rather than as parts, because a list of working parts
// does not tell you whether anybody can get from one end to the other.
// Drawing them out is what found the holes: a work that publishes against a
// guessed cost, and an order with no shop on it.
//
// Every step carries its real state, and there are three of those, not two.
// "Built the old way" is the one that matters: the step exists and runs, but
// it was built to a plan we have since changed, so counting it as working
// would be a lie of exactly the kind this screen is meant to prevent.
import { CARD, INK, BODY, MUTED } from "../AdminShell";

const STATE = {
  done: { label: "works", chip: "bg-[#e8f3ec] text-[#1c5b34]" },
  changes: { label: "built the old way", chip: "bg-[#fdf3e3] text-[#7a4d08]" },
  missing: { label: "not built", chip: "bg-[#f1f2f4] text-[#5a6474]" },
};

const LEGEND = {
  done: "runs, and matches the plan",
  changes: "runs, but was built to the old plan",
  missing: "nothing there yet",
};

// What the buyer pays = what the creator keeps + the printer's charge + our
// share + delivery. The creator's take is the input and the buyer's total is
// the output, which is the whole change: there is no floor to enforce,
// because a creator cannot price below a cost they never pay.
const FLOWS = [
  {
    id: "creator",
    who: "A creator",
    line: "Anybody signed up on vantaorigin.com. No invitation, no second account.",
    tint: "#6a28a8",
    steps: [
      {
        does: "Signs up on vantaorigin.com",
        state: "done",
        note: "The ordinary account. Nothing extra to be granted.",
      },
      {
        does: "Opens Creator Studio from their profile",
        state: "changes",
        note: "Behind an admin invitation today, which was the wrong model. It becomes an entry on their own profile, open to everyone signed up.",
      },
      {
        does: "Sees their status",
        state: "missing",
        note: "What they have listed, what has sold, what they are owed. The numbers are in the ledger already; no screen shows a creator their own.",
      },
      {
        does: "Adds a work",
        state: "changes",
        note: "Worded for books only, and the page bounds are ours rather than the shop's. It has to read as any printed creative work, and let a printer say what it can actually bind.",
      },
      {
        does: "Picks a format from the list",
        state: "done",
        note: "A fixed catalogue, which is the right call: a free trim size cannot be compared between shops, because no two would have priced the same one. Three formats are seeded and the list needs widening to the sizes people actually use.",
      },
      {
        does: "Picks the paper",
        state: "missing",
        note: "Colour already comes with the format, so the only thing left is stock. A short fixed list, for the same reason the sizes are fixed.",
      },
      {
        does: "Uploads the print file",
        state: "missing",
        note: "The table for it exists and nothing writes to it. Until this lands, a printer gets a job with nothing to print.",
      },
      {
        does: "Sets what they want to keep, per country",
        state: "changes",
        note: "Built the other way round: the number they type today is the buyer's price before delivery, and their own share is whatever is left of it. It becomes their take instead, in each country's currency.",
      },
      {
        does: "Sees the buyer's final price as they type",
        state: "changes",
        note: "Most of it is already there. Printing, delivery, the card fee, our share and what they keep are itemised per country and move on every keystroke. What is missing is the buyer's total as a line of its own, and the range across shops once a buyer can pick one.",
      },
      {
        does: "Signs the rights warranty",
        state: "done",
        note: "That the work is theirs to sell. A version string and a timestamp are stored, so a change of wording asks again. The wording itself lives only in the page's own markup, which means what a given version said is recoverable from git history and nowhere else.",
      },
      {
        does: "Puts it on sale",
        state: "changes",
        note: "Runs, but publishes works whose costs are still guesses, so the link can go out dead. Found today, not yet fixed.",
      },
      {
        does: "Takes the embed links",
        state: "missing",
        note: "One for their whole store, one per work, both for a developer to style. Nothing produces either.",
      },
      {
        does: "Gets paid",
        state: "missing",
        note: "Their share is written to the ledger the moment an order is placed. Nothing pays it out.",
      },
    ],
  },
  {
    id: "printer",
    who: "A print partner",
    line: "A shop you invited. There could be a hundred in Nigeria alone, and a buyer picks between them.",
    tint: "#a35a00",
    steps: [
      {
        does: "Gets an invitation from you",
        state: "done",
        note: "One link, to one shop, lasting 14 days, working once.",
      },
      {
        does: "Reads the agreement",
        state: "done",
        note: "The whole thing on the page. The signup form does not appear until it has been opened.",
      },
      {
        does: "Makes an account for the shop",
        state: "done",
        note: "Recorded with the version of the agreement they accepted. An account made the ordinary way is not a printer account.",
      },
      {
        does: "Says where the shop is",
        state: "missing",
        note: "A buyer picks the nearest printer, so a shop with no location cannot be offered to anybody.",
      },
      {
        does: "Ticks the formats it can print",
        state: "missing",
        note: "The catalogue stays ours, which is what makes two shops comparable at all. A printer says which of those it does, and is only ever offered those.",
      },
      {
        does: "Says the page range it can bind",
        state: "missing",
        note: "Where the page limits belong. A shop that cannot bind past 200 pages says so, and a longer work simply shows fewer shops rather than being refused by us.",
      },
      {
        does: "Says which papers it stocks",
        state: "missing",
        note: "A shop that cannot do the stock a work asks for must never be offered it.",
      },
      {
        does: "Sets a price per page",
        state: "changes",
        note: "You type their quote in by hand now, against our formats, in bands at one and five copies. The engine takes a per page figure and no screen has a field for one, so it is always zero. They should set it themselves: per page, per size, colour and mono apart.",
      },
      {
        does: "Sets bulk pricing",
        state: "changes",
        note: "The banded shape is right. It has to come from them, and cover their own sizes.",
      },
      {
        does: "Says what the price includes",
        state: "missing",
        note: "Binding, trimming, packaging. With a hundred shops competing this is what wins the job, and there is nowhere to put it.",
      },
      {
        does: "Becomes pickable at checkout",
        state: "missing",
        note: "Nothing offers a printer to a buyer, so an order arrives with no shop on it and the queue stays empty even after a sale.",
      },
      {
        does: "Sees the jobs buyers sent them",
        state: "missing",
        note: "The screen is built and it can never have anything in it. Orders are created with no shop on them and nothing anywhere sets one, so the queue filters on a column that is always empty. A real sale leaves it empty too.",
      },
      {
        does: "Downloads the print file",
        state: "missing",
        note: "There is no file, and the endpoint that would say so cannot be reached either, for the same reason the queue is empty.",
      },
      {
        does: "Marks it in production, then shipped",
        state: "missing",
        note: "Unreachable twice over. The job is never found, because no shop is on it, and the route refuses an order at pending payment, which is the only status an order ever has.",
      },
      {
        does: "Gets paid",
        state: "missing",
        note: "After the inspection window. Nothing pays out.",
      },
    ],
  },
  {
    id: "admin",
    who: "You",
    line: "Admin only, and nothing anybody else does works until it is done.",
    tint: "#1f6fb5",
    steps: [
      {
        does: "Registers a country and its currency",
        state: "missing",
        note: "No route adds one. Nigeria and the United Kingdom are seeded and that is the entire list, so the United States, Ghana and the rest cannot exist at all until this is built.",
      },
      {
        does: "Opens a country for selling",
        state: "done",
        note: "It needs a delivery rate first, and closing one is always allowed in case we have to stop in a hurry.",
      },
      {
        does: "Keeps the format catalogue",
        state: "missing",
        note: "Nothing can add or edit a format. Every reference to the table is a read, so the three seeded rows are the only sizes that will ever exist until this is built. It is the list both sides price against, and only we can hold it.",
      },
      {
        does: "Adds a courier's delivery rates",
        state: "done",
        note: "Per parcel plus each extra copy, which is why five in one box beat five singles.",
      },
      {
        does: "Marks a figure real rather than a guess",
        state: "done",
        note: "A work priced against a guessed cost must never reach a buyer.",
      },
      {
        does: "Sets the company's share",
        state: "done",
        note: "The one number here that is ours rather than somebody else's.",
      },
      {
        does: "Invites a print partner",
        state: "done",
        note: "The link is shown once and kept only as a hash.",
      },
      {
        does: "Sees what each printer declared",
        state: "missing",
        note: "The costs you typed are already side by side per shop. What is missing is anything the shop said itself, and a way to take one out of rotation: printers carry an active flag that no route has ever set.",
      },
      {
        does: "Sees every order and its split",
        state: "missing",
        note: "The four way split is written correctly the moment an order is placed, and nothing has ever read it back. No route, no screen. The money is recorded and invisible.",
      },
      {
        does: "Pays everybody out",
        state: "missing",
        note: "Waiting on a payment provider, so blocked outside the code rather than inside it.",
      },
      {
        does: "Handles a defect claim",
        state: "missing",
        note: "The tables are there. The screens are not.",
      },
    ],
  },
];

const BUYER =
  "The fourth journey, and the one that removed a step of yours. A buyer opens a link somebody shared, picks their country and how many, sees the shops near them that can make that work with each one's price, picks one, types an address and pays. Their choice is what puts a shop on the job, so nothing has to assign it. None of the picking exists yet, and every order stops at pending payment because no provider is connected.";

function Step({ step, tint, index, last }) {
  const state = STATE[step.state];
  return (
    <li className="relative flex gap-4 pb-5 last:pb-0">
      {!last && (
        <span
          aria-hidden="true"
          className="absolute left-[11px] top-7 h-[calc(100%-1.75rem)] w-px bg-[#e6e8ec]"
        />
      )}
      <span
        className="relative z-10 flex size-6 shrink-0 items-center justify-center rounded-full font-ui text-[11px] font-bold"
        style={
          step.state === "done"
            ? { background: tint, color: "#ffffff" }
            : { background: "#f1f2f4", color: "#5a6474" }
        }
      >
        {index + 1}
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className={`font-ui text-sm font-bold ${INK}`}>{step.does}</span>
          <span
            className={`rounded-full px-2 py-0.5 font-ui text-[11px] font-semibold ${state.chip}`}
          >
            {state.label}
          </span>
        </p>
        <p className={`mt-1 font-ui text-sm leading-relaxed ${BODY}`}>{step.note}</p>
      </div>
    </li>
  );
}

function Flow({ flow }) {
  const working = flow.steps.filter((step) => step.state === "done").length;
  return (
    <section className={`${CARD} p-6`} aria-label={`${flow.who}, step by step`}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 className={`font-ui text-base font-semibold ${INK}`}>
          <span
            aria-hidden="true"
            className="mr-2 inline-block size-2 rounded-full align-middle"
            style={{ background: flow.tint }}
          />
          {flow.who}
        </h3>
        <p className={`font-ui text-sm ${MUTED}`}>
          {working} of {flow.steps.length} work
        </p>
      </div>
      <p className={`mt-1 font-ui text-sm ${MUTED}`}>{flow.line}</p>

      <ol className="mt-5">
        {flow.steps.map((step, index) => (
          <Step
            key={step.does}
            step={step}
            tint={flow.tint}
            index={index}
            last={index === flow.steps.length - 1}
          />
        ))}
      </ol>
    </section>
  );
}

export default function Flows() {
  return (
    <div className="flex flex-col gap-6">
      <section className={`${CARD} p-6`} aria-label="How a price is worked out">
        <h2 className={`font-ui text-base font-semibold ${INK}`}>How a price is worked out</h2>
        <p className={`mt-3 font-ui text-sm leading-relaxed ${BODY}`}>
          What the buyer pays is what the creator keeps, plus what the printer charges, plus our
          share, plus delivery. The creator&rsquo;s take is the input, and the buyer&rsquo;s total is
          the output.
        </p>
        <p className={`mt-3 font-ui text-sm leading-relaxed ${BODY}`}>
          Two things follow. A creator can never price below cost, so there is no floor to enforce
          and nothing to refuse. And the total moves with the shop a buyer picks, which is the
          point: a cheaper press nearby is a cheaper book.
        </p>
        <p className={`mt-3 font-ui text-sm leading-relaxed ${BODY}`}>
          The engine does the opposite today. The number a creator types is the buyer&rsquo;s price
          before delivery, which is added on top, and the creator keeps whatever is left of it once
          printing, the card fee and our share come out. That is why it needs a floor, and why an
          expensive printer can push a work off sale. It is the change underneath most of the amber
          below.
        </p>

        <dl className="mt-5 flex flex-wrap gap-x-6 gap-y-2 border-t border-[#e6e8ec] pt-4">
          {Object.entries(STATE).map(([key, value]) => (
            <div key={key} className="flex items-center gap-2">
              <dt
                className={`rounded-full px-2 py-0.5 font-ui text-[11px] font-semibold ${value.chip}`}
              >
                {value.label}
              </dt>
              <dd className={`font-ui text-xs ${MUTED}`}>{LEGEND[key]}</dd>
            </div>
          ))}
        </dl>
      </section>

      {FLOWS.map((flow) => (
        <Flow key={flow.id} flow={flow} />
      ))}

      <section className={`${CARD} p-6`} aria-label="A buyer">
        <h3 className={`font-ui text-base font-semibold ${INK}`}>A buyer</h3>
        <p className={`mt-2 font-ui text-sm leading-relaxed ${BODY}`}>{BUYER}</p>
      </section>
    </div>
  );
}
