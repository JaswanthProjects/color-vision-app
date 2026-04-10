/**
 * App.jsx — Root Component / Central Router
 * 
 * This is the MAIN entry point of the entire ColorVision application.
 * It acts like a traffic controller that decides which screen to show.
 * 
 * HOW IT WORKS:
 * - We use a single state variable called `mode` to track which screen the user is on.
 * - Depending on the value of `mode`, we render a different component.
 * - When the user performs an action (like clicking "Open Camera"), we update `mode`,
 *   and React automatically re-renders to show the correct screen.
 * 
 * SCREENS (modes):
 *   "home"       → Landing page with "Open Camera" and "Upload Image" buttons
 *   "camera"     → Live camera feed where the user can snap a photo
 *   "preview"    → Shows the captured/uploaded image with 3 action buttons
 *   "analysis"   → Color analysis tool (pick colors, see palette, zoom in)
 *   "colorblind" → Colorblind filter tool (daltonization, simulation, enhancement)
 *   "aiAssist"   → AI-powered image analysis using Google Gemini API
 */

import { useState, useRef } from "react";
import { Camera, Image as ImageIcon, Sparkles } from "lucide-react";

// Import every screen component
import CameraView from "./components/CameraView";           // Live camera + capture
import ImagePreview from "./components/ImagePreview";       // Photo preview + action buttons
import AnalysisMode from "./components/AnalysisMode";       // Color picking + palette extraction
import ColorblindAssist from "./components/ColorblindAssist"; // Colorblind filters (daltonize, simulate, enhance)
import AIAssistMode from "./components/AIAssistMode";       // AI image analysis via Gemini

function App() {
  // ── State ────────────────────────────────────────────────────────────────
  // `capturedImage` holds the photo as a base64 data-URL string.
  // This same string is passed to every analysis screen so they can read it.
  const [capturedImage, setCapturedImage] = useState(null);

  // `mode` is the state machine variable. It controls which screen is rendered below.
  const [mode, setMode] = useState("home");

  // We use a hidden <input type="file"> element for the "Upload Image" button.
  // When the user clicks "Upload Image", we programmatically click this hidden input.
  const fileInputRef = useRef(null);

  // ── File Upload Handler ──────────────────────────────────────────────────
  // When the user picks a file from their device gallery, this function fires.
  // It reads the file, converts it to a base64 data-URL, and switches to the preview screen.
  const handleFileUpload = (event) => {
    const file = event.target.files[0]; // Grab the first (and only) file
    if (file) {
      const reader = new FileReader();      // FileReader is a built-in browser API
      reader.onload = (e) => {
        setCapturedImage(e.target.result);   // Store the base64 data-URL in state
        setMode("preview");                 // Switch to the preview screen
      };
      reader.readAsDataURL(file);           // Convert the file to a base64 string
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen p-6 flex flex-col items-center">
      {/* ─── HOME SCREEN ─────────────────────────────────────────────── */}
      {/* Shows when mode === "home". Landing page with two big buttons. */}
      {mode === "home" && (
        <div className="flex flex-col items-center w-full max-w-lg mt-24 gap-10">
          {/* App branding / logo */}
          <div className="flex flex-col items-center gap-4 text-center animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="p-4 bg-white/5 rounded-3xl mb-2 shadow-2xl shadow-purple-500/20 border border-white/10 backdrop-blur-xl">
              <Sparkles className="w-10 h-10 text-purple-400" />
            </div>
            <h1 className="text-5xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-br from-white to-white/60 drop-shadow-sm">
              ColorVision
            </h1>
            <p className="text-gray-400 text-lg">Intelligent color analysis & assist</p>
          </div>
          
          {/* Two action buttons: Camera and Upload */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 w-full">
            {/* Open Camera button — switches to the camera feed */}
            <button
              onClick={() => setMode("camera")}
              className="glass-button group flex flex-col items-center gap-4 px-6 py-8 rounded-3xl"
            >
              <div className="p-4 bg-blue-500/10 text-blue-400 rounded-2xl group-hover:scale-110 group-hover:bg-blue-500/20 transition-all duration-300">
                <Camera className="w-8 h-8" />
              </div>
              <div className="flex flex-col items-center">
                <span className="text-xl font-semibold text-white/90">Open Camera</span>
                <span className="text-sm text-gray-400 mt-1">Capture live photo</span>
              </div>
            </button>

            {/* Hidden file input — triggered when user clicks "Upload Image" */}
            <input 
              type="file" 
              accept="image/*" 
              className="hidden" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
            />

            {/* Upload Image button — opens file picker via the hidden input */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="glass-button group flex flex-col items-center gap-4 px-6 py-8 rounded-3xl"
            >
              <div className="p-4 bg-purple-500/10 text-purple-400 rounded-2xl group-hover:scale-110 group-hover:bg-purple-500/20 transition-all duration-300">
                <ImageIcon className="w-8 h-8" />
              </div>
              <div className="flex flex-col items-center">
                <span className="text-xl font-semibold text-white/90">Upload Image</span>
                <span className="text-sm text-gray-400 mt-1">Choose from gallery</span>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* ─── CAMERA SCREEN ───────────────────────────────────────────── */}
      {/* Live camera feed. When user captures a photo, it stores the image  */}
      {/* as base64 and switches to the preview screen.                      */}
      {mode === "camera" && (
        <CameraView
          onCapture={(img) => {
            setCapturedImage(img);   // Save the captured photo
            setMode("preview");     // Switch to preview
          }}
          onClose={() => setMode("home")}   // "X" button goes back to home
        />
      )}

      {/* ─── PREVIEW SCREEN ──────────────────────────────────────────── */}
      {/* Shows the captured photo with 3 action buttons:                   */}
      {/*   • Analyze Colors  → mode = "analysis"                          */}
      {/*   • Colorblind Assist → mode = "colorblind"                      */}
      {/*   • AI Assist       → mode = "aiAssist"                          */}
      {mode === "preview" && (
        <ImagePreview
          image={capturedImage}
          onAnalyze={() => setMode("analysis")}
          onAIAssist={() => setMode("aiAssist")}
          onColorblindAssist={() => setMode("colorblind")}
          onRetake={() => setMode("camera")}
        />
      )}

      {/* ─── ANALYSIS SCREEN ─────────────────────────────────────────── */}
      {/* Deep-dives into color: magnifier loupe, pixel color picker, and   */}
      {/* automatic palette extraction using K-Means clustering.            */}
      {mode === "analysis" && (
        <AnalysisMode 
          image={capturedImage} 
          onBack={() => setMode("preview")}
        />
      )}

      {/* ─── COLORBLIND ASSIST SCREEN ────────────────────────────────── */}
      {/* Applies real-time pixel-level filters using daltonization math,   */}
      {/* color enhancement, simulation, and high-contrast mode.            */}
      {mode === "colorblind" && (
        <ColorblindAssist 
          image={capturedImage} 
          onBack={() => setMode("preview")}
        />
      )}

      {/* ─── AI ASSIST SCREEN ────────────────────────────────────────── */}
      {/* Sends the image to the Google Gemini API for AI-powered analysis. */}
      {/* Includes text-to-speech playback of results.                      */}
      {mode === "aiAssist" && (
        <AIAssistMode
          image={capturedImage}
          onBack={() => setMode("preview")}
        />
      )}
    </div>
  );
}

export default App;
