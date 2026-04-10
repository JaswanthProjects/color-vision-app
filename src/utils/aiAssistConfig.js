export const AI_ASSIST_PROVIDER = "Google Gemini";

export const EXTENDED_DEEP_ACTION_IDS = new Set([
  "show-repaired-version",
  "switch-low-vision-mode",
]);

export const AI_ASSIST_ACTIONS = [
  {
    id: "describe-image",
    title: "Describe This Image",
    description: "Plain-language scene summary for quick orientation.",
    tone: "sky",
    modelTier: "fast",
    prompt:
      "You are an accessibility-focused image assistant inside a color support app. Describe this image in clear plain English for a user who may not be able to see it well. Mention the main subject, rough layout, important colors, and anything notable for orientation. Reply in plain text only with 4 to 5 natural sentences, about 75 to 110 words. Do not use markdown, bullets, headings, asterisks, or hashtags.",
  },
  {
    id: "check-accessibility",
    title: "Check Accessibility",
    description: "Surface readability, contrast, and usability concerns.",
    tone: "emerald",
    modelTier: "deep",
    prompt:
      "Review this image for accessibility concerns. Focus on contrast issues, text readability, visual clutter, reliance on color alone, and anything that may be hard to notice for low-vision or colorblind users. Reply in plain text only with one natural paragraph of 4 to 6 sentences, about 95 to 140 words. Mention the biggest risks and the simplest fixes. Do not use markdown, bullets, headings, asterisks, or hashtags.",
  },
  {
    id: "read-dominant-colors",
    title: "Read Dominant Colors",
    description: "Call out the main visible colors and where they appear.",
    tone: "violet",
    modelTier: "fast",
    prompt:
      "Identify the dominant visible colors in this image and describe where they appear. Prefer plain-language color names over technical codes. Reply in plain text only with 3 to 4 natural sentences, about 60 to 95 words. Do not use markdown, bullets, headings, asterisks, or hashtags.",
  },
  {
    id: "show-repaired-version",
    title: "Show Repaired Version",
    description: "Explain how the image could be improved for clarity.",
    tone: "amber",
    modelTier: "deep",
    prompt:
      "This app is text-only for this action right now. Describe how you would repair or enhance this image for better visibility and accessibility. Mention specific edits a future tool or human could apply, such as contrast tuning, color remapping, sharpening, decluttering, or emphasis changes. Reply in plain text only with 5 to 7 natural sentences, about 130 to 190 words. Be specific about what should change and why it would help. Do not use markdown, bullets, headings, asterisks, or hashtags.",
  },
  {
    id: "switch-low-vision-mode",
    title: "Switch to Low Vision Mode",
    description: "Suggest low-vision-friendly adjustments for the image.",
    tone: "cyan",
    modelTier: "deep",
    prompt:
      "Explain how this image should be adapted for a low-vision-friendly mode. Focus on stronger contrast, enlargement, edge emphasis, spacing, focus guidance, and reducing distracting detail. Reply in plain text only with 5 to 7 natural sentences, about 130 to 190 words. Be specific about what the viewer should see more clearly after the changes. Do not use markdown, bullets, headings, asterisks, or hashtags.",
  },
  {
    id: "highlight-danger-zones",
    title: "Highlight Danger Zones",
    description: "Point out areas that may be visually risky or misleading.",
    tone: "rose",
    modelTier: "deep",
    prompt:
      "Identify the areas in this image that may be visually risky or hard to notice, such as low-contrast regions, dense fine detail, glare, blended colors, or misleading emphasis. Reply in plain text only with 4 to 6 natural sentences, about 95 to 140 words. Describe where the biggest issues appear and why they matter. Do not use markdown, bullets, headings, asterisks, or hashtags.",
  },
];

export function getAIAssistAction(actionId) {
  return AI_ASSIST_ACTIONS.find((action) => action.id === actionId) ?? null;
}

function readEnvValue(envSource, key) {
  const value = envSource?.[key];

  return typeof value === "string" ? value.trim() : "";
}

export function resolveGeminiModelForTier(envSource, modelTier) {
  const sharedOverride =
    readEnvValue(envSource, "VITE_GEMINI_MODEL") || readEnvValue(envSource, "GEMINI_MODEL");
  if (sharedOverride) {
    return sharedOverride;
  }

  const fastModel =
    readEnvValue(envSource, "VITE_GEMINI_FAST_MODEL") ||
    readEnvValue(envSource, "GEMINI_FAST_MODEL") ||
    "gemini-3-flash-preview";
  const deepModel =
    readEnvValue(envSource, "VITE_GEMINI_DEEP_MODEL") ||
    readEnvValue(envSource, "GEMINI_DEEP_MODEL") ||
    "gemini-3-flash-preview";

  return modelTier === "deep" ? deepModel : fastModel;
}

export function getGeminiModelForTier(modelTier) {
  return resolveGeminiModelForTier(import.meta.env ?? {}, modelTier);
}
