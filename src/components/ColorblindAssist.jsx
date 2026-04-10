/**
 * ColorblindAssist.jsx — Colorblind Filter Tool
 * 
 * This component lets users apply real-time color correction filters
 * to an image so that colors are easier to distinguish.
 * 
 * THREE CATEGORIES OF FILTERS:
 *   1. ASSIST (Color Assistance)
 *      Uses "daltonization" — a math technique that detects colors a colorblind
 *      person can't see and shifts them into colors they CAN see. There are 3 types:
 *        • Red-Blind (Protanopia) Assist
 *        • Green-Blind (Deuteranopia) Assist
 *        • Blue-Blind (Tritanopia) Assist
 * 
 *   2. ENHANCE (Enhanced Mode)
 *      Boosts saturation and shifts hue ranges to make problematic colors more distinct.
 *      Includes High Contrast mode which maximizes color separation.
 * 
 *   3. SIMULATE (Simulate Vision)
 *      Shows what the image looks like through the eyes of a colorblind person.
 *      Useful for designers checking if their designs are accessible.
 * 
 * HOW IT WORKS (under the hood):
 *   - The image is drawn onto an HTML <canvas> element.
 *   - We store the original pixel data in a ref so we can always reset.
 *   - When a filter is applied, we loop through every pixel (R, G, B values),
 *     run them through a color transformation matrix (see colorblindFilters.js),
 *     and put the modified pixel data back onto the canvas.
 *   - Clicking the same filter again toggles it OFF (shows original image).
 *   - The "Reset Image" button always restores the original.
 * 
 * PROPS:
 *   - image  : The base64 data-URL of the captured photo
 *   - onBack : Callback to go back to the preview screen
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { ArrowLeft, Eye, Target, Sparkles, RotateCcw, Loader2, Zap, Palette, Droplets } from "lucide-react";

// Import the actual pixel-level filter math and the list of available filters.
import { applyColorblindFilter, FILTER_OPTIONS } from "../utils/colorblindFilters";

export default function ColorblindAssist({ image, onBack }) {
  // ── Refs ─────────────────────────────────────────────────────────────────
  const canvasRef = useRef(null);           // The visible <canvas> element
  const originalImageDataRef = useRef(null); // Stores the ORIGINAL pixel data so we can reset
  const imgRef = useRef(null);              // Reference to the loaded Image object

  // ── State ────────────────────────────────────────────────────────────────
  const [isLoading, setIsLoading] = useState(true);        // Is the image still loading?
  const [activeFilter, setActiveFilter] = useState("none"); // Which filter is currently applied
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 }); // Display size

  // ── Load Image onto Canvas ───────────────────────────────────────────────
  // When the component mounts, we create a new Image object, load the photo,
  // draw it onto the canvas, and save the original pixel data for later resets.
  useEffect(() => {
    if (!image) return;

    const img = new Image();
    img.crossOrigin = "Anonymous"; // Required to read pixel data (prevents CORS issues)
    imgRef.current = img;

    img.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      // Set the canvas internal resolution to match the image's actual pixel dimensions.
      // This is different from the CSS display size — the canvas can be bigger than what's shown.
      canvas.width = img.width;
      canvas.height = img.height;

      // Calculate the CSS display size so the image fits nicely on screen.
      // We cap it at 800px wide and 500px tall to prevent overflow.
      const maxWidth = Math.min(800, window.innerWidth - 40);
      const maxHeight = 500;
      
      let displayWidth = img.width;
      let displayHeight = img.height;
      
      // Scale down proportionally if the image is too large
      if (displayWidth > maxWidth) {
        const scale = maxWidth / displayWidth;
        displayWidth = maxWidth;
        displayHeight = img.height * scale;
      }
      if (displayHeight > maxHeight) {
        const scale = maxHeight / displayHeight;
        displayHeight = maxHeight;
        displayWidth = displayWidth * scale;
      }
      
      setCanvasSize({ width: displayWidth, height: displayHeight });

      // Draw the full-resolution image onto the canvas
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);

      // Save the original pixel data so we can always get back to the unfiltered image.
      // getImageData returns an ImageData object containing an array of RGBA values.
      originalImageDataRef.current = ctx.getImageData(0, 0, img.width, img.height);
      
      setIsLoading(false);
    };

    img.onerror = () => {
      setIsLoading(false);
    };

    img.src = image;
  }, [image]);

  // ── Apply a Filter ───────────────────────────────────────────────────────
  // Takes a filter ID (like "protanopia-assist") and applies it to every pixel.
  // If the filter is "none", we restore the original saved pixel data.
  const applyFilter = useCallback((filterId) => {
    if (!originalImageDataRef.current || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    
    if (filterId === "none") {
      // Reset — just put the saved original pixels back
      ctx.putImageData(originalImageDataRef.current, 0, 0);
    } else {
      // Apply the chosen filter by running every pixel through the transformation.
      // applyColorblindFilter() is from colorblindFilters.js — it loops through every
      // pixel (R, G, B) and applies matrix math based on the filter type.
      const filteredData = applyColorblindFilter(originalImageDataRef.current, filterId);
      ctx.putImageData(filteredData, 0, 0);
    }
    
    // Update state so the UI knows which button to highlight
    setActiveFilter(filterId);
  }, []);

  // ── Toggle Filter on Re-click ────────────────────────────────────────────
  // If you click the same filter that's already active, it toggles OFF (goes back to "none").
  // If you click a different filter, it applies that new filter instead.
  const handleFilterSelection = useCallback((filterId) => {
    applyFilter(activeFilter === filterId ? "none" : filterId);
  }, [activeFilter, applyFilter]);

  // ── Helper: Look up filter metadata ──────────────────────────────────────
  const getFilterInfo = (filterId) => {
    return FILTER_OPTIONS.find(f => f.id === filterId);
  };

  // ── Helper: Render the correct icon for each filter category ─────────────
  const renderIcon = (filter) => {
    if (filter.id === "high-contrast") return <Zap className="w-5 h-5 text-yellow-400" />;
    if (filter.category === "assist") return <Droplets className={`w-5 h-5 ${filter.id.includes("protanopia") ? "text-red-400" : filter.id.includes("deuteranopia") ? "text-green-400" : "text-blue-400"}`} />;
    if (filter.category === "enhance") return <Sparkles className="w-5 h-5 text-blue-400" />;
    if (filter.category === "simulate") return <Eye className="w-5 h-5 text-gray-400" />;
    return <Palette className="w-5 h-5 text-gray-300" />;
  };

  // ── JSX ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-5xl mx-auto px-4 py-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* ── Header with Back button ──────────────────────────────────── */}
      <div className="flex items-center justify-between w-full relative">
        <button
          onClick={onBack}
          className="absolute z-10 left-0 top-1/2 -translate-y-1/2 flex items-center gap-2 text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 px-4 py-2 rounded-full border border-white/10 transition-all duration-300"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="hidden sm:inline font-medium">Back</span>
        </button>
        <h1 className="text-3xl font-bold text-white flex items-center justify-center gap-3 w-full tracking-tight">
          <div className="p-2 bg-purple-500/20 rounded-xl">
            <Eye className="w-6 h-6 text-purple-400" />
          </div>
          Colorblind Assist
        </h1>
      </div>

      {/* Subtitle explaining the two filter philosophies */}
      <p className="text-gray-400 text-center max-w-xl text-lg">
        Apply filters to distinguish colors. <span className="text-green-400 font-medium">Assist</span> shifts colors, while <span className="text-yellow-400 font-medium">Simulate</span> reveals what's hidden.
      </p>

      {/* ── Loading spinner ──────────────────────────────────────────── */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-16">
          <Loader2 className="w-12 h-12 text-purple-400 animate-spin" />
          <p className="mt-4 text-gray-400 font-medium">Optimizing image...</p>
        </div>
      )}

      {/* ── Active filter badge (shows which filter is currently on) ── */}
      {!isLoading && activeFilter !== "none" && (
        <div className="flex items-center gap-3 px-5 py-2.5 bg-purple-500/10 border border-purple-500/30 rounded-full animate-in fade-in zoom-in duration-300 shadow-lg shadow-purple-500/10">
          {renderIcon(getFilterInfo(activeFilter))}
          <span className="text-purple-300 font-medium">{getFilterInfo(activeFilter)?.name}</span>
        </div>
      )}

      {/* ── Canvas (the filtered image) ──────────────────────────────── */}
      <div className={`relative ${isLoading ? 'hidden' : ''} w-full flex justify-center`}>
        <div className="glass-panel p-2 rounded-3xl overflow-hidden w-auto mx-auto inline-block">
          <canvas
            ref={canvasRef}
            className="rounded-2xl"
            style={{ 
              width: canvasSize.width || "auto",
              height: canvasSize.height || "auto",
            }}
          />
        </div>
      </div>

      {/* ── Filter Buttons (3 categories) ────────────────────────────── */}
      {!isLoading && (
        <div className="w-full space-y-6 mt-4">

          {/* ── CATEGORY 1: Color Assistance (Daltonization) ────────── */}
          {/* These use the daltonize() function which detects colors that  */}
          {/* are invisible to a specific type of colorblindness, then     */}
          {/* shifts them into the visible spectrum. This is the most      */}
          {/* useful category for people who ARE colorblind.               */}
          <div className="glass-panel bg-gradient-to-br from-green-500/5 to-emerald-500/5 rounded-3xl p-6 border-green-500/20">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-green-500/20 rounded-xl">
                <Target className="w-6 h-6 text-green-400" />
              </div>
              <h3 className="text-xl font-bold text-green-400">Color Assistance</h3>
              <span className="text-xs font-semibold px-2 py-1 bg-green-500/10 text-green-300/80 rounded-full ml-2 uppercase tracking-wide">Recommended</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {FILTER_OPTIONS.filter(f => f.category === "assist").map(filter => (
                <button
                  key={filter.id}
                  onClick={() => handleFilterSelection(filter.id)}
                  className={`flex flex-col items-center gap-3 p-5 rounded-2xl transition-all duration-300 border ${
                    activeFilter === filter.id
                      ? "bg-green-500/20 border-green-500/40 text-white scale-105 shadow-xl shadow-green-500/10"
                      : "bg-white/5 border-white/5 text-gray-300 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <div className="p-2 bg-black/20 rounded-full shadow-inner">
                    {renderIcon(filter)}
                  </div>
                  <span className="font-semibold">{filter.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* ── CATEGORY 2: Enhancement Mode ────────────────────────── */}
          {/* These boost saturation and shift hue ranges to make colors  */}
          {/* more distinct. High Contrast mode pushes all colors apart.  */}
          <div className="glass-panel bg-gradient-to-br from-blue-500/5 to-cyan-500/5 rounded-3xl p-6 border-blue-500/20">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-500/20 rounded-xl">
                <Sparkles className="w-6 h-6 text-blue-400" />
              </div>
              <h3 className="text-xl font-bold text-blue-400">Enhanced Mode</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {FILTER_OPTIONS.filter(f => f.category === "enhance").map(filter => (
                <button
                  key={filter.id}
                  onClick={() => handleFilterSelection(filter.id)}
                  className={`flex items-center gap-3 px-4 py-4 rounded-2xl transition-all duration-300 border ${
                    activeFilter === filter.id
                      ? "bg-blue-500/20 border-blue-500/40 text-white shadow-xl shadow-blue-500/10"
                      : "bg-white/5 border-white/5 text-gray-300 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {renderIcon(filter)}
                  <span className="font-medium text-sm sm:text-base">{filter.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* ── CATEGORY 3: Simulation Mode ─────────────────────────── */}
          {/* These show what the image looks like to a colorblind person. */}
          {/* Useful for designers and people who want to understand what  */}
          {/* colorblind people experience.                               */}
          <div className="glass-panel bg-gradient-to-br from-yellow-500/5 to-orange-500/5 rounded-3xl p-6 border-yellow-500/20">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-yellow-500/20 rounded-xl">
                <Eye className="w-6 h-6 text-yellow-400" />
              </div>
              <h3 className="text-xl font-bold text-yellow-400">Simulate Vision</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {FILTER_OPTIONS.filter(f => f.category === "simulate").map(filter => (
                <button
                  key={filter.id}
                  onClick={() => handleFilterSelection(filter.id)}
                  className={`flex flex-col sm:flex-row items-center justify-center gap-3 px-4 py-4 rounded-2xl transition-all duration-300 border ${
                    activeFilter === filter.id
                      ? "bg-yellow-500/20 border-yellow-500/40 text-white shadow-xl shadow-yellow-500/10"
                      : "bg-white/5 border-white/5 text-gray-300 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {renderIcon(filter)}
                  <span className="font-medium">{filter.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* ── Reset Button ─────────────────────────────────────────── */}
          {/* Restores the original, unfiltered image. Disabled when no   */}
          {/* filter is active (activeFilter === "none").                  */}
          <div className="flex justify-center pt-4">
            <button
              onClick={() => applyFilter("none")}
              className={`flex items-center gap-3 px-8 py-4 rounded-full font-semibold transition-all duration-300 border ${
                activeFilter === "none"
                  ? "bg-white/5 text-gray-500 border-white/5 cursor-not-allowed"
                  : "glass-button bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500 hover:text-white"
              }`}
              disabled={activeFilter === "none"}
            >
              <RotateCcw className={`w-5 h-5 ${activeFilter !== "none" && "animate-spin-once"}`} />
              Reset Image
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
