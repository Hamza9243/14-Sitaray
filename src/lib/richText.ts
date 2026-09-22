/**
 * The CMS rich-text editor stores a tiny, sanitised HTML subset (p, br, strong, em, u, h2, h3, ul, ol, li,
 * blockquote); older / seeded content is plain text with blank lines between paragraphs. These helpers accept
 * either and are shared by the admin editor and the child app.
 */
const ALLOWED = new Set(['P', 'BR', 'STRONG', 'B', 'EM', 'I', 'U', 'H2', 'H3', 'UL', 'OL', 'LI', 'BLOCKQUOTE']);
const looksLikeHtml = (s: string) => /<\/?(p|br|strong|b|em|i|u|h2|h3|ul|ol|li|blockquote|div|span)\b/i.test(s);

const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function plainToHtml(text: string): string {
  return text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${escapeHtml(p).replace(/\n/g, '<br>')}</p>`)
    .join('');
}

/** Removes every tag/attribute outside the allowed subset (keeps the text of removed tags). Empty paragraphs are dropped unless keepEmptyBlocks (the editor keeps them while typing). */
export function sanitizeRichText(input: string | null | undefined, keepEmptyBlocks = false): string {
  if (!input) return '';
  const html = looksLikeHtml(input) ? input : plainToHtml(input);
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');

  const clean = (node: Node): string => {
    let out = '';
    node.childNodes.forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) {
        out += escapeHtml(child.textContent ?? '');
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        const el = child as Element;
        const tag = el.tagName.toUpperCase();
        if (tag === 'SCRIPT' || tag === 'STYLE') return;
        const inner = clean(el);
        if (tag === 'DIV') out += `<p>${inner}</p>`;
        else if (ALLOWED.has(tag)) out += tag === 'BR' ? '<br>' : `<${tag.toLowerCase()}>${inner}</${tag.toLowerCase()}>`;
        else out += inner;
      }
    });
    return out;
  };
  return clean(doc.body).replace(/<p>(\s|<br>)*<\/p>/g, '');
}

/** One string per paragraph / list item / heading, formatting removed — what the child app shows page by page. */
export function richTextToParagraphs(input: string | null | undefined): string[] {
  if (!input) return [];
  if (!looksLikeHtml(input)) return input.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const doc = new DOMParser().parseFromString(`<body>${sanitizeRichText(input)}</body>`, 'text/html');
  const out: string[] = [];
  doc.body.querySelectorAll('p, h2, h3, li, blockquote').forEach((el) => {
    if (el.tagName === 'BLOCKQUOTE' && el.querySelector('p')) return;
    const text = (el.textContent ?? '').replace(/\s+/g, ' ').trim();
    if (text) out.push(text);
  });
  if (out.length === 0) {
    const text = (doc.body.textContent ?? '').trim();
    if (text) out.push(text);
  }
  return out;
}

export function richTextToPlain(input: string | null | undefined): string {
  return richTextToParagraphs(input).join('\n\n');
}
