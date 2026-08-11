import { loadContent, validateContent } from "./lib/content-store.mjs";

const publish = process.argv.includes("--publish");
const bundle = await loadContent();
const result = await validateContent(bundle, { publish });
console.log(JSON.stringify(result, null, 2));
if (!result.valid) process.exitCode = 1;
