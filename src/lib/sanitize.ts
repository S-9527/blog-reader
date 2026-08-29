import sanitizeHtml from "sanitize-html";

const allowedTags = sanitizeHtml.defaults.allowedTags.concat([
  "img",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "figure",
  "figcaption",
  "picture",
  "source",
  "video",
  "audio",
  "iframe",
  "table",
  "thead",
  "tbody",
  "tr",
  "th",
  "td",
  "code",
  "pre",
  "blockquote",
  "hr",
]);

const allowedAttributes = {
  ...sanitizeHtml.defaults.allowedAttributes,
  a: ["href", "name", "target", "rel"],
  img: ["src", "alt", "title", "loading", "width", "height"],
  iframe: ["src", "title", "width", "height", "allow", "allowfullscreen"],
  video: ["src", "controls", "poster", "width", "height"],
  source: ["src", "type"],
  audio: ["src", "controls"],
  td: ["colspan", "rowspan"],
  th: ["colspan", "rowspan", "scope"],
};

export function sanitizeContent(content: string) {
  return sanitizeHtml(content, {
    allowedTags,
    allowedAttributes,
    allowedSchemes: ["http", "https", "mailto"],
    allowedSchemesByTag: {
      img: ["http", "https"],
      iframe: ["http", "https"],
      source: ["http", "https"],
      video: ["http", "https"],
      audio: ["http", "https"],
    },
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer", target: "_blank" }),
    },
  });
}
