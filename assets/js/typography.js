(() => {
  const NBSP = "\u00a0";
  const WORD_JOINER = "\u2060";
  const BLOCK_SELECTOR = "h1,h2,h3,h4,h5,h6,p,li,dt,dd,figcaption,blockquote,summary,.display,.lead,.work-project-link";
  const SKIP_SELECTOR = [
    "script", "style", "noscript", "template",
    "input", "textarea", "select", "option",
    "code", "pre", "kbd", "samp",
    "svg", "math", "[contenteditable]", "[data-no-typography]",
    "[hidden]", "[aria-hidden='true']",
    ".pabaka-specimen", ".pabaka-grid"
  ].join(",");
  const processed = new WeakMap();
  let observer = null;
  let frame = 0;

  const lexicalTokens = value => [...String(value).matchAll(/[\p{L}\p{N}]+(?:[’'][\p{L}\p{N}]+)*/gu)];
  const isRawAddress = value => {
    const text = String(value).trim();
    return /^(?:https?:\/\/|www\.)\S+$/iu.test(text) || /^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(text);
  };

  function protectLineBreaks(value, lang = "pl") {
    let output = String(value ?? "");
    if (!output || isRawAddress(output)) return output;

    output = output.replace(/([^\s\u00a0])[ \t]+([\/|·\-‐‑‒–—―−])[ \t]+(?=[^\s\u00a0])/gu, (_, before, separator) => `${before}${NBSP}${separator}${NBSP}`);
    output = output.replace(/([^\s\u00a0])[ \t]+([\/|·\-‐‑‒–—―−])(?=[^\s\u00a0])/gu, (_, before, separator) => `${before}${NBSP}${separator}${WORD_JOINER}`);
    output = output.replace(/([^\s\u00a0])([\/|·\-‐‑‒–—―−])[ \t]+(?=[^\s\u00a0])/gu, (_, before, separator) => `${before}${WORD_JOINER}${separator}${NBSP}`);

    const singleLetter = String(lang).toLowerCase().startsWith("pl")
      ? /(^|[ \t\r\n([{„“”'«])([aiouwz])([ \t]+)(?=[^\s])/giu
      : /(^|[ \t\r\n([{“”'«])([ai])([ \t]+)(?=[^\s])/giu;

    output = output.replace(singleLetter, (_, before, letter) => `${before}${letter}${NBSP}`);
    output = output.replace(/([\p{L}\p{N}])([-‐‑‒–—―−])(?=[\p{L}\p{N}])/gu, `$1${WORD_JOINER}$2${WORD_JOINER}`);
    output = output.replace(/([-‐‑‒–—―−])[ \t]+(?=[^\s])/gu, `$1${NBSP}`);
    return output;
  }

  function protectFinalPair(value) {
    const output = String(value ?? "");
    const tokens = lexicalTokens(output);
    if (tokens.length < 4) return output;

    const previous = tokens.at(-2);
    const last = tokens.at(-1);
    const separatorStart = previous.index + previous[0].length;
    const separator = output.slice(separatorStart, last.index);
    const trailing = output.slice(last.index + last[0].length);
    const pairLength = previous[0].length + last[0].length + 1;

    if (!/^[ \t]+$/u.test(separator) || !/^[\p{P}\p{S}\s]*$/u.test(trailing) || pairLength > 34) return output;
    return `${output.slice(0, separatorStart)}${NBSP}${output.slice(last.index)}`;
  }

  function formatText(value, { lang = "pl", widow = false } = {}) {
    const protectedValue = protectLineBreaks(value, lang);
    return widow ? protectFinalPair(protectedValue) : protectedValue;
  }

  function canProcess(node) {
    const parent = node?.parentElement;
    return Boolean(parent && node.data.trim() && !parent.closest(SKIP_SELECTOR) && !isRawAddress(node.data));
  }

  function textNodesWithin(root) {
    const nodes = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      if (canProcess(node)) nodes.push(node);
    }
    return nodes;
  }

  function protectElementWidow(element) {
    if (!element?.matches(BLOCK_SELECTOR) || element.querySelector(BLOCK_SELECTOR)) return;
    const nodes = textNodesWithin(element);
    if (!nodes.length) return;

    const value = nodes.map(node => node.data).join("");
    const protectedValue = protectFinalPair(value);
    if (protectedValue === value) return;

    let changeIndex = -1;
    for (let index = 0; index < value.length; index += 1) {
      if (value[index] !== protectedValue[index]) {
        changeIndex = index;
        break;
      }
    }
    if (changeIndex < 0) return;

    let offset = 0;
    for (const node of nodes) {
      const end = offset + node.data.length;
      if (changeIndex < end) {
        const localIndex = changeIndex - offset;
        node.data = `${node.data.slice(0, localIndex)}${NBSP}${node.data.slice(localIndex + 1)}`;
        processed.set(node, node.data);
        return;
      }
      offset = end;
    }
  }

  function typeset(root = document.body) {
    if (!root) return;
    const lang = document.documentElement.lang || "pl";
    const blocks = new Set();
    for (const node of textNodesWithin(root)) {
      const block = node.parentElement?.closest(BLOCK_SELECTOR);
      if (block) blocks.add(block);
      if (processed.get(node) === node.data) continue;
      const next = protectLineBreaks(node.data, lang);
      if (next !== node.data) node.data = next;
      processed.set(node, node.data);
    }
    blocks.forEach(protectElementWidow);
  }

  function schedule() {
    if (frame) return;
    const run = () => {
      frame = 0;
      typeset(document.body);
    };
    frame = typeof window.requestAnimationFrame === "function" ? window.requestAnimationFrame(run) : window.setTimeout(run, 0);
  }

  function start() {
    if (observer || !document.body) return;
    observer = new MutationObserver(schedule);
    observer.observe(document.body, { subtree: true, childList: true, characterData: true });
    schedule();
  }

  window.PortfolioTypography = { formatText, protectLineBreaks, protectFinalPair, typeset, start };
})();
