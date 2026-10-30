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

const ARTICLES_PER_FEED = 2;
const MIN_CONTENT_LENGTH = 900;
const MIN_SUMMARY_LENGTH = 70;
const MAX_SUMMARY_LENGTH = 240;
const MIN_PARAGRAPHS = 3;
const MIN_IMAGE_WIDTH = 800;
const MAX_TRANSLATION_CHUNK_LENGTH = 450;
const OUTPUT_FIELDS = ["id", "titulo", "resumen", "contenido", "fuente", "fecha", "imagen"];
const OUTPUT_TEXT_FIELDS = OUTPUT_FIELDS.filter((field) => field !== "imagen");
const feeds = [
  {
    url: "https://feeds.arstechnica.com/arstechnica/index",
    source: "Ars Technica",
  },
  {
    url: "https://techcrunch.com/feed/",
    source: "TechCrunch",
  },
  {
    url: "https://www.theverge.com/rss/index.xml",
    source: "The Verge",
  },
  {
    url: "https://www.wired.com/feed/rss",
    source: "WIRED",
  },
];

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
  const articleFields = [
    item["content:encoded"],
    item.content,
  ];
  const summaryFields = [
    item.description,
    item.summary,
    item.contentSnippet,
  ];

  const articleParagraphs = articleFields
    .map(getParagraphs)
    .find((paragraphs) => paragraphs.length);
  const summaryParagraphs = summaryFields.map(getParagraphs).find((paragraphs) => paragraphs.length);

  if (!articleParagraphs) return { paragraphs: [], summary: "" };

  const summary = summaryParagraphs?.[0] || articleParagraphs[0];
  const paragraphs = articleParagraphs;
  const content = paragraphs.join("\n\n");
  const appearsTruncated = /(?:…|\.{3}|\[\s*(?:read|continue|more)[^\]]*\])\s*$/i.test(content);

  if (
    paragraphs.length < MIN_PARAGRAPHS
    || content.length < MIN_CONTENT_LENGTH
    || appearsTruncated
  ) {
    return { paragraphs: [], summary: "" };
  }

  return { paragraphs, summary };
}

function toSafeImageUrl(value, baseUrl) {
  try {
    const url = new URL(decodeEntities(String(value || "")).trim(), baseUrl);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : "";
  } catch {
    return "";
  }
}

function getImageCandidatesFromMedia(media, baseUrl) {
  const mediaItems = Array.isArray(media) ? media : [media];
  return mediaItems.flatMap((item) => {
    const type = item?.$?.type || item?.type || item?.mimeType || "";
    const medium = item?.$?.medium || item?.medium || "";
    if ((type && !type.startsWith("image/")) || (medium && medium !== "image")) return [];

    const url = toSafeImageUrl(
      typeof item === "string" ? item : item?.$?.url || item?.url || item?.href,
      baseUrl
    );
    const width = Number(item?.$?.width || item?.width || 0);
    return url && Number.isFinite(width) ? [{ url, width }] : [];
  });
}

