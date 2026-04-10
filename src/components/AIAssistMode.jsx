import { useEffect, useRef, useState } from "react";
// Import various icons from lucide-react to represent the different actions visually.
import {
  AlertTriangle,
  ArrowLeft,
  Loader2,
  Palette,
  Shield,
  Sparkles,
  Square,
  Volume2,
  Wrench,
} from "lucide-react";

// Pull in our configuration array (which holds Prompts/Tones/Titles) 
// and the helper to determine which model is running.
import { AI_ASSIST_ACTIONS, getGeminiModelForTier } from "../utils/aiAssistConfig";
// Import the core runner that decides whether to hit /api or google APIs directly.
import { runGeminiVisionAction } from "../utils/geminiVision";

const TONE_STYLES = {
  sky: {
    iconWrap: "bg-sky-500/15 text-sky-300",
    active: "border-sky-400/40 bg-sky-500/15 text-white shadow-xl shadow-sky-500/10",
    idle: "border-white/8 bg-white/5 text-gray-300 hover:border-sky-400/20 hover:bg-white/10 hover:text-white",
    badge: "text-sky-300",
  },
  emerald: {
    iconWrap: "bg-emerald-500/15 text-emerald-300",
    active: "border-emerald-400/40 bg-emerald-500/15 text-white shadow-xl shadow-emerald-500/10",
    idle: "border-white/8 bg-white/5 text-gray-300 hover:border-emerald-400/20 hover:bg-white/10 hover:text-white",
    badge: "text-emerald-300",
  },
  violet: {
    iconWrap: "bg-violet-500/15 text-violet-300",
    active: "border-violet-400/40 bg-violet-500/15 text-white shadow-xl shadow-violet-500/10",
    idle: "border-white/8 bg-white/5 text-gray-300 hover:border-violet-400/20 hover:bg-white/10 hover:text-white",
    badge: "text-violet-300",
  },
  amber: {
    iconWrap: "bg-amber-500/15 text-amber-300",
    active: "border-amber-400/40 bg-amber-500/15 text-white shadow-xl shadow-amber-500/10",
    idle: "border-white/8 bg-white/5 text-gray-300 hover:border-amber-400/20 hover:bg-white/10 hover:text-white",
    badge: "text-amber-300",
  },
  cyan: {
    iconWrap: "bg-cyan-500/15 text-cyan-300",
    active: "border-cyan-400/40 bg-cyan-500/15 text-white shadow-xl shadow-cyan-500/10",
    idle: "border-white/8 bg-white/5 text-gray-300 hover:border-cyan-400/20 hover:bg-white/10 hover:text-white",
    badge: "text-cyan-300",
  },
  rose: {
    iconWrap: "bg-rose-500/15 text-rose-300",
    active: "border-rose-400/40 bg-rose-500/15 text-white shadow-xl shadow-rose-500/10",
    idle: "border-white/8 bg-white/5 text-gray-300 hover:border-rose-400/20 hover:bg-white/10 hover:text-white",
    badge: "text-rose-300",
  },
};

// Returns a specific Lucide Icon based on the string actionId.
// This allows us to keep the config array pure serializable JS (for the node backend)
// while letting the React frontend pair those pure configurations with React components.
function getActionIcon(actionId) {
  switch (actionId) {
    case "describe-image":
      return Sparkles;
    case "check-accessibility":
      return Shield;
    case "read-dominant-colors":
      return Palette;
    // Combined action merging the old 'Show Repaired Version' and 'Switch to Low Vision Mode'
    case "repair-and-adapt":
      return Wrench;
    case "highlight-danger-zones":
      return AlertTriangle;
    default:
      return Sparkles;
  }
}

function getStatusLabel(status) {
  switch (status) {
    case "loading":
      return "Analyzing image";
    case "success":
      return "Ready";
    case "missing-key":
      return "Key needed";
    case "error":
      return "Needs retry";
    default:
      return "Awaiting action";
  }
}

