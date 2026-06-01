// Minimal, dependency-free markdown → HTML renderer for the AI insight card.
// Supports: ## h2, ### h3, **bold**, *em*, `code`, - lists, paragraphs.
// Output is escaped first, then specific tokens are converted.

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function inline(s: string): string {
  // bold **x**
  let out = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  // em *x*
  out = out.replace(/(^|[^*])\*([^*]+)\*(?!\*)/g, "$1<em>$2</em>");
  // code `x`
  out = out.replace(/`([^`]+)`/g, "<code>$1</code>");
  return out;
}

export function renderMarkdown(raw: string): string {
  const escaped = escapeHtml(raw.trim());
  const lines = escaped.split(/\r?\n/);
  const out: string[] = [];
  let inList = false;
  let paragraph: string[] = [];

  const flushPara = () => {
    if (paragraph.length === 0) return;
    out.push(`<p>${inline(paragraph.join(" "))}</p>`);
    paragraph = [];
  };
  const closeList = () => {
    if (inList) {
      out.push("</ul>");
      inList = false;
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      flushPara();
      closeList();
      continue;
    }
    const h3 = line.match(/^###\s+(.+)$/);
    const h2 = line.match(/^##\s+(.+)$/);
    const h1 = line.match(/^#\s+(.+)$/);
    const li = line.match(/^[-*]\s+(.+)$/);
    if (h3) {
      flushPara();
      closeList();
      out.push(`<h3>${inline(h3[1])}</h3>`);
    } else if (h2) {
      flushPara();
      closeList();
      out.push(`<h2>${inline(h2[1])}</h2>`);
    } else if (h1) {
      flushPara();
      closeList();
      out.push(`<h1>${inline(h1[1])}</h1>`);
    } else if (li) {
      flushPara();
      if (!inList) {
        out.push("<ul>");
        inList = true;
      }
      out.push(`<li>${inline(li[1])}</li>`);
    } else {
      closeList();
      paragraph.push(line);
    }
  }
  flushPara();
  closeList();
  return out.join("\n");
}
