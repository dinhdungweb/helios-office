// Server-side clean-up of rich text written in the workflow designer's notification / email nodes
// (AP-25). Instead of filtering the input, the output is rebuilt: only allow-listed tags are written
// back, each with attributes generated here, so nothing from the original tag text survives.

const ALLOWED_TAGS = new Set([
  "p", "br", "div", "span", "b", "strong", "i", "em", "u", "s", "strike", "sub", "sup",
  "ul", "ol", "li", "blockquote", "pre", "code", "h1", "h2", "h3", "h4", "h5", "h6", "hr", "a"
]);
const VOID_TAGS = new Set(["br", "hr"]);
// Their content is dropped together with the tag.
const DROP_WITH_CONTENT = ["script", "style", "iframe", "object", "embed", "noscript", "template", "textarea", "select", "svg", "math"];
const SAFE_URL = /^(https?:|mailto:)/i;

function decodeEntities(value: string) {
  return value
    .replace(/&#x([0-9a-f]+);?/gi, (_, hex: string) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);?/g, (_, dec: string) => String.fromCodePoint(Number(dec)))
    .replace(/&colon;/gi, ":")
    .replace(/&tab;/gi, "\t")
    .replace(/&newline;/gi, "\n")
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&amp;/gi, "&");
}

function escapeAttribute(value: string) {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escapeText(value: string) {
  return value.replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function readHref(attributes: string) {
  const match = /(?:^|\s)href\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/i.exec(attributes);
  if (!match) return null;
  const raw = match[1] ?? match[2] ?? match[3] ?? "";
  // Browsers ignore control characters and whitespace inside the scheme ("java\tscript:").
  // eslint-disable-next-line no-control-regex -- matching control characters is the point here
  const url = decodeEntities(raw).replace(/[\u0000- \u007f-\u009f]/g, "");
  return SAFE_URL.test(url) ? url : null;
}

export function sanitizeRichText(input: string | null | undefined): string {
  if (!input) return "";
  let html = String(input);

  for (const tag of DROP_WITH_CONTENT) {
    html = html.replace(new RegExp(`<${tag}\\b[\\s\\S]*?(?:<\\/${tag}\\s*>|$)`, "gi"), "");
  }
  html = html.replace(/<!--[\s\S]*?(?:-->|$)/g, "").replace(/<!\[CDATA\[[\s\S]*?(?:\]\]>|$)/gi, "");

  const out: string[] = [];
  // As in browsers, "<" must be followed directly by the tag name ("a < b" is text).
  const tagPattern = /<(\/?)([a-zA-Z][a-zA-Z0-9]*)([^>]*)>/g;
  let last = 0;
  let match: RegExpExecArray | null;

  while ((match = tagPattern.exec(html))) {
    out.push(escapeText(html.slice(last, match.index)));
    last = tagPattern.lastIndex;

    const closing = match[1] === "/";
    const tag = match[2].toLowerCase();
    if (!ALLOWED_TAGS.has(tag)) continue;

    if (closing) {
      if (!VOID_TAGS.has(tag)) out.push(`</${tag}>`);
      continue;
    }
    if (tag === "a") {
      const href = readHref(match[3]);
      out.push(href ? `<a href="${escapeAttribute(href)}" target="_blank" rel="noopener noreferrer">` : "<a>");
      continue;
    }
    out.push(`<${tag}>`);
  }
  out.push(escapeText(html.slice(last)));

  return out.join("").trim();
}
