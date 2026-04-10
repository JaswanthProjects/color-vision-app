import { EXTENDED_DEEP_ACTION_IDS } from "./aiAssistConfig.js";

export const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";

// Helper to inject retry instructions dynamically when the AI returns a response that's too short.
// It checks the 'attempt' counter. On attempt 2, it appends explicit length constraints to the prompt.
export function buildPrompt(action, attempt = 1) {
  if (attempt === 1) {
    // Attempt 1 just uses the default prompt defined in our action configuration.
    return action.prompt;
  }

  if (EXTENDED_DEEP_ACTION_IDS.has(action.id)) {
    // Actions that require major reasoning paths get longer sentence constraints.
    return `${action.prompt} Important: the previous answer was too short or incomplete. Answer again with complete thoughts, at least 5 full sentences and roughly 140 to 210 words, and make sure the response finishes naturally.`;
  }

  // Standard short-path actions get slightly more relaxed retry constraints.
  return `${action.prompt} Important: the previous answer was too short or incomplete. Answer again with complete thoughts, at least 4 full sentences, and make sure the response finishes naturally.`;
}

// Safely slices the standard Data URL standard format (data:image/jpeg;base64,...)
// to provide the separated mimeType and base64 strings required by the Gemini API format.
export function parseImageDataUrl(imageDataUrl) {
  const match = imageDataUrl?.match(/^data:(.+);base64,(.+)$/);

  if (!match) {
    throw new Error("Unsupported image format. Please try uploading the image again.");
  }

  return {
    mimeType: match[1],   // e.g. "image/jpeg" or "image/png"
    base64Data: match[2], // The pure base64 encoded string body
  };
}

// Drills into the complicated Google Gemini response payload JSON to extract the final raw text chunks.
export function extractResponseText(payload) {
  // Gracefully dig into the potentially completely broken or empty payload
  const parts = payload?.candidates?.[0]?.content?.parts ?? [];

  // Iterate over parts (useful if there are multiple, though realistically typically just one for simple text)
  // and join them onto separate lines.
  return parts
    .map((part) => part?.text?.trim())
    .filter(Boolean)
    .join("\n\n");
}

// Extremely aggressive sanitization function to strip out markdown characters that Gemini frequently
// injects despite explicit instructions not to. We want plain, readable text for our text-to-speech engine.
export function sanitizeResponseText(text) {
  return text
    .replace(/\r/g, "") // Remove windows carriage returns completely
    .replace(/^#{1,6}\s*/gm, "") // Strip away headings levels 1 through 6
    .replace(/^>\s?/gm, "") // Strip blockquotes at the beginning of lines
    .replace(/^\s*[-*+]\s+/gm, "") // Delete unordered list bullet markers
    .replace(/^\s*\d+[.)]\s+/gm, "") // Delete ordered list numeral prefixes
    .replace(/\*\*(.*?)\*\*/g, "$1") // Remove bolding via astrisks
    .replace(/\*(.*?)\*/g, "$1") // Remove italics via asterisk
    .replace(/__(.*?)__/g, "$1") // Remove bolding via underscores
    .replace(/_(.*?)_/g, "$1") // Remove italics via underscores
    .replace(/`([^`]+)`/g, "$1") // Remove inline code ticks
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1") // Convert standard Markdown links into just their label text
    .replace(/[ \t]+\n/g, "\n") // Clear trailing whitespace from each line
    .replace(/\n{3,}/g, "\n\n") // Condense extra spacious lines down to a double line break max
    .trim();
}

// An enforcer function to cap long-winded Gemini responses to a comfortable, readable standard for visually impaired users.
// Uses a rolling buffer algorithm split by sentence boundary to ensure we only show complete sentences.
export function shortenResponseText(action, text) {
  const maxChars = EXTENDED_DEEP_ACTION_IDS.has(action.id) ? 1200 : 820;
  const maxSentences = EXTENDED_DEEP_ACTION_IDS.has(action.id) ? 8 : 6;

  // If we're already below the limit, nothing to do, bail out early.
  if (text.length <= maxChars) {
    return text;
  }

  // Attempt to split naturally by punctuation, fallback to splitting whole block if we can't find boundaries.
  const sentences = text.match(/[^.!?]+[.!?]+/g) ?? [text];
  let shortened = "";

  // Iteratively re-combine sentences from the array
  for (const sentence of sentences) {
    const nextSentence = sentence.trim();
    if (!nextSentence) {
      continue;
    }

    const nextText = shortened ? `${shortened} ${nextSentence}` : nextSentence;
    // Condition to halt recombining if we exceed either character limits OR sentence count limits.
    if (nextText.length > maxChars || nextText.split(/[.!?]+/).filter(Boolean).length > maxSentences) {
      break;
    }

    shortened = nextText;
  }

  // If our recombination succeeded somewhat naturally, return it.
  if (shortened) {
    return shortened.trim();
  }

  // Desperation fallback for block-texts without punctuation: hard cut.
  return `${text.slice(0, maxChars - 3).trim()}...`;
}

// Fast regex helper to estimate how many grammatical sentences are in a block.
function countSentences(text) {
  return (text.match(/[^.!?]+[.!?]+/g) ?? []).length;
}

// Determines if Gemini has completely ignored standard instructions and failed entirely to respond descriptively.
export function isResponseTooShort(action, text) {
  const sentenceCount = countSentences(text);
  
  // Tiers and Action types determine the length standards in characters.
  const minLength = EXTENDED_DEEP_ACTION_IDS.has(action.id)
    ? 260
    : action.modelTier === "deep"
      ? 160
      : 95;
      
  // Tiers also mandate minimum actual sentences to be spoken aloud.
  const minSentences = EXTENDED_DEEP_ACTION_IDS.has(action.id)
    ? 4
    : action.modelTier === "deep"
      ? 2
      : 2;

  // The text is too short if it breaks the limits, or if it doesn't even end with standard punctuation.
  return text.length < minLength || sentenceCount < minSentences || !/[.!?]["']?$/.test(text.trim());
}

// Config provider for advanced tuning variables when calling Google's APIs.
// This guarantees we only enable verbose advanced thinking (which is slower) exactly when the action needs it.
export function getGeminiRequestSettings(action) {
  return {
    // Limits the raw byte chunks we burn receiving output, to save costs.
    maxOutputTokens: EXTENDED_DEEP_ACTION_IDS.has(action.id)
      ? 1200
      : action.modelTier === "deep"
        ? 900
        : 600,
    // thinkingLevel adjusts how much time Gemini takes locally to reason. 
    thinkingLevel: EXTENDED_DEEP_ACTION_IDS.has(action.id)
      ? "minimal"
      : action.modelTier === "deep"
        ? "low"
        : "minimal",
  };
}
