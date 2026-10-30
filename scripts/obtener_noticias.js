const fs = require("node:fs/promises");
const path = require("node:path");
const Parser = require("rss-parser");

const parser = new Parser({
  customFields: {
    item: ["media:content", "media:thumbnail", "content:encoded", "itunes:image"],
  },
});

const feeds = [
  "https://elchapuzasinformatico.com/feed/",
  "https://www.xataka.com/feedburner.xml",
  "https://hardzone.es/feed/",
];

function asArray(value) {
  return Array.isArray(value) ? value : value ? [value] : [];
}

function findImage(item) {
  const mediaFields = [
    ...asArray(item["media:content"]),
    ...asArray(item["media:thumbnail"]),
    ...asArray(item["itunes:image"]),
  ];

  for (const media of mediaFields) {
    const url = typeof media === "string"
      ? media
      : media?.$?.url || media?.$?.href || media?.url || media?.href;
    if (url) return url;
  }

  if (item.image?.url) return item.image.url;

  if (item.enclosure?.url && item.enclosure.type?.startsWith("image/")) {
    return item.enclosure.url;
  }

  const content = [
    item["content:encoded"],
    item.content,
    item.description,
    item.summary,
  ].filter(Boolean).join(" ");
  const match = content.match(/<img\b[^>]*\b(?:src|data-src)\s*=\s*(["'])(.*?)\1/i);
  return match?.[2] || "";
}

function cleanDescription(value) {
  return String(value || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function toHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : "";
  } catch {
    return "";
  }
}

async function getLatestFromFeed(feedUrl) {
  const feed = await parser.parseURL(feedUrl);
  const entries = (feed.items || [])
    .map((item) => {
      const published = item.isoDate || item.pubDate || "";
      const timestamp = Date.parse(published);
      const content = cleanDescription(
        item["content:encoded"] || item.content || item.description || item.summary || item.contentSnippet
      );
      return {
        titulo: cleanDescription(item.title),
        descripcion: cleanDescription(
          item.contentSnippet || item.description || item.summary || item["content:encoded"]
        ) || "Descripción no disponible.",
        contenido: content || "Contenido no disponible en la fuente RSS.",
        url: toHttpUrl(item.link),
        imagen: toHttpUrl(findImage(item)),
        fecha: Number.isNaN(timestamp) ? "" : new Date(timestamp).toISOString(),
        timestamp: Number.isNaN(timestamp) ? 0 : timestamp,
      };
    })
    .filter((item) => item.titulo && item.url)
    .sort((first, second) => second.timestamp - first.timestamp)
    .slice(0, 2)
    .map(({ timestamp, ...item }) => item);

  if (entries.length !== 2) {
    throw new Error(`El feed ${feedUrl} no contiene dos noticias válidas.`);
  }

  return entries;
}

async function main() {
  const newsByFeed = await Promise.all(feeds.map(getLatestFromFeed));
  const news = newsByFeed
    .flat()
    .sort((first, second) => (Date.parse(second.fecha) || 0) - (Date.parse(first.fecha) || 0));
  const outputPath = path.join(__dirname, "..", "data", "noticias.json");

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, `${JSON.stringify(news, null, 2)}\n`, "utf8");
  console.log(`Se guardaron ${news.length} noticias en ${outputPath}.`);
}

main().catch((error) => {
  console.error("No se pudieron actualizar las noticias:", error);
  process.exitCode = 1;
});