function getAttribute(tag, name) {
  const match = tag.match(new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"));
  return match ? match[1] || match[2] || match[3] || "" : "";
}

function getImageCandidatesFromHtml(value, baseUrl) {
  const tags = String(value || "").match(/<img\b[^>]*>/gi) || [];
  return tags.flatMap((tag) => {
    const srcset = getAttribute(tag, "srcset");
    const srcsetCandidates = srcset.split(",").map((candidate) => {
      const [urlValue, descriptor] = candidate.trim().split(/\s+/);
      const width = descriptor?.endsWith("w")
        ? Number.parseInt(descriptor, 10)
        : Number.parseInt(getAttribute(tag, "width"), 10);
      const url = toSafeImageUrl(urlValue, baseUrl);
      return url && Number.isFinite(width) ? { url, width } : null;
    }).filter(Boolean);

    const fallbackUrl = toSafeImageUrl(
      getAttribute(tag, "src")
        || getAttribute(tag, "data-src")
        || getAttribute(tag, "data-lazy-src")
        || getAttribute(tag, "data-original"),
      baseUrl
    );
    const declaredWidth = Number.parseInt(getAttribute(tag, "width"), 10);
    const fallbackCandidate = fallbackUrl && Number.isFinite(declaredWidth)
      ? [{ url: fallbackUrl, width: declaredWidth }]
      : [];
    return [...srcsetCandidates, ...fallbackCandidate];
  });
}

function findImage(item, baseUrl) {
  const candidates = [
    ...getImageCandidatesFromMedia(item["media:content"], baseUrl),
    ...getImageCandidatesFromMedia(item["media:thumbnail"], baseUrl),
    ...getImageCandidatesFromMedia(item.enclosure, baseUrl),
    ...[
      item["content:encoded"],
      item.content,
      item.description,
      item.summary,
    ].flatMap((html) => getImageCandidatesFromHtml(html, baseUrl)),
  ];

  return candidates
    .filter((candidate) => candidate.width >= MIN_IMAGE_WIDTH)
    .sort((first, second) => second.width - first.width)[0]?.url || "";
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
      const { paragraphs, summary: summaryText } = getArticleContent(item);
      const timestamp = getPublishedTimestamp(item);
      const image = findImage(item, feed.url);
      if (!title || paragraphs.length < MIN_PARAGRAPHS || timestamp === null || !image) return null;

      const contentParagraphs = paragraphs;
      const summary = truncateText(summaryText, MAX_SUMMARY_LENGTH);
      const content = contentParagraphs.join("\n\n");
      if (
        summary.length < MIN_SUMMARY_LENGTH
        || content.length < MIN_CONTENT_LENGTH
        || /(?:…|\.{3}|\[\s*(?:read|continue|more)[^\]]*\])\s*$/i.test(content)
      ) return null;

      return {
        id: createArticleId(feed.source, title, timestamp),
        titulo: title,
        resumen: summary,
        contentParagraphs,
        contenido: content,
        fuente: feed.source,
        fecha: getReadableDate(timestamp),
        imagen: image,
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

async function translateRequired(text) {
  const chunks = splitForTranslation(text);
  const translatedChunks = [];

  for (const chunk of chunks) {
    translatedChunks.push(await translateChunk(chunk));
  }

  return cleanText(translatedChunks.join(" "));
}

async function translateParagraphs(paragraphs) {
  const translatedParagraphs = [];
  for (const paragraph of paragraphs) {
    translatedParagraphs.push(await translateRequired(paragraph));
  }
  return translatedParagraphs.filter(Boolean).join("\n\n");
}

async function translateArticle(article) {
  const titulo = await translateRequired(article.titulo);
  const resumen = await translateRequired(article.resumen);
  const contenido = await translateParagraphs(article.contentParagraphs);

  const translatedArticle = {
    id: article.id,
    titulo,
    resumen,
    contenido,
    fuente: article.fuente,
    fecha: article.fecha,
    imagen: article.imagen,
  };

  if (
    translatedArticle.resumen.length < MIN_SUMMARY_LENGTH
    || translatedArticle.contenido.length < MIN_CONTENT_LENGTH
    || translatedArticle.contenido.split(/\n{2,}/).length < MIN_PARAGRAPHS
    || /(?:…|\.{3}|\[\s*(?:read|continue|more)[^\]]*\])\s*$/i.test(translatedArticle.contenido)
    || !hasExpectedFields(translatedArticle)
  ) {
    throw new Error("La noticia traducida no cumple los filtros de calidad.");
  }

  return translatedArticle;
}

function isSafeImageUrl(value) {
  if (!value) return false;
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
    && OUTPUT_FIELDS.every((field) => article[field].trim().length > 0)
    && OUTPUT_TEXT_FIELDS.every((field) => !/(?:https?:\/\/|www\.)/i.test(article[field]))
    && OUTPUT_TEXT_FIELDS.every((field) => !/<\/?a\b/i.test(article[field]))
    && isSafeImageUrl(article.imagen);
}

async function main() {
  const feedResults = await Promise.allSettled(feeds.map(async (feed) => ({
    feed,
    articles: await getLatestFromFeed(feed),
  })));
  if (feedResults.every((result) => result.status === "rejected")) {
    console.warn("No se pudo consultar ningún feed; se conserva data/noticias.json.");
    return;
  }

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
    console.warn("Ningún feed proporcionó noticias completas con imagen; se publicará una lista vacía.");
  }

  const uniqueArticles = [...new Map(articles.map((article) => [article.id, article])).values()]
    .sort((first, second) => second.timestamp - first.timestamp);
  const news = [];
  for (const article of uniqueArticles) {
    try {
      news.push(await translateArticle(article));
    } catch (error) {
      console.warn(`Se descarta "${article.titulo}": ${error.message}`);
    }
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
