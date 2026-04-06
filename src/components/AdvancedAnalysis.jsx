import { useEffect, useRef, useState, useCallback } from "react";
import {
  analyzeColor,
  rgbToHex,
  getBasicColor,
} from "../utils/colorUtils";

/**
 * AdvancedAnalysis Component
 * This is where the magic happens! It puts the picture on the screen,
 * lets you zoom in, gives you a magnifying glass to pick exact colors,
 * and finds the top 5 colors (the color palette) automatically.
 * 
 * Props:
 * - image: The photo to analyze (sent from the previous screen)
 */
export default function AdvancedAnalysis({ image }) {
  // --- DOM References ---
  const canvasRef = useRef(null); // The visible canvas the user interacts with
  const containerRef = useRef(null); // Wrapper container to handle sizing/scrolling
  const offscreenRef = useRef(null); // Hidden canvas kept at original full resolution for accurate color sampling
  const lastUpdateRef = useRef(0); // Used to throttle mouse/touch events for performance
  const imgRef = useRef(null); // Reference to the loaded Image object
  const baseCanvasSizeRef = useRef({ width: 0, height: 0 }); // Stores the unzoomed dimensions

  // --- State Variables (Data that changes) ---
  const [pixelColor, setPixelColor] = useState(null);       // The color the user is currently pointing at
  const [dominantColor, setDominantColor] = useState(null); // The most common color in the image
  const [isLoading, setIsLoading] = useState(true);         // Is the image still being processed?
  const [colorPalette, setColorPalette] = useState([]);     // The top 5 colors found in the image
  const [error, setError] = useState(null);                 // Any errors (like a broken image)
  const [imageLoaded, setImageLoaded] = useState(false);    // Has the image finished downloading into the browser?
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 }); // How big the image looks on screen right now
  const [baseCanvasSize, setBaseCanvasSize] = useState({ width: 0, height: 0 }); // The normal, unzoomed size
  const [zoomData, setZoomData] = useState(null);           // Data for drawing the magnifying glass
  const [zoomLevel, setZoomLevel] = useState(1);            // How zoomed in the main image is (1 = normal)

  // --- Load image ---
  useEffect(() => {
    if (!image) {
      setError("No image provided");
      setIsLoading(false);
      return;
    }

    const img = new Image();
    img.crossOrigin = "Anonymous";
    imgRef.current = img;

    img.onload = () => {
      console.log("Image loaded:", img.width, "x", img.height);
      setImageLoaded(true);
    };

    img.onerror = () => {
      setError("Failed to load image");
      setIsLoading(false);
    };

    img.src = image;
  }, [image]);

  // --- Process image after canvas is available ---
  useEffect(() => {
    if (!imageLoaded || !imgRef.current) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const img = imgRef.current;

    try {
      // Set canvas to native image dimensions
      canvas.width = img.width;
      canvas.height = img.height;
      
      // Calculate display size maintaining aspect ratio
      const container = containerRef.current;
      const maxWidth = container ? container.clientWidth - 20 : 800;
      const maxHeight = 450;
      
      let displayWidth = img.width;
      let displayHeight = img.height;
      
      // Scale down if needed
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
      
      const displaySize = { width: displayWidth, height: displayHeight };
      baseCanvasSizeRef.current = displaySize;
      setBaseCanvasSize(displaySize);
      setCanvasSize(displaySize);
      
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);

      // Create offscreen canvas for sampling
      const offscreen = document.createElement("canvas");
      offscreen.width = img.width;
      offscreen.height = img.height;
      const offCtx = offscreen.getContext("2d");
      offCtx.drawImage(img, 0, 0);
      offscreenRef.current = offscreen;

      // Extract colors
      extractDominantColors(offCtx, img.width, img.height);
    } catch (err) {
      console.error("Processing error:", err);
      setError(err.message);
      setIsLoading(false);
    }
  }, [imageLoaded]);

  /**
   * Finds the main colors in the picture (Palette Generation).
   * It looks at a bunch of pixels and groups similar colors together.
   * This all happens right here in your browser!
   * 
   * @param {CanvasRenderingContext2D} ctx - The canvas holding the picture
   * @param {number} width - How wide the picture is
   * @param {number} height - How tall the picture is
   */
  const extractDominantColors = (ctx, width, height) => {
    try {
      const imageData = ctx.getImageData(0, 0, width, height);
      const data = imageData.data;

      const samples = [];
      const pixelCount = width * height;
      const sampleStep = Math.max(1, Math.floor(pixelCount / 2000));
      
      for (let i = 0; i < pixelCount; i += sampleStep) {
        const idx = i * 4;
        if (data[idx + 3] > 50) {
          samples.push([data[idx], data[idx + 1], data[idx + 2]]);
        }
      }

      if (samples.length === 0) {
        const defaultColor = analyzeColor(128, 128, 128);
        setDominantColor({
          r: 128, g: 128, b: 128,
          hex: "#808080",
          name: defaultColor.descriptiveName,
          closestNamed: defaultColor.closestNamed,
        });
        setColorPalette([]);
        setIsLoading(false);
        return;
      }

      const k = Math.min(5, samples.length);
      const clusters = simpleKMeans(samples, k);
      clusters.sort((a, b) => b.count - a.count);

      const palette = clusters.map((c) => {
        const analysis = analyzeColor(c.r, c.g, c.b);
        return {
          r: c.r,
          g: c.g,
          b: c.b,
          count: c.count,
          hex: rgbToHex(c.r, c.g, c.b),
          name: analysis.descriptiveName,
          closestNamed: analysis.closestNamed,
        };
      });

      setDominantColor(palette[0]);
      setColorPalette(palette);
      setIsLoading(false);
      
    } catch (err) {
      console.error("Color extraction error:", err);
      setError(err.message);
      setIsLoading(false);
    }
  };

  /**
   * K-Means Clustering Algorithm
   * Groups pixels into 'k' clusters based on their RGB values.
   * 
   * @param {Array} data - Array of RGB pixels [r, g, b]
   * @param {number} k - Number of dominant colors to find
   * @returns {Array} - The center points of the clusters (the dominant colors)
   */
  function simpleKMeans(data, k) {
    if (data.length <= k) {
      return data.map((d) => ({ r: d[0], g: d[1], b: d[2], count: 1 }));
    }

    const indices = new Set();
    while (indices.size < k) {
      indices.add(Math.floor(Math.random() * data.length));
    }
    let centers = [...indices].map(i => [...data[i]]);

    for (let iter = 0; iter < 5; iter++) {
      const sums = centers.map(() => [0, 0, 0, 0]);
      
      for (const point of data) {
        let bestIdx = 0;
        let bestDist = Infinity;
        
        for (let i = 0; i < centers.length; i++) {
          const d = 
            (point[0] - centers[i][0]) ** 2 +
            (point[1] - centers[i][1]) ** 2 +
            (point[2] - centers[i][2]) ** 2;
          if (d < bestDist) {
            bestDist = d;
            bestIdx = i;
          }
        }
        
        sums[bestIdx][0] += point[0];
        sums[bestIdx][1] += point[1];
        sums[bestIdx][2] += point[2];
        sums[bestIdx][3] += 1;
      }

      for (let i = 0; i < centers.length; i++) {
        if (sums[i][3] > 0) {
          centers[i] = [
            Math.round(sums[i][0] / sums[i][3]),
            Math.round(sums[i][1] / sums[i][3]),
            Math.round(sums[i][2] / sums[i][3]),
          ];
        }
      }
    }

    const counts = new Array(centers.length).fill(0);
    for (const point of data) {
      let bestIdx = 0;
      let bestDist = Infinity;
      for (let i = 0; i < centers.length; i++) {
        const d = 
          (point[0] - centers[i][0]) ** 2 +
          (point[1] - centers[i][1]) ** 2 +
          (point[2] - centers[i][2]) ** 2;
        if (d < bestDist) {
          bestDist = d;
          bestIdx = i;
        }
      }
      counts[bestIdx]++;
    }

    return centers.map((c, i) => ({ r: c[0], g: c[1], b: c[2], count: counts[i] }));
  }

  /**
   * Mouse Interaction Handler (Main Image)
   * Tracks the mouse position, calculates the exact pixel being hovered over
   * (accounting for CSS scaling/zooming vs actual canvas resolution), 
   * and extracts the pixel color.
   */
  const handleMouseInteraction = useCallback((e) => {
    const now = performance.now();
    if (now - lastUpdateRef.current < 30) return;
    lastUpdateRef.current = now;

    const canvas = canvasRef.current;
    const offscreen = offscreenRef.current;
    if (!canvas || !offscreen) return;

    // Get exact position using offsetX/offsetY
    const offsetX = e.nativeEvent.offsetX;
    const offsetY = e.nativeEvent.offsetY;
    
    // Get the actual canvas display size
    const displayWidth = canvas.clientWidth;
    const displayHeight = canvas.clientHeight;
    
    // Calculate the scale factor between display and actual canvas
    const scaleX = offscreen.width / displayWidth;
    const scaleY = offscreen.height / displayHeight;
    
    // Get the actual pixel coordinates
    let pixelX = Math.floor(offsetX * scaleX);
    let pixelY = Math.floor(offsetY * scaleY);
    pixelX = Math.max(0, Math.min(offscreen.width - 1, pixelX));
    pixelY = Math.max(0, Math.min(offscreen.height - 1, pixelY));

    const ctx = offscreen.getContext("2d");
    const pixel = ctx.getImageData(pixelX, pixelY, 1, 1).data;
    const analysis = analyzeColor(pixel[0], pixel[1], pixel[2]);

    // Create zoom data for magnifier (5x5 pixel area)
    const zoomSize = 11;
    const halfZoom = Math.floor(zoomSize / 2);
    const startX = Math.max(0, pixelX - halfZoom);
    const startY = Math.max(0, pixelY - halfZoom);
    const zoomImageData = ctx.getImageData(startX, startY, zoomSize, zoomSize);
    
    setZoomData({
      imageData: zoomImageData,
      centerX: pixelX - startX,
      centerY: pixelY - startY,
    });

    setPixelColor({
      ...analysis,
      x: pixelX,
      y: pixelY,
      canvasX: offsetX,
      canvasY: offsetY,
    });
  }, []);

  const handleTouchInteraction = useCallback((e) => {
    const now = performance.now();
    if (now - lastUpdateRef.current < 30) return;
    lastUpdateRef.current = now;

    const canvas = canvasRef.current;
    const offscreen = offscreenRef.current;
    if (!canvas || !offscreen) return;

    e.preventDefault();
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    
    const offsetX = touch.clientX - rect.left;
    const offsetY = touch.clientY - rect.top;
    
    const scaleX = offscreen.width / canvas.clientWidth;
    const scaleY = offscreen.height / canvas.clientHeight;
    
    let pixelX = Math.floor(offsetX * scaleX);
    let pixelY = Math.floor(offsetY * scaleY);
    pixelX = Math.max(0, Math.min(offscreen.width - 1, pixelX));
    pixelY = Math.max(0, Math.min(offscreen.height - 1, pixelY));

    const ctx = offscreen.getContext("2d");
    const pixel = ctx.getImageData(pixelX, pixelY, 1, 1).data;
    const analysis = analyzeColor(pixel[0], pixel[1], pixel[2]);

    setPixelColor({
      ...analysis,
      x: pixelX,
      y: pixelY,
      canvasX: offsetX,
      canvasY: offsetY,
    });
  }, []);

  const handleMouseLeave = () => {
    setZoomData(null);
  };

  const getContrastColor = (hex) => {
    if (!hex || hex.length < 7) return "#FFFFFF";
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.5 ? "#000" : "#FFF";
  };

  /**
   * Renders the Loupe (Magnifying Glass) UI widget.
   * Takes the zoomed pixel area extracted during mouse/touch interaction
   * and draws it on a larger floating canvas.
   */
  const renderMagnifier = () => {
    if (!zoomData || !pixelColor) return null;
    
    const zoomCanvas = document.createElement("canvas");
    zoomCanvas.width = 11;
    zoomCanvas.height = 11;
    const zoomCtx = zoomCanvas.getContext("2d");
    zoomCtx.putImageData(zoomData.imageData, 0, 0);
    
    return (
      <div 
        className="absolute pointer-events-none"
        style={{
          top: pixelColor.canvasY - 45,
          left: pixelColor.canvasX - 25,
          transform: "translateY(-100%)",
        }}
      >
        <div className="bg-gray-900 rounded-lg p-1 shadow-xl border border-gray-600">
          <canvas
            ref={(el) => {
              if (el && zoomData) {
                el.width = 55;
                el.height = 55;
                const ctx = el.getContext("2d");
                ctx.imageSmoothingEnabled = false;
                ctx.drawImage(zoomCanvas, 0, 0, 11, 11, 0, 0, 55, 55);
                // Draw crosshair
                ctx.strokeStyle = "#fff";
                ctx.lineWidth = 1;
                ctx.strokeRect(22, 22, 11, 11);
              }
            }}
            className="rounded"
          />
        </div>
      </div>
    );
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-red-400">
        <p className="text-xl">⚠️ Error</p>
        <p className="mt-2">{error}</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="flex flex-col items-center gap-6 w-full max-w-4xl mx-auto px-4">
      {/* Loading State */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center p-8">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-400">Analyzing colors...</p>
        </div>
      )}

      {/* Zoom Controls - Sleek Design */}
      {!isLoading && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 w-full">
          <p className="text-sm text-gray-400">
            👆 Drag to pick colors
          </p>
          
          {/* Modern Zoom Control */}
          <div className="flex items-center gap-2 bg-gradient-to-r from-gray-800/80 to-gray-900/80 backdrop-blur-md rounded-full px-2 py-1.5 border border-gray-700/50 shadow-lg">
            {/* Zoom Out */}
            <button
              onClick={() => {
                const newZoom = Math.max(0.5, zoomLevel - 0.25);
                setZoomLevel(newZoom);
                setCanvasSize({
                  width: baseCanvasSize.width * newZoom,
                  height: baseCanvasSize.height * newZoom,
                });
              }}
              className="w-9 h-9 rounded-full bg-gradient-to-br from-gray-700 to-gray-800 hover:from-gray-600 hover:to-gray-700 text-white font-bold flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95 shadow-md"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M20 12H4" />
              </svg>
            </button>

            {/* Zoom Level Display with Visual Bar */}
            <div className="flex items-center gap-3 px-3">
              <div className="relative w-28 h-2 bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className="absolute left-0 top-0 h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full transition-all duration-200"
                  style={{ width: `${((zoomLevel - 0.5) / 2.5) * 100}%` }}
                />
                <input
                  type="range"
                  min="0.5"
                  max="3"
                  step="0.1"
                  value={zoomLevel}
                  onChange={(e) => {
                    const newZoom = parseFloat(e.target.value);
                    setZoomLevel(newZoom);
                    setCanvasSize({
                      width: baseCanvasSize.width * newZoom,
                      height: baseCanvasSize.height * newZoom,
                    });
                  }}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
              </div>
              <div className="flex items-center gap-1 min-w-[50px]">
                <span className="text-blue-400 text-lg">🔍</span>
                <span className="text-white font-bold text-sm">{zoomLevel.toFixed(1)}x</span>
              </div>
            </div>

            {/* Zoom In */}
            <button
              onClick={() => {
                const newZoom = Math.min(3, zoomLevel + 0.25);
                setZoomLevel(newZoom);
                setCanvasSize({
                  width: baseCanvasSize.width * newZoom,
                  height: baseCanvasSize.height * newZoom,
                });
              }}
              className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-bold flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95 shadow-md shadow-blue-500/30"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
            </button>

            {/* Reset Button */}
            <button
              onClick={() => {
                setZoomLevel(1);
                // Use ref to get non-stale base size
                const base = baseCanvasSizeRef.current;
                if (base.width > 0 && base.height > 0) {
                  setCanvasSize({ width: base.width, height: base.height });
                }
              }}
              className="ml-1 px-3 py-1.5 rounded-full bg-gray-700/50 hover:bg-gray-600/50 text-gray-300 hover:text-white text-xs font-medium transition-all duration-200"
            >
              Reset
            </button>
          </div>
        </div>
      )}

      {/* Canvas Container - canvas always exists but hidden during loading */}
      <div className={`relative inline-block overflow-auto max-w-full ${isLoading ? 'hidden' : ''}`} style={{ maxHeight: '60vh' }}>
        <canvas
          ref={canvasRef}
          onMouseMove={(e) => !isLoading && handleMouseInteraction(e)}
          onTouchMove={(e) => !isLoading && handleTouchInteraction(e)}
          onMouseLeave={handleMouseLeave}
          className="border-2 border-gray-700 rounded-2xl shadow-2xl cursor-none"
          style={{ 
            width: canvasSize.width || "auto",
            height: canvasSize.height || "auto",
            touchAction: "none",
          }}
        />

        {/* Cursor indicator */}
        {!isLoading && pixelColor && (
          <div
            className="absolute w-4 h-4 rounded-full border-2 border-white pointer-events-none"
            style={{
              top: pixelColor.canvasY - 8,
              left: pixelColor.canvasX - 8,
              backgroundColor: pixelColor.hex,
              boxShadow: `0 0 0 1px rgba(0,0,0,0.3), 0 2px 6px rgba(0,0,0,0.4)`,
            }}
          />
        )}

        {/* Magnifier */}
        {!isLoading && renderMagnifier()}
      </div>

      {/* Selected Color */}
      {!isLoading && pixelColor && (
        <div className="w-full bg-gray-800/80 backdrop-blur rounded-2xl p-5 border border-gray-700/50">
          <h3 className="text-lg font-semibold text-gray-300 mb-4 flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-green-500"></span>
            Selected Color
          </h3>

          <div className="flex flex-col sm:flex-row gap-5">
            {/* Color Preview */}
            <div className="flex flex-col items-center gap-3">
              <div
                className="w-24 h-24 rounded-2xl shadow-2xl border-4 border-white/10"
                style={{ backgroundColor: pixelColor.hex }}
              />
              <div
                className="px-4 py-2 rounded-full text-sm font-bold"
                style={{
                  backgroundColor: pixelColor.hex,
                  color: getContrastColor(pixelColor.hex),
                }}
              >
                {pixelColor.hex}
              </div>
            </div>

            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* BASIC COLOR - Large and prominent for colorblind users */}
              <div className="bg-gradient-to-br from-blue-900/50 to-blue-800/30 rounded-xl p-4 border border-blue-500/30 sm:col-span-2">
                <p className="text-xs text-blue-400 uppercase mb-2 font-semibold">👁️ This is</p>
                <div className="flex items-center gap-3">
                  <span className="text-4xl">{pixelColor.basicColor?.emoji}</span>
                  <p className="text-3xl font-bold text-white">{pixelColor.basicColor?.name}</p>
                </div>
              </div>

              {/* Precise Name */}
              <div className="bg-gray-900/50 rounded-xl p-3">
                <p className="text-xs text-gray-500 uppercase mb-1">Precise Name</p>
                <p className="text-base font-bold text-white">{pixelColor.descriptiveName}</p>
              </div>

              {/* Closest Named Color */}
              <div className="bg-gray-900/50 rounded-xl p-3">
                <p className="text-xs text-gray-500 uppercase mb-1">Closest Match</p>
                <div className="flex items-center gap-2">
                  <div
                    className="w-4 h-4 rounded-md border border-white/20"
                    style={{ backgroundColor: pixelColor.closestNamed?.hex }}
                  />
                  <p className="text-sm font-semibold text-white">
                    {pixelColor.closestNamed?.name}
                  </p>
                </div>
              </div>

              {/* RGB */}
              <div className="bg-gray-900/50 rounded-xl p-3">
                <p className="text-xs text-gray-500 uppercase mb-2">RGB</p>
                <div className="flex gap-2 flex-wrap">
                  <span className="bg-red-500/20 text-red-400 px-2 py-1 rounded text-xs font-mono">
                    R: {pixelColor.rgb.r}
                  </span>
                  <span className="bg-green-500/20 text-green-400 px-2 py-1 rounded text-xs font-mono">
                    G: {pixelColor.rgb.g}
                  </span>
                  <span className="bg-blue-500/20 text-blue-400 px-2 py-1 rounded text-xs font-mono">
                    B: {pixelColor.rgb.b}
                  </span>
                </div>
              </div>

              {/* HSL */}
              <div className="bg-gray-900/50 rounded-xl p-3">
                <p className="text-xs text-gray-500 uppercase mb-2">HSL</p>
                <div className="flex gap-2 flex-wrap">
                  <span className="bg-purple-500/20 text-purple-400 px-2 py-1 rounded text-xs font-mono">
                    H: {pixelColor.hsl.h}°
                  </span>
                  <span className="bg-pink-500/20 text-pink-400 px-2 py-1 rounded text-xs font-mono">
                    S: {pixelColor.hsl.s}%
                  </span>
                  <span className="bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded text-xs font-mono">
                    L: {pixelColor.hsl.l}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Palette */}
      {!isLoading && colorPalette.length > 0 && (
        <div className="w-full bg-gray-800/80 backdrop-blur rounded-2xl p-5 border border-gray-700/50">
          <h3 className="text-lg font-semibold text-gray-300 mb-4">🎨 Image Color Palette</h3>

          <div className="flex flex-wrap gap-4 justify-center">
            {colorPalette.map((color, idx) => {
              const basicColor = getBasicColor(color.r, color.g, color.b);
              return (
                <div key={idx} className="flex flex-col items-center gap-2 p-3 bg-gray-900/50 rounded-xl min-w-[100px]">
                  <div
                    className="w-16 h-16 rounded-xl shadow-lg border-2 border-white/10"
                    style={{ backgroundColor: color.hex }}
                  />
                  <div className="flex items-center gap-1">
                    <span className="text-lg">{basicColor.emoji}</span>
                    <p className="text-sm font-bold text-white">{basicColor.name}</p>
                  </div>
                  <p className="text-xs text-gray-400 font-mono">{color.hex}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
