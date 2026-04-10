import {
  AI_ASSIST_PROVIDER,
  getAIAssistAction,
  resolveGeminiModelForTier,
} from "../src/utils/aiAssistConfig.js";
import {
  GEMINI_ENDPOINT,
  buildPrompt,
  extractResponseText,
  getGeminiRequestSettings,
  isResponseTooShort,
  parseImageDataUrl,
  sanitizeResponseText,
  shortenResponseText,
} from "../src/utils/geminiVisionShared.js";

function json(data, init = {}) {
  return Response.json(data, init);
}

async function requestGeminiResponse({ action, mimeType, base64Data, signal, attempt = 1 }) {
  const model = resolveGeminiModelForTier(process.env, action.modelTier);
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  const { maxOutputTokens, thinkingLevel } = getGeminiRequestSettings(action);

  const response = await fetch(`${GEMINI_ENDPOINT}/${model}:generateContent`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    signal,
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: buildPrompt(action, attempt) },
            {
              inlineData: {
                mimeType,
                data: base64Data,
              },
            },
          ],
        },
      ],
      generationConfig: {
        temperature: action.modelTier === "deep" ? 0.35 : 0.5,
        maxOutputTokens,
        thinkingConfig: {
          thinkingLevel,
        },
      },
    }),
  });

  const payload = await response.json().catch(() => ({}));

  return { model, response, payload };
}

async function runGeminiVisionAction({ actionId, imageDataUrl, signal }) {
  const action = getAIAssistAction(actionId);

  if (!action) {
    return {
      status: "error",
      title: "Unknown Action",
      text: "That AI assist action is not available right now.",
      provider: AI_ASSIST_PROVIDER,
      model: null,
    };
  }

  const apiKey = process.env.GEMINI_API_KEY?.trim();

  if (!apiKey) {
    return {
      status: "missing-key",
      title: action.title,
      text: "Gemini API key not configured on the server yet. Add GEMINI_API_KEY in Vercel before using live AI responses.",
      provider: AI_ASSIST_PROVIDER,
      model: resolveGeminiModelForTier(process.env, action.modelTier),
    };
  }

  const { mimeType, base64Data } = parseImageDataUrl(imageDataUrl);

  let { model, response, payload } = await requestGeminiResponse({
    action,
    mimeType,
    base64Data,
    signal,
    attempt: 1,
  });

  if (!response.ok) {
    return {
      status: "error",
      title: action.title,
      text: payload?.error?.message || "Gemini could not process this image right now. Please try again.",
      provider: AI_ASSIST_PROVIDER,
      model,
    };
  }

  let text = shortenResponseText(action, sanitizeResponseText(extractResponseText(payload)));

  if (text && isResponseTooShort(action, text)) {
    const retryResult = await requestGeminiResponse({
      action,
      mimeType,
      base64Data,
      signal,
      attempt: 2,
    });

    model = retryResult.model;

    if (retryResult.response.ok) {
      const retryText = shortenResponseText(
        action,
        sanitizeResponseText(extractResponseText(retryResult.payload))
      );

      if (retryText) {
        text = retryText;
      }
    }
  }

  if (!text) {
    return {
      status: "error",
      title: action.title,
      text: "Gemini returned an empty response. Please try the action again.",
      provider: AI_ASSIST_PROVIDER,
      model,
    };
  }

  return {
    status: "success",
    title: action.title,
    text,
    provider: AI_ASSIST_PROVIDER,
    model,
  };
}

export async function POST(request) {
  try {
    const payload = await request.json().catch(() => null);
    const actionId = payload?.actionId;
    const imageDataUrl = payload?.imageDataUrl;

    if (!actionId || !imageDataUrl) {
      return json(
        {
          status: "error",
          title: "Invalid Request",
          text: "Missing action or image data.",
          provider: AI_ASSIST_PROVIDER,
          model: null,
        },
        { status: 400 }
      );
    }

    const result = await runGeminiVisionAction({
      actionId,
      imageDataUrl,
      signal: request.signal,
    });

    return json(result);
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return json(
        {
          status: "error",
          title: "Request Canceled",
          text: "The AI request was canceled before it finished.",
          provider: AI_ASSIST_PROVIDER,
          model: null,
        },
        { status: 499 }
      );
    }

    return json(
      {
        status: "error",
        title: "AI Assist Error",
        text:
          error instanceof Error
            ? error.message
            : "Something went wrong while analyzing this image.",
        provider: AI_ASSIST_PROVIDER,
        model: null,
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return json({ message: "Method not allowed." }, { status: 405 });
}
