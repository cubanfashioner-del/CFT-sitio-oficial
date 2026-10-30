const fs = require("node:fs/promises");
const path = require("node:path");
const { createHash } = require("node:crypto");
const Parser = require("rss-parser");

const translationApiKey = process.env.GOOGLE_TRANSLATE_API_KEY;
if (!translationApiKey) {
  throw new Error("Falta configurar el secreto GOOGLE_TRANSLATE_API_KEY.");
}

const parser = new Parser({
  customFields: {
    item: ["content:encoded", "content", "description", "summary"],
  },
});

const feeds = [
  {
    url: "https://rss.nytimes.com/services/xml/rss/nyt/Technology.xml",
    source: "The New York Times",
  },
  {
    url: "https://rss.nytimes.com/services/xml/rss/nyt/Science.xml",
    source: "The New York Times",
  },
  {
    url: "https://spectrum.ieee.org/feeds/feed.rss",
    source: "IEEE Spectrum",
  },
  {
    url: "https://www.technologyreview.com/feed/",
    source: "MIT Technology Review",
  },
];

const ARTICLES_PER_FEED = 2;
const MAX_CONTENT_LENGTH = 1200;
const MAX_SUMMARY_LENGTH = 280;
const MAX_TRANSLATION_SEGMENTS = 50;
const MAX_TRANSLATION_CHARACTERS = 25000;

const namedEntities = {
  amp: "&",
  apos: "'",
  bull: "•",
  copy: "©",
  hellip: "…",
  ldquo: "“",
  lsquo: "‘",
  mdash: "—",
  nbsp: " ",
  ndash: "–",
  quot: '"',
  rdquo: "”",
  reg: "®",
  rsquo: "’",
  trade: "™",
};

function decodeEntities(value) {
  return value
    .replace(/&#(\d+);/g, (entity, number) => {
      const codePoint = Number(number);
      return Number.isSafeInteger(codePoint) && codePoint <= 0x10ffff
        ? String.fromCodePoint(codePoint)
        : entity;
    })
    .replace(/&#x([\da-f]+);/gi, (entity, number) => {
      const codePoint = Number.parseInt(number, 16);
      return Number.isSafeInteger(codePoint) && codePoint <= 0x10ffff
        ? String.fromCodePoint(codePoint)
        : entity;
    })
    .replace(/&([a-z]+);/gi, (entity, name) => (
      namedEntities[name.toLowerCase()] || entity
    ));
}

