// Helpers to build fallback `details` when missing
export const safeParseJSON = (s: any) => {
  if (s == null) return null;
  if (typeof s !== "string") return s;
  try {
    return JSON.parse(s);
  } catch (e) {
    return null;
  }
};

// Sanitize imported HTML and remove common advertising/noise strings
export const sanitizeHtmlString = (input: any) => {
  if (!input) return "";
  let s = String(input);
  // remove HTML comments
  s = s.replace(/<!--([\s\S]*?)-->/g, "");
  // remove social/share anchors
  s = s.replace(
    /<a[^>]*(?:linkedin|pinterest|whatsapp|facebook|twitter|share)[^>]*>[\s\S]*?<\/a>/gi,
    ""
  );
  // remove scripts/styles
  s = s.replace(/<script[\s\S]*?<\/script>/gi, "");
  s = s.replace(/<style[\s\S]*?<\/style>/gi, "");
  // remove common Vietnamese ad phrases and polite notices
  s = s.replace(/Quảng\s*cáo[\s\S]*?(?=<|$)/gi, "");
  s = s.replace(/LUÔN\s*MIỄN\s*PHÍ/gi, "");
  s = s.replace(/Xin\s*lỗi[\s\S]*?(?=<|$)/gi, "");
  // collapse repeated breaks
  s = s.replace(/(<br\s*\/?>\s*){2,}/gi, "<br><br>");
  // trim excessive whitespace
  s = s.replace(/\s{2,}/g, " ");
  return s.trim();
};

