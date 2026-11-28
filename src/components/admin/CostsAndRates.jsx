// Where a printer's quote finally gets typed in.
//
// This screen exists because of a gap rather than a feature. Everything in
// Distribution is computed from three tables: what a printer charges, what
// delivery costs, and our own cut. Until now they could only be filled in
// by hand written SQL, so when a printer quotes us there was nowhere for
// the number to go.
//
// The part worth having is the panel at the top: type a cost and watch the
// lowest sellable price move. It calls the real pricing engine on the
// server rather than repeating its arithmetic here, so what this screen
// shows and what the checkout will charge cannot drift apart.
import { useCallback, useEffect, useState } from "react";

import { CARD, INK, BODY, MUTED } from "../AdminShell";
import {
  addDeliveryRate,
  addPrinter,
  loadDistributionRates,
  setCountryOpen,
  previewPrice,
  saveDeliveryRate,
  saveDistributionSettings,
  savePrinterCost,
} from "../../data/admin";

// Humans type naira; the database keeps kobo. Converted by string rather
// than by multiplying a float, because 32.10 * 100 is 3209.999... and money
// that goes through a float is money that disagrees with itself later.
export function toMinor(typed) {
  const clean = String(typed ?? "").replace(/[\s,]/g, "");
  if (!/^\d*(\.\d{0,2})?$/.test(clean) || clean === "" || clean === ".") return null;
  const [whole, part = ""] = clean.split(".");
  return `${whole || "0"}${part.padEnd(2, "0")}`;
}

export const fromMinor = (minor) =>
  typeof minor === "number" ? (minor / 100).toFixed(2).replace(/\.00$/, "") : "";

