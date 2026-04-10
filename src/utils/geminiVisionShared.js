import { EXTENDED_DEEP_ACTION_IDS } from "./aiAssistConfig.js";

export const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";

export function buildPrompt(action, attempt = 1) {
  if (attempt === 1) {
    return action.prompt;
  }

  if (EXTENDED_DEEP_ACTION_IDS.has(action.id)) {
    return `${action.prompt} Important: the previous answer was too short or incomplete. Answer again with complete thoughts, at least 5 full sentences and roughly 140 to 210 words, and make sure the response finishes naturally.`;
  }

  return `${action.prompt} Important: the previous answer was too short or incomplete. Answer again with complete thoughts, at least 4 full sentences, and make sure the response finishes naturally.`;
}

export function parseImageDataUrl(imageDataUrl) {
  const match = imageDataUrl?.match(/^data:(.+);base64,(.+)$/);

  if (!match) {
    throw new Error("Unsupported image format. Please try uploading the image again.");
  }

  return {
    mimeType: match[1],
    base64Data: match[2],
  };
}

export function extractResponseText(payload) {
  const parts = payload?.candidates?.[0]?.content?.parts ?? [];

  return parts
    .map((part) => part?.text?.trim())
    .filter(Boolean)
    .join("\n\n");
}

export function sanitizeResponseText(text) {
  return text
    .replace(/\r/g, "")
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/^>\s?/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+[.)]\s+/gm, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    .replace(/_(.*?)_/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function shortenResponseText(action, text) {
  const maxChars = EXTENDED_DEEP_ACTION_IDS.has(action.id) ? 1200 : 820;
  const maxSentences = EXTENDED_DEEP_ACTION_IDS.has(action.id) ? 8 : 6;

  if (text.length <= maxChars) {
    return text;
  }

  const sentences = text.match(/[^.!?]+[.!?]+/g) ?? [text];
  let shortened = "";

  for (const sentence of sentences) {
    const nextSentence = sentence.trim();
    if (!nextSentence) {
      continue;
    }

    const nextText = shortened ? `${shortened} ${nextSentence}` : nextSentence;
    if (nextText.length > maxChars || nextText.split(/[.!?]+/).filter(Boolean).length > maxSentences) {
      break;
    }

    shortened = nextText;
  }

  if (shortened) {
    return shortened.trim();
  }

  return `${text.slice(0, maxChars - 3).trim()}...`;
}

function countSentences(text) {
  return (text.match(/[^.!?]+[.!?]+/g) ?? []).length;
}

export function isResponseTooShort(action, text) {
  const sentenceCount = countSentences(text);
  const minLength = EXTENDED_DEEP_ACTION_IDS.has(action.id)
    ? 260
    : action.modelTier === "deep"
      ? 160
      : 95;
  const minSentences = EXTENDED_DEEP_ACTION_IDS.has(action.id)
    ? 4
    : action.modelTier === "deep"
      ? 2
      : 2;

  return text.length < minLength || sentenceCount < minSentences || !/[.!?]["']?$/.test(text.trim());
}

export function getGeminiRequestSettings(action) {
  return {
    maxOutputTokens: EXTENDED_DEEP_ACTION_IDS.has(action.id)
      ? 1200
      : action.modelTier === "deep"
        ? 900
        : 600,
    thinkingLevel: EXTENDED_DEEP_ACTION_IDS.has(action.id)
      ? "minimal"
      : action.modelTier === "deep"
        ? "low"
        : "minimal",
  };
}