// Main component representing the AI Assist feature panel.
// Takes 'image' (a base64 data string captured from video/camera) and 'onBack' (a callback to return).
export default function AIAssistMode({ image, onBack }) {
  // Use a ref to strictly track if the component unmounts mid-request, saving us from React state warnings.
  const isMountedRef = useRef(true);
  
  // A monotonic ID counter that helps us ignore "stale" requests if the user clicks two different buttons fast.
  const requestIdRef = useRef(0);

  // We keep a reference to the active Text-to-Speech Utterance so we can cancel it later.
  const utteranceRef = useRef(null);

  // Allows aggressively cancelling a fetch command if the user leaves the page or clicks another action.
  const abortControllerRef = useRef(null);
  const requestTimeoutRef = useRef(null);

  // Tracks which action was clicked last so we can highlight it.
  const [activeActionId, setActiveActionId] = useState(null);
  
  // Central state holding exactly what string Google Gemini returned, its status, and the model that responded.
  const [resultState, setResultState] = useState({
    status: "idle",
    title: "AI Assist Ready",
    text: "Choose an action to analyze this image. Results will appear here as text, and you can play them aloud once they are ready.",
    provider: "Google Gemini",
    model: null,
  });

  // Track if text-to-speech is currently playing so we can toggle the 'Stop/Play' icon.
  const [isSpeaking, setIsSpeaking] = useState(false);

  const supportsSpeech =
    typeof window !== "undefined" &&
    "speechSynthesis" in window &&
    typeof SpeechSynthesisUtterance !== "undefined";

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (requestTimeoutRef.current) {
        window.clearTimeout(requestTimeoutRef.current);
      }
      if (supportsSpeech) {
        window.speechSynthesis.cancel();
      }
    };
  }, [supportsSpeech]);

  // A helper that attempts to forcibly silence any active Text-to-Speech readings out loud.
  function stopSpeaking() {
    if (!supportsSpeech) {
      return;
    }

    // Cancel native SpeechSynthesis queue entirely.
    window.speechSynthesis.cancel();
    utteranceRef.current = null;
    setIsSpeaking(false);
  }

  // Toggles the loud reading of the returned AI text.
  function handleVoiceToggle() {
    if (!supportsSpeech || !resultState.text) {
      return;
    }

    // If we're already speaking, clicking it again causes it to stop completely.
    if (isSpeaking) {
      stopSpeaking();
      return;
    }

    stopSpeaking(); // Failsafe clearing out any dangling native OS speech queues on mobile.

    // Format the AI text for speech engine. Removes multiple newlines that make synthesizers pause too long.
    const speechText = resultState.text.replace(/\n+/g, " ").replace(/\s{2,}/g, " ").trim();
    
    // Construct the browser native Speech Synthesis object.
    const utterance = new SpeechSynthesisUtterance(speechText);
    utterance.rate = 1;  // Normal speed
    utterance.pitch = 1; // Normal pitch

    // Detect when the OS finishes speaking so we can revert our UI 'Stop Voice' button back to 'Play Voice'.
    utterance.onend = () => {
      if (utteranceRef.current === utterance) {
        utteranceRef.current = null;
        setIsSpeaking(false);
      }
    };
    utterance.onerror = () => {
      if (utteranceRef.current === utterance) {
        utteranceRef.current = null;
        setIsSpeaking(false);
      }
    };

    // Stash the ref to prevent garbage collection weirdness on Safari, then trigger speak queue.
    utteranceRef.current = utterance;
    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  }

  // Fired when the user clicks one of the Action Cards on the left panel.
  // We handle canceling existing fetches, setting up timeouts, and executing the API logic.
  async function handleActionClick(action) {
    // Generate a new request ID. Useful if user rapidly clicks two buttons, we only honor the latest.
    const nextRequestId = requestIdRef.current + 1;
    requestIdRef.current = nextRequestId;

    // Immediately kill any currently flying request if they click a new button before it finished.
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    if (requestTimeoutRef.current) {
      window.clearTimeout(requestTimeoutRef.current);
    }

    // Set up standard JS fetch abort controllers for timeout and cancellation.
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    requestTimeoutRef.current = window.setTimeout(() => {
      abortController.abort(); // Hard timeout of 25 seconds for Vercel Hobby limits
    }, 25000);

    // Mute any old result currently being spoken out load
    stopSpeaking();
    // Update UI immediately to show spinner logic
    setActiveActionId(action.id);
    setResultState({
      status: "loading",
      title: action.title,
      text: "Reading the image and preparing a response...",
      provider: "Google Gemini",
      model: getGeminiModelForTier(action.modelTier),
    });

    try {
      // **EXECUTE CENTRAL LOGIC** calls out to geminiVision wrapper passing the huge base64 `image`.
      const nextResult = await runGeminiVisionAction({
        actionId: action.id,
        imageDataUrl: image,
        signal: abortController.signal,
      });

      // Ignore if component unmounted or if the user clicked another action which bumped our generic counter ID.
      if (!isMountedRef.current || requestIdRef.current !== nextRequestId) {
        return;
      }

      setResultState(nextResult);
    } catch (error) {
      if (!isMountedRef.current || requestIdRef.current !== nextRequestId) {
        return;
      }

      // If our own abort interval fired the abort command, catch it cleanly and show friendly message.
      if (error instanceof Error && error.name === "AbortError") {
        setResultState({
          status: "error",
          title: action.title,
          text: "This request took too long or was canceled. Try the action again when you are ready.",
          provider: "Google Gemini",
          model: getGeminiModelForTier(action.modelTier),
        });
        return;
      }

      // Final generic catch block for unpredictable app / fetch failures.
      setResultState({
        status: "error",
        title: action.title,
        text:
          error instanceof Error
            ? error.message
            : "Something went wrong while analyzing this image.",
        provider: "Google Gemini",
        model: getGeminiModelForTier(action.modelTier),
      });
    } finally {
      // Regardless of success, abort, or failure, purge these timeouts when done to prevent mem-leaks and state corruption.
      if (requestTimeoutRef.current) {
        window.clearTimeout(requestTimeoutRef.current);
        requestTimeoutRef.current = null;
      }

      if (abortControllerRef.current === abortController) {
        abortControllerRef.current = null;
      }
    }
  }

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-6xl mx-auto px-4 py-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between w-full relative">
        <button
          onClick={onBack}
          className="absolute z-10 left-0 top-1/2 -translate-y-1/2 flex items-center gap-2 text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 px-4 py-2 rounded-full border border-white/10 transition-all duration-300"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="hidden sm:inline font-medium">Back</span>
        </button>
        <h1 className="text-3xl font-bold text-white flex items-center justify-center gap-3 w-full tracking-tight">
          <div className="p-2 bg-cyan-500/20 rounded-xl">
            <Sparkles className="w-6 h-6 text-cyan-300" />
          </div>
          AI Assist
        </h1>
      </div>

      <p className="text-gray-400 text-center max-w-2xl text-lg">
        Ask the app to describe the image, review accessibility, and prepare guidance that can also be read aloud on demand.
      </p>

      <div className="w-full flex flex-col gap-6 lg:flex-row lg:items-start">
        <div className="glass-panel rounded-3xl p-4 sm:p-6 flex-1">
          <div className="mb-4">
            <div>
              <p className="text-sm uppercase tracking-[0.18em] text-gray-500">Captured image</p>
              <h2 className="text-xl font-semibold text-white mt-1">Visual context for AI analysis</h2>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-black/30">
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-transparent to-blue-500/10 pointer-events-none" />
            <img
              src={image}
              alt="Captured visual context"
              className="relative w-full max-h-[640px] object-contain"
            />
          </div>
        </div>

        <div className="w-full lg:w-[380px] flex flex-col gap-6">
          <div className="glass-panel rounded-3xl p-5">
            <div className="mb-4">
              <p className="text-sm uppercase tracking-[0.18em] text-gray-500">Action panel</p>
              <h2 className="text-xl font-semibold text-white mt-1">Choose an AI task</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:grid-cols-1">
              {AI_ASSIST_ACTIONS.map((action) => {
                const Icon = getActionIcon(action.id);
                const styles = TONE_STYLES[action.tone];
                const isActive = activeActionId === action.id;
                const isLoading = resultState.status === "loading" && isActive;

                return (
                  <button
                    key={action.id}
                    onClick={() => handleActionClick(action)}
                    disabled={resultState.status === "loading"}
                    className={`text-left rounded-2xl border p-4 transition-all duration-300 ${
                      isActive ? styles.active : styles.idle
                    } ${resultState.status === "loading" ? "cursor-wait" : ""}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2.5 rounded-xl ${styles.iconWrap}`}>
                        {isLoading ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <Icon className="w-5 h-5" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-3">
                          <span className="font-semibold leading-tight">{action.title}</span>
                          <span className={`text-[10px] uppercase tracking-[0.2em] ${styles.badge}`}>
                            {action.modelTier === "deep" ? "Deep" : "Fast"}
                          </span>
                        </div>
                        <p className="text-sm text-gray-400 mt-2 leading-relaxed">{action.description}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="glass-panel rounded-3xl p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.18em] text-gray-500">Result panel</p>
                <h2 className="text-xl font-semibold text-white mt-1">{resultState.title}</h2>
              </div>
              <span className="px-3 py-1 rounded-full text-xs uppercase tracking-[0.18em] bg-white/5 border border-white/10 text-gray-300">
                {getStatusLabel(resultState.status)}
              </span>
            </div>

            <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4 min-h-[220px]">
              <p className="text-gray-200 whitespace-pre-line leading-7">{resultState.text}</p>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-end gap-3">
              <button
                onClick={handleVoiceToggle}
                disabled={!supportsSpeech || !resultState.text || resultState.status !== "success"}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-full border transition-all duration-300 ${
                  !supportsSpeech || !resultState.text || resultState.status !== "success"
                    ? "bg-white/5 text-gray-500 border-white/5 cursor-not-allowed"
                    : "glass-button border-cyan-500/20 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500 hover:text-white"
                }`}
              >
                {isSpeaking ? <Square className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                <span className="font-medium">{isSpeaking ? "Stop Voice" : "Play Voice"}</span>
              </button>
            </div>

            {!supportsSpeech && (
              <p className="mt-3 text-sm text-amber-300">
                Voice playback is not available in this browser, but the text response will still work.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