// Rounding to whole units threw away real money and made the figures stop
// agreeing with each other. A GBP parcel of 290 minor units is GBP 2.90 and
// was shown as "3", losing the pence on the very screen where they are
// typed; and because each figure rounded on its own, a floor of 3810.75
// beside a delivery of 1500.50 displayed as 3,811 and 1,501 over a total of
// 5,311, which reads as arithmetic that does not work. So: whole amounts
// stay whole, and anything with a fraction shows it.
//
// Number, and finite: typeof NaN is "number", so the old guard let NaN
// through and printed a currency symbol in front of it.
const money = (minor, currency) => {
  if (typeof minor !== "number" || !Number.isFinite(minor)) return "—";
  const symbol = currency === "NGN" ? "₦" : currency === "GBP" ? "£" : "";
  const units = minor / 100;
  return `${symbol}${units.toLocaleString(undefined, {
    minimumFractionDigits: Number.isInteger(units) ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
};

const FIELD =
  "w-full box-border min-h-[40px] rounded-lg border border-[#908a7e] bg-white px-3 py-2 font-ui text-sm text-[#1b2233] outline-none focus:border-[#6a28a8] focus:outline focus:outline-2 focus:outline-[#6a28a8] focus:outline-offset-[-1px]";
const LABEL = `block font-ui text-xs font-semibold ${INK} mb-1.5`;
const BTN =
  "inline-flex items-center justify-center min-h-[40px] px-4 rounded-lg bg-[#6a28a8] text-white font-ui text-sm font-semibold hover:opacity-90 disabled:opacity-50";
const BTN_QUIET =
  "inline-flex items-center justify-center min-h-[40px] px-4 rounded-lg border border-[#908a7e] bg-white text-[#39435a] font-ui text-sm font-medium hover:bg-[#f6f7f9] disabled:opacity-50";

function Row({ label, value, strong }) {
  return (
    <div className="flex justify-between gap-4 py-1.5 text-sm">
      <span className={MUTED}>{label}</span>
      <span className={`tabular-nums ${strong ? `font-semibold ${INK}` : BODY}`}>{value}</span>
    </div>
  );
}

export default function CostsAndRates() {
  const [data, setData] = useState(null);
  const [problem, setProblem] = useState("");
  const [saying, setSaying] = useState("");

  // The preview's own state: what somebody is currently asking about.
  const [ask, setAsk] = useState({ formatSlug: "", countryCode: "", quantity: 1, pageCount: 32, retail: "" });
  const [preview, setPreview] = useState(null);
  const [previewProblem, setPreviewProblem] = useState("");

  const refresh = useCallback(async () => {
    try {
      const next = await loadDistributionRates();
      setData(next);
      setAsk((current) => ({
        ...current,
        formatSlug: current.formatSlug || next.formats[0]?.slug || "",
        countryCode: current.countryCode || next.countries[0]?.code || "",
      }));
    } catch (error) {
      setProblem(error.message);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Re-ask whenever anything that changes the answer changes.
  useEffect(() => {
    if (!ask.formatSlug || !ask.countryCode) return undefined;
    let cancelled = false;

    const retailMinor = ask.retail.trim() ? toMinor(ask.retail) : null;
    previewPrice({
      formatSlug: ask.formatSlug,
      countryCode: ask.countryCode,
      pageCount: Number(ask.pageCount) || 1,
      quantity: Number(ask.quantity) || 1,
      ...(retailMinor ? { retailMinor } : {}),
    })
      .then((answer) => {
        if (cancelled) return;
        setPreview(answer);
        setPreviewProblem("");
      })
      .catch((error) => {
        if (cancelled) return;
        setPreview(null);
        setPreviewProblem(error.message);
      });

    return () => {
      cancelled = true;
    };
  }, [ask, data]);

  const run = async (work, said) => {
    setProblem("");
    setSaying("");
    try {
      await work();
      setSaying(said);
      await refresh();
      return null;
    } catch (error) {
      setProblem(error.message);
      // Handed back as well as banner'd. The banner sits at the top of a
      // long screen, so a control far down it needs to say its own refusal
      // where the person is looking, or the click appears to do nothing.
      return error.message;
    }
  };

  if (!data) {
    return <p className={`font-ui text-sm ${MUTED}`}>Loading the costs...</p>;
  }

  const guesses = data.placeholders.printerCosts + data.placeholders.deliveryRates;
  const nothingQuoted = data.printerCosts.length === 0;
  const currencyOf = (code) => data.countries.find((c) => c.code === code)?.currency ?? "";

  // What the reader's card is charged. With a price typed the engine has
  // already totalled it, so use that figure: taking the floor's in both
  // cases printed the cheapest possible bill beside the breakdown of a
  // dearer one. With no price, the bill at the floor depends on who pays
  // delivery, which the engine now says rather than leaving us to assume:
  // where the reader pays it the bill is the floor plus delivery, and where
  // the floor absorbs it the bill is the floor alone, and adding delivery
  // there would charge it twice.
  const readerPays = !preview
    ? null
    : typeof preview.totalMinor === "number"
      ? preview.totalMinor
      : preview.deliveryPaidByReader === false
        ? preview.floorMinor
        : preview.floorMinor + preview.deliveryMinor;

  return (
    <div className="flex flex-col gap-6">
      {problem && (
        <p role="alert" className="rounded-xl border border-[#f3c6d4] bg-[#fdf2f7] px-5 py-4 font-ui text-sm text-[#9b1c44]">
          {problem}
        </p>
      )}
      {saying && (
        <p role="status" className="rounded-xl border border-[#c8e0cf] bg-[#f1f8f3] px-5 py-4 font-ui text-sm text-[#15803d]">
          {saying}
        </p>
      )}

      {(nothingQuoted || guesses > 0) && (
        <div role="note" className="rounded-xl border border-[#e3cba8] border-l-4 border-l-[#92400e] bg-[#fdf6ec] px-5 py-4">
          <p className="font-ui text-sm font-semibold text-[#92400e]">
            {nothingQuoted
              ? "No printer has quoted us yet"
              : `${guesses} ${guesses === 1 ? "figure is" : "figures are"} still a placeholder`}
          </p>
          <p className="mt-1.5 font-ui text-sm leading-relaxed text-[#6b4418]">
            A book cannot go on sale while the cost under it is a guess. Type a real quote below
            and tick the box beside it, and the floor becomes something a creator can price
            against.
          </p>
        </div>
      )}

      {/* The reason the screen is worth having. */}
      <section className={`${CARD} p-6`} aria-label="What a price would mean">
        <h2 className={`font-ui text-base font-semibold ${INK}`}>What a price would mean</h2>
        <p className={`mt-1 font-ui text-sm ${MUTED}`}>
          Worked out by the same engine the checkout uses, so these two cannot disagree.
        </p>

        <div className="mt-5 flex flex-wrap gap-4">
          <div className="min-w-0 flex-[2_1_220px]">
            <label className={LABEL} htmlFor="p-format">Format</label>
            <select
              className={FIELD}
              id="p-format"
              value={ask.formatSlug}
              onChange={(e) => setAsk({ ...ask, formatSlug: e.target.value })}
            >
              {data.formats.map((f) => (
                <option key={f.slug} value={f.slug}>{f.name}</option>
              ))}
            </select>
          </div>
          <div className="min-w-0 flex-[1_1_130px]">
            <label className={LABEL} htmlFor="p-country">Country</label>
            <select
              className={FIELD}
              id="p-country"
              value={ask.countryCode}
              onChange={(e) => setAsk({ ...ask, countryCode: e.target.value })}
            >
              {data.countries.map((c) => (
                <option key={c.code} value={c.code}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="min-w-0 flex-[1_1_100px]">
            <label className={LABEL} htmlFor="p-pages">Pages</label>
            <input className={FIELD} id="p-pages" type="number" min="1" value={ask.pageCount}
              onChange={(e) => setAsk({ ...ask, pageCount: e.target.value })} />
          </div>
          <div className="min-w-0 flex-[1_1_100px]">
            <label className={LABEL} htmlFor="p-qty">Copies</label>
            <input className={FIELD} id="p-qty" type="number" min="1" max="100" value={ask.quantity}
              onChange={(e) => setAsk({ ...ask, quantity: e.target.value })} />
          </div>
          <div className="min-w-0 flex-[1_1_140px]">
            <label className={LABEL} htmlFor="p-retail">A price to test</label>
            <input className={FIELD} id="p-retail" inputMode="decimal" placeholder="optional"
              value={ask.retail} onChange={(e) => setAsk({ ...ask, retail: e.target.value })} />
          </div>
        </div>

        {previewProblem && (
          <p className="mt-4 font-ui text-sm font-medium text-[#92400e]">{previewProblem}</p>
        )}

        {preview && (
          <div className="mt-5 flex flex-wrap gap-5">
            <div className="min-w-0 flex-1 rounded-lg bg-[#f6f7f9] p-5">
              <p className={`font-ui text-xs font-semibold ${MUTED}`}>Lowest it can sell for</p>
              <p className={`mt-2 font-ui text-3xl font-semibold tabular-nums ${INK}`}>
                {money(preview.floorMinor, preview.currency)}
              </p>
              <p className={`mt-1 font-ui text-xs ${MUTED}`}>
                {money(preview.perCopyFloorMinor, preview.currency)} a copy at {preview.quantity}
              </p>
              {/* The floor is the book on its own. Delivery is added to the
                  reader's bill rather than taken out of it, so without this
                  line the printing and delivery figures sitting beside the
                  floor look like they overshoot it: 3,450 and 1,500 under a
                  floor of 4,037 reads as broken arithmetic when it is not. */}
              {Number.isFinite(readerPays) && (
                <p className={`mt-3 border-t border-[#e6e8ec] pt-3 font-ui text-xs ${MUTED}`}>
                  A reader pays{" "}
                  <span className={`font-semibold tabular-nums ${INK}`}>
                    {money(readerPays, preview.currency)}
                  </span>{" "}
                  {/* The same test the figure above was chosen by, so the
                      wording cannot end up describing the other one. */}
                  {typeof preview.totalMinor === "number"
                    ? "at the price you typed"
                    : "at that floor"}
                  ,
                  delivery included.
                </p>
              )}
            </div>

            <div className="min-w-0 flex-[2_1_280px] rounded-lg bg-[#f6f7f9] p-5">
              <Row label="Printing" value={money(preview.printingMinor, preview.currency)} />
              <Row label="Delivery, paid on top" value={money(preview.deliveryMinor, preview.currency)} />
              {preview.retailMinor !== undefined && (
                <>
                  <Row label="Card fee" value={money(preview.gatewayFeeMinor, preview.currency)} />
                  <Row label="Our cut" value={money(preview.platformFeeMinor, preview.currency)} />
                  <div className="mt-1 border-t border-[#e6e8ec] pt-1">
                    <Row strong label="The creator keeps" value={money(preview.creatorMinor, preview.currency)} />
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {preview && preview.placeholders?.length > 0 && (
          <p className="mt-4 font-ui text-sm font-medium text-[#92400e]">
            Not sellable yet: the {preview.placeholders.join(" and the ")}{" "}
            {preview.placeholders.length > 1 ? "are" : "is"} a placeholder.
          </p>
        )}
      </section>

      <PrinterCosts data={data} run={run} currencyOf={currencyOf} />
      <DeliveryRates data={data} run={run} currencyOf={currencyOf} />
      <Countries data={data} run={run} />
      <OurCut data={data} run={run} />
    </div>
  );
}

