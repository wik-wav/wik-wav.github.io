import { loadContent } from "./lib/content-store.mjs";
import { generateSite } from "./lib/generate.mjs";

const check = process.argv.includes("--check");

try {
  const bundle = await loadContent();
  const result = await generateSite(bundle, { check });
  console.log(check ? "Generated outputs are current." : `Generated site (${result.changed} file${result.changed === 1 ? "" : "s"} changed).`);
  if (result.validation.warnings.length) console.warn(`${result.validation.warnings.length} draft warning(s).`);
} catch (error) {
  if (error.validation) console.error(JSON.stringify(error.validation, null, 2));
  else console.error(error.stack || error.message);
  process.exitCode = 1;
}
