/**
 * ImagePreview.jsx — Photo Preview & Action Hub
 * 
 * This screen appears right after the user captures or uploads an image.
 * It shows a preview of the photo and presents THREE action buttons:
 * 
 *   1. Analyze Colors   → Goes to the color picker, magnifier, and palette extraction screen
 *   2. Colorblind Assist → Goes to the daltonization / simulation / enhancement filter screen
 *   3. AI Assist         → Goes to the Gemini-powered AI analysis screen
 * 
 * There's also a "Retake Photo" link at the bottom to go back to the camera.
 * 
 * PROPS:
 *   - image              : The base64 data-URL string of the captured photo
 *   - onAnalyze          : Callback to switch App.jsx mode to "analysis"
 *   - onAIAssist         : Callback to switch App.jsx mode to "aiAssist"
 *   - onColorblindAssist : Callback to switch App.jsx mode to "colorblind"
 *   - onRetake           : Callback to switch App.jsx mode back to "camera"
 */

import { Wand2, RefreshCcw, Sparkles, Eye } from "lucide-react";

export default function ImagePreview({ 
  image,              // The photo data (base64 data-URL)
  onAnalyze,          // Callback → switches to Color Analysis screen
  onAIAssist,         // Callback → switches to AI Assist screen
  onColorblindAssist, // Callback → switches to Colorblind Assist screen
  onRetake            // Callback → goes back to the camera to retake
}) {
  return (
    <div className="flex flex-col items-center gap-8 mt-12 w-full max-w-2xl px-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Title section */}
      <div className="text-center">
        <h2 className="text-3xl font-bold tracking-tight text-white mb-2">Photo Captured!</h2>
        <p className="text-gray-400">Choose what you'd like to do with this image</p>
      </div>

      {/* 
        Image preview container with a subtle gradient glow behind it.
        The gradient is positioned slightly larger than the image (-inset-1) 
        and blurred to create a "halo" effect that intensifies on hover.
      */}
      <div className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-purple-500/30 to-blue-500/30 rounded-2xl blur opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
        <img
          src={image}
          alt="Captured"
          className="relative max-w-md w-full rounded-2xl shadow-xl object-contain border border-white/10"
        />
      </div>

      {/* ── Three Action Buttons ─────────────────────────────────────── */}
      {/* Each button triggers a callback that changes the `mode` state   */}
      {/* in App.jsx, which causes App to render the matching component.  */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full max-w-4xl">

        {/* BUTTON 1: Analyze Colors
            → Navigates to AnalysisMode (color picker + palette extraction)
            → Uses K-Means clustering and Delta-E color matching
        */}
        <button
          onClick={onAnalyze}
          className="glass-button flex flex-col items-center gap-3 bg-green-500/10 hover:bg-green-500/20 border-green-500/20 px-6 py-6 rounded-3xl group"
        >
          <div className="p-3 bg-green-500/20 text-green-400 rounded-xl group-hover:scale-110 transition-transform duration-300">
            <Wand2 className="w-7 h-7" />
          </div>
          <div className="flex flex-col items-center text-center">
            <span className="text-lg font-semibold text-white/90">Analyze Colors</span>
            <span className="text-xs text-gray-400 mt-1">Identify & pick exact hex colors</span>
          </div>
        </button>

        {/* BUTTON 2: Colorblind Assist
            → Navigates to ColorblindAssist (daltonize, enhance, simulate)
            → All filters run entirely client-side using pixel math
        */}
        <button
          onClick={onColorblindAssist}
          className="glass-button flex flex-col items-center gap-3 bg-purple-500/10 hover:bg-purple-500/20 border-purple-500/20 px-6 py-6 rounded-3xl group"
        >
          <div className="p-3 bg-purple-500/20 text-purple-400 rounded-xl group-hover:scale-110 transition-transform duration-300">
            <Eye className="w-7 h-7" />
          </div>
          <div className="flex flex-col items-center text-center">
            <span className="text-lg font-semibold text-white/90">Colorblind Assist</span>
            <span className="text-xs text-gray-400 mt-1">Enhance colors for visibility</span>
          </div>
        </button>

        {/* BUTTON 3: AI Assist
            → Navigates to AIAssistMode (Gemini AI image analysis)
            → Sends the image to Google Gemini API and returns plain-text results
            → Results can be read aloud using the Web Speech API (text-to-speech)
        */}
        <button
          onClick={onAIAssist}
          className="glass-button flex flex-col items-center gap-3 bg-cyan-500/10 hover:bg-cyan-500/20 border-cyan-500/20 px-6 py-6 rounded-3xl group"
        >
          <div className="p-3 bg-cyan-500/20 text-cyan-300 rounded-xl group-hover:scale-110 transition-transform duration-300">
            <Sparkles className="w-7 h-7" />
          </div>
          <div className="flex flex-col items-center text-center">
            <span className="text-lg font-semibold text-white/90">AI Assist</span>
            <span className="text-xs text-gray-400 mt-1">Describe and review the image with AI</span>
          </div>
        </button>
      </div>

      {/* Retake button — goes back to the camera screen */}
      <button
        onClick={onRetake}
        className="mt-4 flex items-center gap-2 text-gray-400 hover:text-white px-6 py-3 rounded-full hover:bg-white/5 transition-all duration-300"
      >
        <RefreshCcw className="w-5 h-5" />
        <span className="font-medium">Retake Photo</span>
      </button>
    </div>
  );
}
