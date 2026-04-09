import { useEffect, useRef, useState, useCallback } from "react";
import { ArrowLeft, Eye, Target, Sparkles, RotateCcw, Loader2, Zap, Palette, Droplets } from "lucide-react";
import { applyColorblindFilter, FILTER_OPTIONS } from "../utils/colorblindFilters";

/**
 * ColorblindAssist Component
 */
export default function ColorblindAssist({ image, onBack }) {
  const canvasRef = useRef(null);
  const originalImageDataRef = useRef(null);
  const imgRef = useRef(null);

  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("none");
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!image) return;

    const img = new Image();
    img.crossOrigin = "Anonymous";
    imgRef.current = img;

    img.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      canvas.width = img.width;
      canvas.height = img.height;

      const maxWidth = Math.min(800, window.innerWidth - 40);
      const maxHeight = 500;
      
      let displayWidth = img.width;
      let displayHeight = img.height;
      
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

      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);

      originalImageDataRef.current = ctx.getImageData(0, 0, img.width, img.height);
      
      setIsLoading(false);
    };

    img.onerror = () => {
      setIsLoading(false);
    };

    img.src = image;
  }, [image]);

  const applyFilter = useCallback((filterId) => {
    if (!originalImageDataRef.current || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    
    if (filterId === "none") {
      ctx.putImageData(originalImageDataRef.current, 0, 0);
    } else {
      const filteredData = applyColorblindFilter(originalImageDataRef.current, filterId);
      ctx.putImageData(filteredData, 0, 0);
    }
    
    setActiveFilter(filterId);
  }, []);

  const handleFilterSelection = useCallback((filterId) => {
    applyFilter(activeFilter === filterId ? "none" : filterId);
  }, [activeFilter, applyFilter]);

  const getFilterInfo = (filterId) => {
    return FILTER_OPTIONS.find(f => f.id === filterId);
  };

  const renderIcon = (filter) => {
    if (filter.id === "high-contrast") return <Zap className="w-5 h-5 text-yellow-400" />;
    if (filter.category === "assist") return <Droplets className={`w-5 h-5 ${filter.id.includes("protanopia") ? "text-red-400" : filter.id.includes("deuteranopia") ? "text-green-400" : "text-blue-400"}`} />;
    if (filter.category === "enhance") return <Sparkles className="w-5 h-5 text-blue-400" />;
    if (filter.category === "simulate") return <Eye className="w-5 h-5 text-gray-400" />;
    return <Palette className="w-5 h-5 text-gray-300" />;
  };

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-5xl mx-auto px-4 py-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
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

      <p className="text-gray-400 text-center max-w-xl text-lg">
        Apply filters to distinguish colors. <span className="text-green-400 font-medium">Assist</span> shifts colors, while <span className="text-yellow-400 font-medium">Simulate</span> reveals what's hidden.
      </p>

      {/* Loading */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-16">
          <Loader2 className="w-12 h-12 text-purple-400 animate-spin" />
          <p className="mt-4 text-gray-400 font-medium">Optimizing image...</p>
        </div>
      )}

      {/* Active Filter Badge */}
      {!isLoading && activeFilter !== "none" && (
        <div className="flex items-center gap-3 px-5 py-2.5 bg-purple-500/10 border border-purple-500/30 rounded-full animate-in fade-in zoom-in duration-300 shadow-lg shadow-purple-500/10">
          {renderIcon(getFilterInfo(activeFilter))}
          <span className="text-purple-300 font-medium">{getFilterInfo(activeFilter)?.name}</span>
        </div>
      )}

      {/* Canvas */}
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

      {/* Filter Categories */}
      {!isLoading && (
        <div className="w-full space-y-6 mt-4">
          {/* Assistance Filters */}
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

          {/* Enhancement Filters */}
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

          {/* Simulation Filters */}
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

          {/* Reset Button */}
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
