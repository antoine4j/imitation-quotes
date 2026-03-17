const WIKIMEDIA_API_URL = "https://commons.wikimedia.org/w/api.php";
const SEARCH_LIMIT = 6;
const REQUEST_TIMEOUT_MS = 5000;
const SUPPORTED_IMAGE_EXTENSIONS = new Set([
  "jpg",
  "jpeg",
  "png",
  "webp",
]);

function buildSearchQueries(displayName, visualHint) {
  const normalizedDisplayName = displayName.trim();
  const normalizedVisualHint = visualHint?.trim();

  if (normalizedVisualHint) {
    return [
      `${normalizedDisplayName} ${normalizedVisualHint}`,
      normalizedDisplayName,
    ];
  }

  return [normalizedDisplayName];
}

function buildImageAltText(displayName, visualHint) {
  if (visualHint?.trim()) {
    return `Related image for ${displayName} inspired by ${visualHint.trim()}.`;
  }

  return `Related image for ${displayName}.`;
}

function buildFallbackImage(displayName, visualHint) {
  return {
    isFallback: true,
    url: null,
    alt: buildImageAltText(displayName, visualHint),
    width: null,
    height: null,
    sourcePageUrl: null,
    sourceTitle: null,
  };
}

function isSupportedImageTitle(title) {
  const extension = title.split(".").pop()?.toLowerCase();

  return SUPPORTED_IMAGE_EXTENSIONS.has(extension);
}

async function fetchWikimediaJson(searchParams) {
  const url = new URL(WIKIMEDIA_API_URL);

  for (const [key, value] of Object.entries(searchParams)) {
    url.searchParams.set(key, value);
  }

  const response = await fetch(url, {
    headers: {
      "User-Agent": "ImitationQuotes/0.1 (Story 4 Wikimedia lookup)",
    },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`Wikimedia request failed with status ${response.status}.`);
  }

  return response.json();
}

async function searchWikimediaFiles(searchQuery) {
  const responseBody = await fetchWikimediaJson({
    action: "query",
    format: "json",
    origin: "*",
    generator: "search",
    gsrsearch: searchQuery,
    gsrnamespace: "6",
    gsrlimit: String(SEARCH_LIMIT),
    prop: "imageinfo|info",
    iiprop: "url|size",
    inprop: "url",
  });

  return Object.values(responseBody?.query?.pages || {});
}

function pickUsableImage(pages, displayName, visualHint) {
  for (const page of pages) {
    const imageInfo = page?.imageinfo?.[0];
    const sourceUrl = imageInfo?.url;
    const width = imageInfo?.width;
    const height = imageInfo?.height;
    const sourceTitle = page?.title;
    const sourcePageUrl = page?.fullurl;

    if (
      typeof sourceUrl !== "string" ||
      !sourceUrl ||
      typeof width !== "number" ||
      width <= 0 ||
      typeof height !== "number" ||
      height <= 0 ||
      typeof sourceTitle !== "string" ||
      !sourceTitle.startsWith("File:") ||
      !isSupportedImageTitle(sourceTitle)
    ) {
      continue;
    }

    return {
      isFallback: false,
      url: sourceUrl,
      alt: buildImageAltText(displayName, visualHint),
      width,
      height,
      sourcePageUrl:
        typeof sourcePageUrl === "string" && sourcePageUrl ? sourcePageUrl : null,
      sourceTitle,
    };
  }

  return null;
}

export async function resolveImageForPersonality(displayName, visualHint) {
  const fallbackImage = buildFallbackImage(displayName, visualHint);

  try {
    const searchQueries = buildSearchQueries(displayName, visualHint);

    for (const searchQuery of searchQueries) {
      const pages = await searchWikimediaFiles(searchQuery);
      const imageResult = pickUsableImage(pages, displayName, visualHint);

      if (imageResult) {
        return imageResult;
      }
    }
  } catch (error) {
    console.error("Wikimedia image lookup failed.", error);
  }

  return fallbackImage;
}