function PrinterCosts({ data, run, currencyOf }) {
  const [adding, setAdding] = useState({ name: "", countryCode: data.countries[0]?.code ?? "" });
  const blank = {
    printerId: data.printers[0]?.id ?? "",
    formatSlug: data.formats[0]?.slug ?? "",
    minQuantity: 1,
    unitCost: "",
    packaging: "",
    // null means nobody has touched the box, so it answers for itself below.
    // A fixed default cannot be right for both cases: false is the safe
    // start for a band that does not exist yet, because a guess saved as a
    // real quote is silent and unblocks selling at a price that need not
    // cover cost, while a real quote saved as a placeholder only keeps a
    // book off sale and makes the banner shout. But this form is an upsert,
    // so a fixed false also demoted an already quoted band every time
    // somebody corrected a typo on it.
    real: null,
  };
  const [band, setBand] = useState(blank);

  const nameOf = (id) => data.printers.find((p) => p.id === id)?.name ?? "Unknown";
  const countryOf = (id) => data.printers.find((p) => p.id === id)?.countryCode ?? "";

  // The row this form would overwrite, if there is one. Saving the same
  // printer, format and step corrects that row rather than adding a second.
  const existing = data.printerCosts.find(
    (row) =>
      row.printerId === band.printerId &&
      row.formatSlug === band.formatSlug &&
      Number(row.minQuantity) === Number(band.minQuantity)
  );

  // Untouched, the box says what the band it is about to overwrite says, and
  // unticked when there is nothing there yet.
  const real = band.real === null ? Boolean(existing) && !existing.isPlaceholder : band.real;

  return (
    <section className={`${CARD} p-6`} aria-label="What a printer charges">
      <h2 className={`font-ui text-base font-semibold ${INK}`}>What a printer charges</h2>
      <p className={`mt-1 font-ui text-sm ${MUTED}`}>
        A band applies from its quantity upwards. A row at 1 and a row at 5 is the usual shape.
      </p>

      {data.printers.length === 0 ? (
        <p className={`mt-4 font-ui text-sm ${BODY}`}>No printers yet. Add one before a quote can go anywhere.</p>
      ) : (
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse">
            <thead>
              <tr>
                {["Printer", "Format", "From", "Per copy", "Packaging", ""].map((h) => (
                  <th key={h} className={`border-b border-[#e6e8ec] px-3 py-2 text-left font-ui text-xs font-semibold ${MUTED}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.printerCosts.map((row) => (
                <tr key={row.id}>
                  <td className={`border-b border-[#e6e8ec] px-3 py-3 font-ui text-sm ${BODY}`}>{nameOf(row.printerId)}</td>
                  <td className={`border-b border-[#e6e8ec] px-3 py-3 font-ui text-sm ${BODY}`}>{row.formatSlug}</td>
                  <td className={`border-b border-[#e6e8ec] px-3 py-3 font-ui text-sm tabular-nums ${BODY}`}>{row.minQuantity}</td>
                  <td className={`border-b border-[#e6e8ec] px-3 py-3 font-ui text-sm tabular-nums ${INK}`}>
                    {money(row.unitCostMinor, currencyOf(countryOf(row.printerId)))}
                  </td>
                  <td className={`border-b border-[#e6e8ec] px-3 py-3 font-ui text-sm tabular-nums ${BODY}`}>
                    {money(row.packagingMinor, currencyOf(countryOf(row.printerId)))}
                  </td>
                  <td className="border-b border-[#e6e8ec] px-3 py-3">
                    {row.isPlaceholder ? (
                      <span className="font-ui text-xs font-bold uppercase tracking-wide text-[#92400e]">Placeholder</span>
                    ) : (
                      <span className="font-ui text-xs font-medium text-[#15803d]">Quoted</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <form
        className="mt-6 flex flex-wrap items-end gap-3 border-t border-[#e6e8ec] pt-5"
        onSubmit={(e) => {
          e.preventDefault();
          const unitCostMinor = toMinor(band.unitCost);
          if (!unitCostMinor) return;
          run(
            () =>
              savePrinterCost({
                printerId: band.printerId,
                formatSlug: band.formatSlug,
                minQuantity: Number(band.minQuantity),
                unitCostMinor,
                ...(toMinor(band.packaging) ? { packagingMinor: toMinor(band.packaging) } : {}),
                isPlaceholder: !real,
              }),
            "Saved. The floor above has moved."
          ).then(() =>
            // minQuantity too, so the form still points at the band just
            // saved, and real back to null so it reads that band's own state
            // rather than carrying the last tick onto a different row.
            setBand({
              ...blank,
              printerId: band.printerId,
              formatSlug: band.formatSlug,
              minQuantity: band.minQuantity,
            })
          );
        }}
      >
        <div className="min-w-0 flex-[2_1_180px]">
          <label className={LABEL} htmlFor="c-printer">Printer</label>
          <select className={FIELD} id="c-printer" value={band.printerId} disabled={!data.printers.length}
            onChange={(e) => setBand({ ...band, printerId: e.target.value })}>
            {data.printers.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div className="min-w-0 flex-[2_1_180px]">
          <label className={LABEL} htmlFor="c-format">Format</label>
          <select className={FIELD} id="c-format" value={band.formatSlug}
            onChange={(e) => setBand({ ...band, formatSlug: e.target.value })}>
            {data.formats.map((f) => <option key={f.slug} value={f.slug}>{f.name}</option>)}
          </select>
        </div>
        <div className="min-w-0 flex-[1_1_90px]">
          <label className={LABEL} htmlFor="c-from">From</label>
          <input className={FIELD} id="c-from" type="number" min="1" value={band.minQuantity}
            onChange={(e) => setBand({ ...band, minQuantity: e.target.value })} />
        </div>
        <div className="min-w-0 flex-[1_1_120px]">
          <label className={LABEL} htmlFor="c-cost">Per copy</label>
          <input className={FIELD} id="c-cost" inputMode="decimal" placeholder="3200" value={band.unitCost}
            onChange={(e) => setBand({ ...band, unitCost: e.target.value })} />
        </div>
        <div className="min-w-0 flex-[1_1_120px]">
          <label className={LABEL} htmlFor="c-pack">Packaging</label>
          <input className={FIELD} id="c-pack" inputMode="decimal" placeholder="250" value={band.packaging}
            onChange={(e) => setBand({ ...band, packaging: e.target.value })} />
        </div>
        <label className="flex min-h-[40px] flex-[1_1_190px] items-center gap-2 font-ui text-sm text-[#39435a]">
          <input type="checkbox" className="size-4 accent-[#6a28a8]" checked={real}
            onChange={(e) => setBand({ ...band, real: e.target.checked })} />
          A real quote, not a guess
        </label>
        <button type="submit" className={BTN} disabled={!data.printers.length || !toMinor(band.unitCost)}>
          {existing ? "Correct this cost" : "Save this cost"}
        </button>
      </form>

      <form
        className="mt-5 flex flex-wrap items-end gap-3 border-t border-[#e6e8ec] pt-5"
        onSubmit={(e) => {
          e.preventDefault();
          if (!adding.name.trim()) return;
          run(() => addPrinter(adding), `${adding.name} added.`).then(() =>
            setAdding({ ...adding, name: "" })
          );
        }}
      >
        <div className="min-w-0 flex-[2_1_220px]">
          <label className={LABEL} htmlFor="c-newprinter">Add a printer</label>
          <input className={FIELD} id="c-newprinter" value={adding.name} placeholder="Printfactory, Anthony"
            onChange={(e) => setAdding({ ...adding, name: e.target.value })} />
        </div>
        <div className="min-w-0 flex-[1_1_140px]">
          <label className={LABEL} htmlFor="c-newcountry">Country</label>
          <select className={FIELD} id="c-newcountry" value={adding.countryCode}
            onChange={(e) => setAdding({ ...adding, countryCode: e.target.value })}>
            {data.countries.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
          </select>
        </div>
        <button type="submit" className={BTN_QUIET} disabled={!adding.name.trim()}>Add printer</button>
      </form>
    </section>
  );
}

function DeliveryRates({ data, run, currencyOf }) {
  const blank = {
    countryCode: data.countries[0]?.code ?? "",
    region: "",
    parcel: "",
    extra: "",
    estDaysMin: 2,
    estDaysMax: 4,
    courier: "",
    // Unticked, for the same reason as a printer's quote.
    real: false,
  };
  const [adding, setAdding] = useState(blank);

  return (
    <section className={`${CARD} p-6`} aria-label="Delivery">
      <h2 className={`font-ui text-base font-semibold ${INK}`}>Delivery</h2>
      <p className={`mt-1 font-ui text-sm ${MUTED}`}>
        Priced per parcel, plus each extra copy in it. Five copies share one box, which is most of
        why buying five is cheaper.
      </p>

      {data.deliveryRates.length > 0 && (
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[620px] border-collapse">
            <thead>
              <tr>
                {["Where", "Parcel", "Each extra", "Days", "Courier", ""].map((h) => (
                  <th key={h} className={`border-b border-[#e6e8ec] px-3 py-2 text-left font-ui text-xs font-semibold ${MUTED}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.deliveryRates.map((row) => (
                <tr key={row.id}>
                  <td className={`border-b border-[#e6e8ec] px-3 py-3 font-ui text-sm ${BODY}`}>
                    {row.countryCode}{row.region ? `, ${row.region}` : ", anywhere"}
                  </td>
                  <td className={`border-b border-[#e6e8ec] px-3 py-3 font-ui text-sm tabular-nums ${INK}`}>
                    {money(row.parcelCostMinor, currencyOf(row.countryCode))}
                  </td>
                  <td className={`border-b border-[#e6e8ec] px-3 py-3 font-ui text-sm tabular-nums ${BODY}`}>
                    {money(row.extraCopyMinor, currencyOf(row.countryCode))}
                  </td>
                  <td className={`border-b border-[#e6e8ec] px-3 py-3 font-ui text-sm tabular-nums ${BODY}`}>
                    {row.estDaysMin} to {row.estDaysMax}
                  </td>
                  <td className={`border-b border-[#e6e8ec] px-3 py-3 font-ui text-sm ${BODY}`}>{row.courier ?? "—"}</td>
                  <td className="border-b border-[#e6e8ec] px-3 py-3">
                    {row.isPlaceholder ? (
                      <span className="font-ui text-xs font-bold uppercase tracking-wide text-[#92400e]">Placeholder</span>
                    ) : (
                      <span className="font-ui text-xs font-medium text-[#15803d]">Quoted</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <form
        className="mt-6 flex flex-wrap items-end gap-3 border-t border-[#e6e8ec] pt-5"
        onSubmit={(e) => {
          e.preventDefault();
          const parcelCostMinor = toMinor(adding.parcel);
          if (!parcelCostMinor) return;
          run(
            () =>
              addDeliveryRate({
                countryCode: adding.countryCode,
                region: adding.region.trim() || null,
                parcelCostMinor,
                ...(toMinor(adding.extra) ? { extraCopyMinor: toMinor(adding.extra) } : {}),
                estDaysMin: Number(adding.estDaysMin),
                estDaysMax: Number(adding.estDaysMax),
                courier: adding.courier.trim() || null,
                isPlaceholder: !adding.real,
              }),
            "Delivery rate saved."
          ).then(() => setAdding(blank));
        }}
      >
        <div className="min-w-0 flex-[1_1_130px]">
          <label className={LABEL} htmlFor="d-country">Country</label>
          <select className={FIELD} id="d-country" value={adding.countryCode}
            onChange={(e) => setAdding({ ...adding, countryCode: e.target.value })}>
            {data.countries.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
          </select>
        </div>
        <div className="min-w-0 flex-[1_1_140px]">
          <label className={LABEL} htmlFor="d-region">Region</label>
          <input className={FIELD} id="d-region" value={adding.region} placeholder="Lagos, or leave blank"
            onChange={(e) => setAdding({ ...adding, region: e.target.value })} />
        </div>
        <div className="min-w-0 flex-[1_1_110px]">
          <label className={LABEL} htmlFor="d-parcel">Parcel</label>
          <input className={FIELD} id="d-parcel" inputMode="decimal" placeholder="1500" value={adding.parcel}
            onChange={(e) => setAdding({ ...adding, parcel: e.target.value })} />
        </div>
        <div className="min-w-0 flex-[1_1_110px]">
          <label className={LABEL} htmlFor="d-extra">Each extra</label>
          <input className={FIELD} id="d-extra" inputMode="decimal" placeholder="200" value={adding.extra}
            onChange={(e) => setAdding({ ...adding, extra: e.target.value })} />
        </div>
        <div className="min-w-0 flex-[1_1_80px]">
          <label className={LABEL} htmlFor="d-min">Days, from</label>
          <input className={FIELD} id="d-min" type="number" min="0" value={adding.estDaysMin}
            onChange={(e) => setAdding({ ...adding, estDaysMin: e.target.value })} />
        </div>
        <div className="min-w-0 flex-[1_1_80px]">
          <label className={LABEL} htmlFor="d-max">to</label>
          <input className={FIELD} id="d-max" type="number" min="0" value={adding.estDaysMax}
            onChange={(e) => setAdding({ ...adding, estDaysMax: e.target.value })} />
        </div>
        <div className="min-w-0 flex-[1_1_140px]">
          <label className={LABEL} htmlFor="d-courier">Courier</label>
          <input className={FIELD} id="d-courier" value={adding.courier} placeholder="GIG Logistics"
            onChange={(e) => setAdding({ ...adding, courier: e.target.value })} />
        </div>
        <label className="flex min-h-[40px] flex-[1_1_190px] items-center gap-2 font-ui text-sm text-[#39435a]">
          <input type="checkbox" className="size-4 accent-[#6a28a8]" checked={adding.real}
            onChange={(e) => setAdding({ ...adding, real: e.target.checked })} />
          A real rate, not a guess
        </label>
        <button type="submit" className={BTN} disabled={!toMinor(adding.parcel)}>Save rate</button>
      </form>
    </section>
  );
}

// Which countries we actually sell into.
//
// They ship closed, which is the right default: a creator pricing into
// somewhere we cannot deliver to is being set up to fail. But until now the
// only way to open one was a hand written UPDATE, so the step existed in the
// database and nowhere a person could reach.
function Countries({ data, run }) {
  const [refused, setRefused] = useState({});

  return (
    <section className={`${CARD} mt-6 p-6`} aria-label="Where we sell">
      <h2 className={`font-ui text-base font-semibold ${INK}`}>Where we sell</h2>
      <p className={`mt-1 font-ui text-sm ${MUTED}`}>
        A country has to have a confirmed delivery rate before it can be opened, not merely a
        guessed one: a work priced against a guess cannot be bought even once it is on sale.
        Closing one is always allowed, and stops the next sale rather than the last one.
      </p>

      <ul className="mt-5 flex flex-col gap-2">
        {data.countries.map((place) => {
          const rates = data.deliveryRates.filter((rate) => rate.countryCode === place.code);
          const deliverable = rates.some((rate) => !rate.isPlaceholder);
          const why = !rates.length
            ? "closed, no delivery rate"
            : deliverable
              ? "closed"
              : "closed, delivery rate is still a guess";
          return (
            <li
              key={place.code}
              className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e6e8ec] pt-3 first:border-t-0 first:pt-0"
            >
              <span className="min-w-0">
                <span className={`font-ui text-sm font-bold ${INK}`}>{place.name}</span>
                <span className={`ml-2 font-ui text-sm ${MUTED}`}>
                  {place.enabled ? "open" : why}
                </span>
                {refused[place.code] && (
                  <span
                    role="alert"
                    className="mt-1 block font-ui text-sm font-medium text-[#9b1c44]"
                  >
                    {refused[place.code]}
                  </span>
                )}
              </span>
              <button
                type="button"
                disabled={!place.enabled && !deliverable}
                aria-label={
                  place.enabled
                    ? `Close ${place.name} for selling`
                    : `Open ${place.name} for selling`
                }
                onClick={async () => {
                  const problem = await run(
                    () => setCountryOpen(place.code, !place.enabled),
                    place.enabled
                      ? `${place.name} is closed for selling.`
                      : `${place.name} is open for selling.`
                  );
                  setRefused((was) => ({ ...was, [place.code]: problem }));
                }}
                className={place.enabled ? BTN_QUIET : BTN}
              >
                {place.enabled ? "Close it" : "Open for selling"}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function OurCut({ data, run }) {
  const [bps, setBps] = useState(String(data.settings.platformFeeBps));

  return (
    <section className={`${CARD} p-6`} aria-label="Our cut">
      <h2 className={`font-ui text-base font-semibold ${INK}`}>Our cut</h2>
      <p className={`mt-1 font-ui text-sm ${MUTED}`}>
        The one number here that is ours rather than somebody else's. For comparison: Gumroad takes
        10% plus a fixed fee on a direct sale, Payhip&rsquo;s free tier takes 5%.
      </p>

      <form
        className="mt-5 flex flex-wrap items-end gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          run(
            () => saveDistributionSettings({ platformFeeBps: Number(bps) }),
            "Our cut saved. Every floor has moved with it."
          );
        }}
      >
        <div className="min-w-0 flex-[1_1_140px]">
          <label className={LABEL} htmlFor="s-fee">Platform fee</label>
          <div className="flex items-center gap-2">
            <input className={FIELD} id="s-fee" type="number" min="0" max="5000" step="50" value={bps}
              onChange={(e) => setBps(e.target.value)} style={{ width: 110 }} />
            <span className={`font-ui text-sm ${BODY}`}>
              bps, so {(Number(bps) / 100).toFixed(2)}%
            </span>
          </div>
        </div>
        <button type="submit" className={BTN_QUIET} disabled={bps === String(data.settings.platformFeeBps)}>
          Save
        </button>
      </form>
    </section>
  );
}
