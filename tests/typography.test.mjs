import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";

const root = path.resolve(import.meta.dirname, "..");
const source = await readFile(path.join(root, "assets/js/typography.js"), "utf8");
const context = { window: {} };
vm.runInNewContext(source, context);
const typography = context.window.PortfolioTypography;

test("protects Polish and English one-letter words without touching source data", () => {
  assert.equal(typography.formatText("Tożsamość w sztuce", { lang: "pl" }), "Tożsamość w\u00a0sztuce");
  assert.equal(typography.formatText("A Midsummer Journey", { lang: "en" }), "A\u00a0Midsummer Journey");
  assert.equal(typography.formatText("I work in art", { lang: "en" }), "I\u00a0work in art");
});

test("keeps dashes, compounds, ranges, and spaced slashes away from line endings", () => {
  assert.equal(typography.formatText("Lem — synteza głosu"), "Lem\u00a0—\u00a0synteza głosu");
  assert.equal(typography.formatText("Postaci - ilustracje"), "Postaci\u00a0-\u00a0ilustracje");
  assert.equal(typography.formatText("forms—Civet", { lang: "en" }), "forms\u2060—\u2060Civet");
  assert.equal(typography.formatText("Para-analog-on"), "Para\u2060-\u2060analog\u2060-\u2060on");
  assert.equal(typography.formatText("A2–E5"), "A2\u2060–\u2060E5");
  assert.equal(typography.formatText("WIN / DOWS"), "WIN\u00a0/\u00a0DOWS");
  assert.equal(typography.formatText("外人の三つの空想 / A Gaijin’s Three Visions", { lang: "en" }), "外人の三つの空想\u00a0/\u00a0A Gaijin’s Three Visions");
  assert.equal(typography.formatText("WIN /DOWS"), "WIN\u00a0/\u2060DOWS");
  assert.equal(typography.formatText("WIN/ DOWS"), "WIN\u2060/\u00a0DOWS");
  assert.equal(typography.formatText("path/to/file"), "path/to/file");
  assert.equal(typography.formatText("word—\nnext"), "word—\nnext");
});

test("prevents a final one-word line conservatively and remains idempotent", () => {
  const input = "This sentence ends with one word.";
  const result = typography.formatText(input, { lang: "en", widow: true });
  assert.equal(result, "This sentence ends with one\u00a0word.");
  assert.equal(typography.formatText(result, { lang: "en", widow: true }), result);
  assert.equal(typography.formatText("Two words", { lang: "en", widow: true }), "Two words");
  assert.equal(typography.formatText("A sentence with extraordinarilylongword anotherextraordinarilylongword", { lang: "en", widow: true }), "A\u00a0sentence with extraordinarilylongword anotherextraordinarilylongword");
});

test("leaves raw addresses unchanged and all transforms are idempotent", () => {
  for (const value of ["https://example.com/para-analog-on", "wiktor-sielaszuk.22@gmail.com", "https://wik-wav.github.io/lozenge-tessellation/"]) {
    assert.equal(typography.formatText(value, { lang: "pl", widow: true }), value);
  }
  for (const value of ["Lem — synteza głosu", "Para-analog-on", "Tożsamość w sztuce", "WIN / DOWS"]) {
    const once = typography.formatText(value, { lang: "pl", widow: true });
    assert.equal(typography.formatText(once, { lang: "pl", widow: true }), once);
  }
});
