const fs = require("node:fs/promises");
const path = require("node:path");
const { createHash } = require("node:crypto");
const Parser = require("rss-parser");

const parser = new Parser({
  customFields: {
    item: [
      "content:encoded",
      "content",
      "description",
      "summary",
      "media:content",
      "media:thumbnail",
    ],
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

const ARTICLES_PER_FEED = 1;
const MAX_CONTENT_LENGTH = 360;
const MAX_SUMMARY_LENGTH = 220;
const MAX_TRANSLATION_CHUNK_LENGTH = 450;
const OUTPUT_FIELDS = ["id", "titulo", "resumen", "contenido", "fuente", "fecha", "imagen"];
const OUTPUT_TEXT_FIELDS = OUTPUT_FIELDS.filter((field) => field !== "imagen");

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

function cleanText(value) {
  return decodeEntities(String(value || "")
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<(?:br|\/p|\/div|\/li|\/h[1-6])\b[^>]*>/gi, "\n")
    .replace(/<[^>]*>/g, " "))
    .replace(/(?:https?:\/\/|www\.)[^\s<>"']+/gi, " ")
    .replace(/\b[\w.-]+\.(?:com|org|net|io|gov|edu|co|uk|es)(?:\/[^\s<>"']*)?/gi, " ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function getParagraphs(value) {
  return cleanText(value)
    .split(/\n+/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

function truncateText(value, maxLength) {
  if (value.length <= maxLength) return value;
  const shortened = value.slice(0, maxLength);
  const lastSpace = shortened.lastIndexOf(" ");
  return `${shortened.slice(0, lastSpace > 0 ? lastSpace : maxLength).trimEnd()}…`;
}

function getArticleContent(item) {
  const contentFields = [
    item["content:encoded"],
    item.content,
    item.description,
    item.summary,
    item.contentSnippet,
  ];

  for (const field of contentFields) {
    const paragraphs = getParagraphs(field);
    if (paragraphs.length) return paragraphs;
  }

  return [];
}

function toSafeImageUrl(value, baseUrl) {
  try {
    const url = new URL(decodeEntities(String(value || "")).trim(), baseUrl);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : "";
  } catch {
    return "";
  }
}

function getImageUrlFromMedia(media, baseUrl) {
  const mediaItems = Array.isArray(media) ? media : [media];
  for (const item of mediaItems) {
    const type = item?.$?.type || item?.type || item?.mimeType || "";
    const medium = item?.$?.medium || item?.medium || "";
    if ((type && !type.startsWith("image/")) || (medium && medium !== "image")) continue;

    const value = typeof item === "string"
      ? item
      : item?.$?.url || item?.$?.href || item?.url || item?.href;
    const safeUrl = toSafeImageUrl(value, baseUrl);
    if (safeUrl) return safeUrl;
  }
  return "";
}

function getImageUrlFromHtml(value, baseUrl) {
  const html = String(value || "");
  const imageTag = html.match(/<img\b[^>]*>/i)?.[0];
  if (!imageTag) return "";

  const attributes = [
    ...imageTag.matchAll(/\b(?:src|data-src|data-lazy-src|data-original)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi),
  ];
  for (const match of attributes) {
    const safeUrl = toSafeImageUrl(match[1] || match[2] || match[3], baseUrl);
    if (safeUrl) return safeUrl;
  }

  const srcset = imageTag.match(/\bsrcset\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
  if (srcset) {
    const firstCandidate = (srcset[1] || srcset[2] || srcset[3]).split(",")[0].trim().split(/\s+/)[0];
    return toSafeImageUrl(firstCandidate, baseUrl);
  }

  return "";
}

function findImage(item, baseUrl) {
  const mediaImage = getImageUrlFromMedia(item["media:content"], baseUrl)
    || getImageUrlFromMedia(item["media:thumbnail"], baseUrl)
    || getImageUrlFromMedia(item.enclosure, baseUrl);
  if (mediaImage) return mediaImage;

  return [
    item["content:encoded"],
    item.content,
    item.description,
    item.summary,
  ].map((html) => getImageUrlFromHtml(html, baseUrl)).find(Boolean) || "";
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

function createArticleId(source, title, timestamp) {
  return createHash("sha256")
    .update(`${source}|${title}|${timestamp}`)
    .digest("hex")
    .slice(0, 20);
}

async function fetchFeed(feedUrl) {
  const response = await fetch(feedUrl, {
    headers: {
      Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml",
      "User-Agent": "CFTNewsAggregator/1.0",
    },
    signal: AbortSignal.timeout(20000),
  });

  if (!response.ok) {
    throw new Error(`El feed respondió con HTTP ${response.status}.`);
  }

  return parser.parseString(await response.text());
}

async function getLatestFromFeed(feed) {
  const parsedFeed = await fetchFeed(feed.url);
  return (parsedFeed.items || [])
    .map((item) => {
      const title = cleanText(item.title);
      const paragraphs = getArticleContent(item);
      const timestamp = getPublishedTimestamp(item);
      if (!title || !paragraphs.length || timestamp === null) return null;

      const content = truncateText(paragraphs.join("\n\n"), MAX_CONTENT_LENGTH);
      const summary = truncateText(paragraphs[0], MAX_SUMMARY_LENGTH);
      if (!summary || !content) return null;

      return {
        id: createArticleId(feed.source, title, timestamp),
        titulo: title,
        resumen: summary,
        contenido: content,
        fuente: feed.source,
        fecha: getReadableDate(timestamp),
        imagen: findImage(item, feed.url),
        timestamp,
      };
    })
    .filter(Boolean)
    .sort((first, second) => second.timestamp - first.timestamp)
    .slice(0, ARTICLES_PER_FEED);
}

function splitForTranslation(text) {
  const chunks = [];
  let remaining = text;

  while (remaining.length > MAX_TRANSLATION_CHUNK_LENGTH) {
    let splitAt = remaining.lastIndexOf(" ", MAX_TRANSLATION_CHUNK_LENGTH);
    if (splitAt < MAX_TRANSLATION_CHUNK_LENGTH * 0.6) {
      splitAt = MAX_TRANSLATION_CHUNK_LENGTH;
    }
    chunks.push(remaining.slice(0, splitAt).trim());
    remaining = remaining.slice(splitAt).trim();
  }

  if (remaining) chunks.push(remaining);
  return chunks;
}

async function translateChunk(text) {
  const url = new URL("https://api.mymemory.translated.net/get");
  url.searchParams.set("q", text);
  url.searchParams.set("langpair", "en|es");

  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) {
    throw new Error(`El servicio gratuito de traducción respondió con HTTP ${response.status}.`);
  }

  const result = await response.json();
  if (result.responseStatus !== 200 || result.quotaFinished) {
    throw new Error(result.responseDetails || "El servicio gratuito de traducción no está disponible.");
  }

  const translated = cleanText(result.responseData?.translatedText);
  if (!translated) throw new Error("El servicio gratuito devolvió una traducción vacía.");
  return translated;
}

async function translateOrKeepOriginal(text) {
  const chunks = splitForTranslation(text);
  const translatedChunks = [];

  for (const chunk of chunks) {
    try {
      translatedChunks.push(await translateChunk(chunk));
    } catch (error) {
      console.warn(`Traducción no disponible; se conserva el texto RSS: ${error.message}`);
      translatedChunks.push(chunk);
    }
  }

  return cleanText(translatedChunks.join(" "));
}

async function translateArticle(article) {
  const titulo = await translateOrKeepOriginal(article.titulo);
  const resumen = await translateOrKeepOriginal(article.resumen);
  const contenido = await translateOrKeepOriginal(article.contenido);

  return {
    id: article.id,
    titulo,
    resumen,
    contenido,
    fuente: article.fuente,
    fecha: article.fecha,
    imagen: article.imagen,
  };
}

function isSafeImageUrl(value) {
  if (!value) return true;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function hasExpectedFields(article) {
  return article
    && typeof article === "object"
    && !Array.isArray(article)
    && OUTPUT_FIELDS.length === Object.keys(article).length
    && OUTPUT_FIELDS.every((field) => Object.hasOwn(article, field))
    && OUTPUT_FIELDS.every((field) => typeof article[field] === "string")
    && OUTPUT_TEXT_FIELDS.every((field) => !/(?:https?:\/\/|www\.)/i.test(article[field]))
    && OUTPUT_TEXT_FIELDS.every((field) => !/<\/?a\b/i.test(article[field]))
    && isSafeImageUrl(article.imagen);
}

async function main() {
  const feedResults = await Promise.allSettled(feeds.map(async (feed) => ({
    feed,
    articles: await getLatestFromFeed(feed),
  })));
  const articles = [];

  feedResults.forEach((result, index) => {
    if (result.status === "rejected") {
      console.warn(
        `No se pudo actualizar ${feeds[index].source} (${feeds[index].url}): ${result.reason.message}`
      );
      return;
    }

    if (!result.value.articles.length) {
      console.warn(`El feed de ${result.value.feed.source} no contiene noticias válidas en esta ejecución.`);
      return;
    }

    articles.push(...result.value.articles);
  });

  if (!articles.length) {
    console.warn("Ningún feed respondió con noticias; se conserva data/noticias.json sin cambios.");
    return;
  }

  const uniqueArticles = [...new Map(articles.map((article) => [article.id, article])).values()]
    .sort((first, second) => second.timestamp - first.timestamp);
  const news = [];
  for (const article of uniqueArticles) {
    news.push(await translateArticle(article));
  }

  if (!news.every(hasExpectedFields)) {
    throw new Error("La salida contiene campos no permitidos, enlaces o datos con formato inválido.");
  }

  const outputPath = path.join(__dirname, "..", "data", "noticias.json");
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, `${JSON.stringify(news, null, 2)}\n`, "utf8");
  console.log(`Se guardaron ${news.length} noticias sin enlaces externos en ${outputPath}.`);
}

main().catch((error) => {
  console.error("No se pudieron guardar las noticias:", error);
  process.exitCode = 1;
});
