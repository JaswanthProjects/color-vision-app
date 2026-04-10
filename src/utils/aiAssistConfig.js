export const AI_ASSIST_PROVIDER = "Google Gemini";

// Actions that need longer, more detailed AI responses (higher token limits and sentence counts).
// Previously included both 'show-repaired-version' and 'switch-low-vision-mode' as separate entries,
// but they were merged into a single 'repair-and-adapt' action since they covered overlapping ground.
export const EXTENDED_DEEP_ACTION_IDS = new Set([
  "repair-and-adapt",
  "highlight-danger-zones",
  "check-accessibility",
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
      "Review this image for accessibility concerns. Focus on contrast issues, text readability, visual clutter, reliance on color alone, and anything that may be hard to notice for low-vision or colorblind users. Reply in plain text only with one natural paragraph of 5 to 7 sentences, about 130 to 190 words. Mention the biggest risks, the simplest fixes, and why each matters for accessibility. Do not use markdown, bullets, headings, asterisks, or hashtags.",
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
  // Previously two separate actions ('Show Repaired Version' and 'Switch to Low Vision Mode').
  // They were merged into one because both dealt with suggesting visual improvements for accessibility.
  {
    id: "repair-and-adapt",
    title: "Repair & Adapt",
    description: "Suggest repairs and low-vision adjustments for the image.",
    tone: "amber",
    modelTier: "deep",
    prompt:
      "Describe how this image could be repaired and adapted for better visibility and low-vision accessibility. Cover specific improvements such as contrast tuning, color remapping, sharpening, decluttering, edge emphasis, enlargement, spacing, focus guidance, and reducing distracting detail. Explain what changes would help and what the viewer should see more clearly after those changes are applied. Reply in plain text only with 5 to 7 natural sentences, about 130 to 190 words. Be specific about what should change and why. Do not use markdown, bullets, headings, asterisks, or hashtags.",
  },
  {
    id: "highlight-danger-zones",
    title: "Highlight Danger Zones",
    description: "Point out areas that may be visually risky or misleading.",
    tone: "rose",
    modelTier: "deep",
    prompt:
      "Identify the areas in this image that may be visually risky or hard to notice, such as low-contrast regions, dense fine detail, glare, blended colors, or misleading emphasis. Reply in plain text only with 5 to 7 natural sentences, about 130 to 190 words. Describe where the biggest issues appear, why they matter, and what could be done to reduce the risk. Do not use markdown, bullets, headings, asterisks, or hashtags.",
  },
];

// Helper function to find a specific AI Assist action by its unique ID.
// This is used across the app to look up the prompt, tone, and model tier for a chosen action.
export function getAIAssistAction(actionId) {
  // We use .find() to locate the action object in the AI_ASSIST_ACTIONS array.
  // If no action matches the provided ID, we return null as a fallback.
  return AI_ASSIST_ACTIONS.find((action) => action.id === actionId) ?? null;
}

// Utility to safely extract and clean up environment variables.
// It checks if the provided 'envSource' exists and safely accesses the 'key'.
function readEnvValue(envSource, key) {
  const value = envSource?.[key];

  // If the value is a valid string, we trim whitespace to avoid subtle bugs.
  // Otherwise, we return an empty string to ensure a predictable type.
  return typeof value === "string" ? value.trim() : "";
}

// Determines the correct Gemini model to use based on the action's tier ('fast' or 'deep').
// It reads from the provided environment variables, allowing flexibility for both local and server environments.
export function resolveGeminiModelForTier(envSource, modelTier) {
  // First, check if there's a global override model set for all tiers (e.g., VITE_GEMINI_MODEL).
  const sharedOverride =
    readEnvValue(envSource, "VITE_GEMINI_MODEL") || readEnvValue(envSource, "GEMINI_MODEL");
  if (sharedOverride) {
    return sharedOverride; // Apply the override universally if it exists.
  }

  // If no override exists, resolve the specific models for the 'fast' and 'deep' tiers.
  // We fall back to standard defaults if specific tier overrides aren't provided.
  const fastModel =
    readEnvValue(envSource, "VITE_GEMINI_FAST_MODEL") ||
    readEnvValue(envSource, "GEMINI_FAST_MODEL") ||
    "gemini-3-flash-preview";
  const deepModel =
    readEnvValue(envSource, "VITE_GEMINI_DEEP_MODEL") ||
    readEnvValue(envSource, "GEMINI_DEEP_MODEL") ||
    "gemini-3-flash-preview";

  // Return the deep model if the action requires more complex reasoning ('deep'),
  // otherwise return the fast model which provides quicker responses.
  return modelTier === "deep" ? deepModel : fastModel;
}

// Convenience wrapper around resolveGeminiModelForTier that defaults to import.meta.env.
// This is primarily used in the frontend code running on the client side.
export function getGeminiModelForTier(modelTier) {
  // import.meta.env contains Vite's injected environment variables.
  return resolveGeminiModelForTier(import.meta.env ?? {}, modelTier);
}