function extractParagraphs(value) {
  const html = String(value || "")
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<(?:br|\/p|\/div|\/li|\/h[1-6])\b[^>]*>/gi, "\n")
    .replace(/<[^>]*>/g, " ");

  return decodeEntities(html)
    .split(/\n+/)
    .map((paragraph) => paragraph.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function truncateText(value, maxLength) {
  if (value.length <= maxLength) return value;
  const shortened = value.slice(0, maxLength);
  const lastSpace = shortened.lastIndexOf(" ");
  return `${shortened.slice(0, lastSpace > 0 ? lastSpace : maxLength).trimEnd()}…`;
}

function getArticleContent(item) {
  const fields = [
    item["content:encoded"],
    item.content,
    item.description,
    item.summary,
    item.contentSnippet,
  ];

  for (const field of fields) {
    const paragraphs = extractParagraphs(field);
    if (paragraphs.length) return paragraphs;
  }

  return [];
}

function getPublishedTimestamp(item) {
  const timestamp = Date.parse(item.isoDate || item.pubDate || "");
  return Number.isFinite(timestamp) ? timestamp : null;
}

function getReadableDate(timestamp) {
  return new Intl.DateTimeFormat("es", {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(timestamp);
}

function createArticleId(source, item, timestamp) {
  const stableIdentifier = item.guid || item.id || item.link || `${item.title}|${timestamp}`;
  return createHash("sha256")
    .update(`${source}|${stableIdentifier}`)
    .digest("hex")
    .slice(0, 20);
}

async function fetchFeed(feedUrl) {
  const response = await fetch(feedUrl, {
    headers: {
      Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml",
      "User-Agent": "CFTNewsAggregator/1.0 (+https://github.com/cubanfashioner-del/CFT-sitio-oficial)",
    },
    signal: AbortSignal.timeout(20000),
  });

  if (!response.ok) {
    throw new Error(`El feed ${feedUrl} respondió con HTTP ${response.status}.`);
  }

  const xml = await response.text();
  return parser.parseString(xml);
}

async function getLatestFromFeed(feed) {
  const parsedFeed = await fetchFeed(feed.url);
  const items = (parsedFeed.items || [])
    .map((item) => {
      const paragraphs = getArticleContent(item);
      const title = extractParagraphs(item.title)[0] || "";
      const timestamp = getPublishedTimestamp(item);
      if (timestamp === null) return null;

      const content = truncateText(
        paragraphs.join("\n\n") || item.contentSnippet || "",
        MAX_CONTENT_LENGTH
      );
      const summary = truncateText(
        paragraphs[0] || item.contentSnippet || "",
        MAX_SUMMARY_LENGTH
      );

      if (!title || !summary || !content) return null;

      return {
        id: createArticleId(feed.source, item, timestamp),
        titulo: title,
        resumen: summary,
        contenido: content,
        fuente: feed.source,
        fecha: getReadableDate(timestamp),
        timestamp,
      };
    })
    .filter(Boolean)
    .sort((first, second) => second.timestamp - first.timestamp)
    .slice(0, ARTICLES_PER_FEED);

  if (!items.length) {
    throw new Error(`El feed de ${feed.source} no contiene noticias válidas.`);
  }

  return items;
}

async function translateToSpanish(texts) {
  const translatedTexts = [];
  let chunk = [];
  let chunkCharacters = 0;

  const translateChunk = async () => {
    if (!chunk.length) return;

    const response = await fetch(
      `https://translation.googleapis.com/language/translate/v2?key=${encodeURIComponent(translationApiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          q: chunk,
          target: "es",
          format: "text",
        }),
        signal: AbortSignal.timeout(20000),
      }
    );

    if (!response.ok) {
      throw new Error(`Google Cloud Translation respondió con HTTP ${response.status}.`);
    }

    const result = await response.json();
    const translations = result.data?.translations;
    if (!Array.isArray(translations) || translations.length !== chunk.length) {
      throw new Error("Google Cloud Translation devolvió una respuesta incompleta.");
    }

    translatedTexts.push(...translations.map((entry) => entry.translatedText));
    chunk = [];
    chunkCharacters = 0;
  };

  for (const text of texts) {
    if (text.length > MAX_TRANSLATION_CHARACTERS) {
      throw new Error("Un texto excede el límite permitido para su traducción.");
    }

    if (
      chunk.length >= MAX_TRANSLATION_SEGMENTS
      || chunkCharacters + text.length > MAX_TRANSLATION_CHARACTERS
    ) {
      await translateChunk();
    }

    chunk.push(text);
    chunkCharacters += text.length;
  }
  await translateChunk();

  return translatedTexts.map((text) => decodeEntities(String(text)).trim());
}

async function main() {
  const newsByFeed = await Promise.all(feeds.map(getLatestFromFeed));
  const seenIds = new Set();
  const articles = newsByFeed
    .flat()
    .filter((article) => {
      if (seenIds.has(article.id)) return false;
      seenIds.add(article.id);
      return true;
    })
    .sort((first, second) => second.timestamp - first.timestamp);

  if (!articles.length) {
    throw new Error("Los feeds no proporcionaron noticias para publicar.");
  }

  const translated = await translateToSpanish(
    articles.flatMap(({ titulo, resumen, contenido }) => [titulo, resumen, contenido])
  );
  const news = articles.map((article, index) => ({
    id: article.id,
    titulo: translated[index * 3],
    resumen: translated[index * 3 + 1],
    contenido: translated[index * 3 + 2],
    fuente: article.fuente,
    fecha: article.fecha,
  }));
  const outputPath = path.join(__dirname, "..", "data", "noticias.json");

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, `${JSON.stringify(news, null, 2)}\n`, "utf8");
  console.log(`Se guardaron ${news.length} noticias RSS traducidas en ${outputPath}.`);
}

main().catch((error) => {
  console.error("No se pudieron actualizar las noticias:", error);
  process.exitCode = 1;
});
