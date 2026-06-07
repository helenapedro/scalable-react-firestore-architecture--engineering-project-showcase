import { readFileSync, writeFileSync } from "node:fs";

const inputPath = process.argv[2] || "zepedro-firestore-projects.json";
const outputPath = process.argv[3] || "zepedro-firestore-projects.pdf";

const payload = JSON.parse(readFileSync(inputPath, "utf-8"));
const projects = Array.isArray(payload.projects) ? payload.projects : [];

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const MARGIN_X = 48;
const MARGIN_TOP = 48;
const MARGIN_BOTTOM = 48;
const LINE_GAP = 3;

const normalizeText = (value) =>
  String(value ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[–—]/g, "-")
    .replace(/\u00a0/g, " ")
    .replace(/[^\x09\x0a\x0d\x20-\x7e\xa0-\xff]/g, "");

const displayValue = (value) => {
  if (value == null || value === "") return null;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return normalizeText(value);
  }
  if (Array.isArray(value)) {
    if (!value.length) return null;
    return value
      .map((item) => {
        if (typeof item === "string" || typeof item === "number" || typeof item === "boolean") {
          return normalizeText(item);
        }
        return normalizeText(JSON.stringify(item));
      })
      .join("\n");
  }
  return normalizeText(JSON.stringify(value, null, 2));
};

const titleValue = (project) => {
  const title = project.title;
  if (typeof title === "string") return title;
  if (title && typeof title === "object") {
    return title.en || title.pt || Object.values(title).find((item) => typeof item === "string") || project.id;
  }
  return project.id || "Untitled project";
};

const timestampValue = (value) => {
  if (!value) return null;
  if (typeof value === "object" && typeof value.seconds === "number") {
    return new Date(value.seconds * 1000).toISOString();
  }
  return displayValue(value);
};

const fieldRows = (project) => {
  const preferred = [
    ["ID", project.id],
    ["Slug", project.slug],
    ["Titulo", project.title],
    ["Categoria", project.categoryId],
    ["Organizacao", project.organization],
    ["Cliente", project.client],
    ["Localizacao", project.location],
    ["Periodo", project.period],
    ["Visivel", project.isVisible],
    ["Contexto", project.context],
    ["Responsabilidades / Atividades", project.responsibilities || project.activities],
    ["Resultados", project.results],
    ["Metricas", project.metrics],
    ["Competencias destacadas", project.skillsShowcased],
    ["Desfecho do projeto", project.projectOutcome || project.finalDescription],
    ["Midia", project.media],
    ["Modelo / assets", project.modelAsset || project.modelAssets],
    ["Criado em", timestampValue(project.createdAt)],
    ["Atualizado em", timestampValue(project.updatedAt)],
    ["Metadata de migracao", project.migrationMeta],
  ];

  const seen = new Set(
    preferred
      .map(([_, value]) => value)
      .filter((value) => value !== undefined)
  );
  const extra = Object.entries(project)
    .filter(([key, value]) => !seen.has(value) && !["id"].includes(key))
    .map(([key, value]) => [key, value]);

  return [...preferred, ...extra]
    .map(([label, value]) => [label, displayValue(value)])
    .filter(([, value]) => value);
};

const wrapLine = (text, fontSize, indent = "") => {
  const maxChars = Math.max(24, Math.floor((PAGE_WIDTH - MARGIN_X * 2) / (fontSize * 0.5)));
  const available = Math.max(12, maxChars - indent.length);
  const lines = [];

  for (const rawLine of normalizeText(text).split("\n")) {
    const words = rawLine.split(/\s+/).filter(Boolean);
    if (!words.length) {
      lines.push("");
      continue;
    }

    let line = "";
    for (const word of words) {
      if (!line) {
        line = word;
      } else if (`${line} ${word}`.length <= available) {
        line += ` ${word}`;
      } else {
        lines.push(indent + line);
        line = word;
      }
    }
    if (line) lines.push(indent + line);
  }

  return lines;
};

const pages = [];
let currentPage = [];
let y = PAGE_HEIGHT - MARGIN_TOP;

const newPage = () => {
  if (currentPage.length) pages.push(currentPage);
  currentPage = [];
  y = PAGE_HEIGHT - MARGIN_TOP;
};

const addText = (text, { fontSize = 10, leading = fontSize + LINE_GAP, indent = 0 } = {}) => {
  const prefix = " ".repeat(indent);
  const lines = wrapLine(text, fontSize, prefix);
  for (const line of lines) {
    if (y < MARGIN_BOTTOM + leading) newPage();
    currentPage.push({ text: line, x: MARGIN_X, y, fontSize });
    y -= leading;
  }
};

const addGap = (size = 8) => {
  y -= size;
  if (y < MARGIN_BOTTOM) newPage();
};

addText("Projetos de ZePedro - Export Firestore", { fontSize: 18, leading: 24 });
addText(`Exportado em: ${payload.exportedAt || new Date().toISOString()}`, { fontSize: 10 });
addText(`Total de projetos: ${projects.length}`, { fontSize: 10 });
addGap(12);

projects.forEach((project, index) => {
  if (index > 0) addGap(12);
  addText(`${index + 1}. ${titleValue(project)}`, { fontSize: 14, leading: 18 });
  addGap(2);

  for (const [label, value] of fieldRows(project)) {
    addText(`${label}:`, { fontSize: 10, leading: 13 });
    const renderedLines = String(value).split("\n");
    for (const line of renderedLines) {
      addText(line, { fontSize: 9, leading: 12, indent: 2 });
    }
    addGap(2);
  }
});

if (currentPage.length) pages.push(currentPage);

const escapePdfText = (text) =>
  normalizeText(text)
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");

const pageContent = (page) =>
  page
    .map(({ text, x, y: lineY, fontSize }) => {
      return `BT /F1 ${fontSize} Tf ${x} ${lineY.toFixed(2)} Td (${escapePdfText(text)}) Tj ET\n`;
    })
    .join("");

const objects = [];
const addObject = (body) => {
  objects.push(body);
  return objects.length;
};

const catalogId = addObject("<< /Type /Catalog /Pages 2 0 R >>");
const pagesId = addObject("");
const fontId = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
const pageIds = [];

for (const page of pages) {
  const content = pageContent(page);
  const contentBytes = Buffer.from(content, "latin1");
  const contentId = addObject(`<< /Length ${contentBytes.length} >>\nstream\n${content}endstream`);
  const pageId = addObject(
    `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${contentId} 0 R >>`
  );
  pageIds.push(pageId);
}

objects[pagesId - 1] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`;

const chunks = [Buffer.from("%PDF-1.4\n%\xe2\xe3\xcf\xd3\n", "binary")];
const offsets = [0];

objects.forEach((body, index) => {
  offsets[index + 1] = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  chunks.push(Buffer.from(`${index + 1} 0 obj\n${body}\nendobj\n`, "latin1"));
});

const xrefOffset = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
for (let i = 1; i <= objects.length; i += 1) {
  xref += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
}
xref += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
chunks.push(Buffer.from(xref, "latin1"));

writeFileSync(outputPath, Buffer.concat(chunks));
console.log(`Generated ${outputPath} with ${projects.length} projects and ${pages.length} pages.`);
