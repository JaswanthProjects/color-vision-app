import { Wand2, Eye, RefreshCcw } from "lucide-react";

// This component shows the photo you just took
// and asks what you want to do with it.
export default function ImagePreview({ 
  image,              // The photo data
  onAnalyze,          // Function to run when clicking "Analyze Colors"
  onColorblindAssist, // Function to run when clicking "Colorblind Assist"
  onRetake            // Function to run when clicking "Retake Photo"
}) {
  return (
    <div className="flex flex-col items-center gap-8 mt-12 w-full max-w-2xl px-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center">
        <h2 className="text-3xl font-bold tracking-tight text-white mb-2">Photo Captured!</h2>
        <p className="text-gray-400">Choose what you'd like to do with this image</p>
      </div>

      <div className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-purple-500/30 to-blue-500/30 rounded-2xl blur opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
        <img
          src={image}
          alt="Captured"
          className="relative max-w-md w-full rounded-2xl shadow-xl object-contain border border-white/10"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-lg">
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
      </div>

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