export const stripTags = (s: string) =>
  (s || "")
    .replace(/<[^>]+>/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();

// Remove ad/noise lines from imported text/html
export const removeAdText = (input: any) => {
  if (!input) return "";
  let s = String(input);
  // normalize newlines
  s = s.replace(/\r\n?/g, "\n");
  // remove known ad blocks or polite notices
  s = s.replace(/Quảng\s*cáo\s*giúp[\s\S]*?LUÔN\s*MIỄN\s*PHÍ/gi, "");
  s = s.replace(/Quảng\s*cáo[\s\S]*?(?=\n|$)/gi, "");
  s = s.replace(/LUÔN\s*MIỄN\s*PHÍ/gi, "");
  s = s.replace(/Xin\s*lỗi[\s\S]*?(?=\n|$)/gi, "");
  s = s.replace(/Xin\s*lỗi\s*vì[\s\S]*?(?=\n|$)/gi, "");
  // remove lines that only contain ad/noise
  s = s
    .split("\n")
    .filter(line => !/^\s*(Quảng\s*cáo|Quảng\s*cáo\s*giúp|LUÔN\s*MIỄN\s*PHÍ|Xin\s*lỗi)/i.test(line))
    .join("\n");
  s = s.replace(/\n{2,}/g, "\n\n").trim();
  return s;
};

export const extractTitleFromHtml = (html: any) => {
  if (!html) return null;
  const h = String(html);
  let m = h.match(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/i);
  if (m && m[1]) return stripTags(m[1]);
  m = h.match(/<strong[^>]*>([\s\S]*?)<\/strong>/i) || h.match(/<b[^>]*>([\s\S]*?)<\/b>/i);
  if (m && m[1]) return stripTags(m[1]);
  m =
    h.match(/Cấu\s*trúc[\s\S]*?<strong[^>]*>([\s\S]*?)<\/strong>/i) ||
    h.match(/Cấu\s*trúc\s*[:：\-]*\s*([^<\n\r]+)/i);
  if (m && m[1]) return stripTags(m[1]);
  const text = stripTags(h);
  const lines = text
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(Boolean);
  return lines[0] || null;
};

export const parseExamplesField = (examples: any) => {
  if (!examples) return [];
  if (Array.isArray(examples))
    return examples.map(e => (typeof e === "string" ? { japanese: e, vietnamese: "" } : e));
  if (typeof examples === "string") {
    const s = examples.trim();
    if (!s) return [];
    if (s.startsWith("[")) {
      try {
        const arr = JSON.parse(s);
        if (Array.isArray(arr))
          return arr.map(a => (typeof a === "string" ? { japanese: a, vietnamese: "" } : a));
      } catch (e) {
        // fallthrough
      }
    }
    // split by newlines
    return s
      .split(/\r?\n+/)
      .map(l => ({ japanese: l.trim(), vietnamese: "" }))
      .filter(x => x.japanese);
  }
  return [];
};

export const buildDetailsFromFields = (row: any) => {
  // 1. prefer normalized sections if available (new schema)
  if (Array.isArray(row.sections) && row.sections.length > 0) {
    return row.sections.map((s: any) => ({
      header: s.header || "Chi tiết",
      html: s.content_html || null,
      text: s.content_text || null,
    }));
  }

  // 2. prefer existing details if valid (legacy fallback)
  if (Array.isArray(row.details) && row.details.length > 0) {
    const processed: any[] = [];
    for (const d of row.details) {
      if (typeof d === "string") {
        const cleaned = removeAdText(stripTags(d));
        if (cleaned) processed.push({ header: "Chi tiết", text: cleaned });
      } else if (d && (d.text || d.html)) {
        const raw = d.text || d.html || "";
        const cleanedText = removeAdText(stripTags(raw));
        const cleanedHtml = d.html ? removeAdText(String(d.html)) : null;
        if (cleanedText || (cleanedHtml && stripTags(cleanedHtml).trim())) {
          processed.push({
            header: d.header || "Chi tiết",
            text: cleanedText || null,
            html: cleanedHtml || null,
          });
        }
      } else {
        const cleaned = removeAdText(stripTags(JSON.stringify(d)));
        if (cleaned) processed.push({ header: "Chi tiết", text: cleaned });
      }
    }
    if (processed.length > 0) return processed;
  }
  if (typeof row.details === "string") {
    const parsed = safeParseJSON(row.details);
    if (Array.isArray(parsed) && parsed.length > 0) {
      const proc = parsed
        .map((d: any) => {
          if (typeof d === "string") {
            const cleaned = removeAdText(stripTags(d));
            return cleaned ? { header: "Chi tiết", text: cleaned } : null;
          }
          const raw = d.text || d.html || JSON.stringify(d);
          const cleanedText = removeAdText(stripTags(raw));
          const cleanedHtml = d.html ? removeAdText(String(d.html)) : null;
          if (cleanedText || (cleanedHtml && stripTags(cleanedHtml).trim())) {
            return {
              header: d.header || "Chi tiết",
              text: cleanedText || null,
              html: cleanedHtml || null,
            };
          }
          return null;
        })
        .filter(Boolean);
      if (proc.length) return proc;
    }
  }

  // 3. prefer full_html/raw html fields
  const rawHtml = row.full_html || row.html || null;
  if (rawHtml && String(rawHtml).trim() !== "") {
    const cleaned = sanitizeHtmlString(rawHtml);
    if (cleaned) {
      // split into sections by double breaks or paragraph tags, clean ad text from each part
      const parts = cleaned
        .split(/<br\s*\/?>(?:\s*<br\s*\/?>)|<\/p>\s*<p>|<div[^>]*>\s*<div[^>]*>/i)
        .map((p: string) => p.trim())
        .filter(Boolean)
        .map((p: string) => removeAdText(p))
        .filter(Boolean);
      if (parts.length > 1) return parts.map((p: string) => ({ header: "Imported", html: p }));
      const single = removeAdText(cleaned);
      if (single) return [{ header: "Imported", html: single }];
    }
  }

  // ... rest of fallbacks ...
  const parts: string[] = [];
  if (row.title) parts.push(String(row.title));
  if (row.meaning) parts.push(String(row.meaning));
  if (row.note) parts.push(String(row.note));
  if (parts.length > 0) return [{ header: "Info", text: parts.join("\n\n") }];

  return [];
};
