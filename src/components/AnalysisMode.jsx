import { ArrowLeft } from "lucide-react";
import AdvancedAnalysis from "./AdvancedAnalysis";

// This is just a wrapper screen that holds the "AdvancedAnalysis" tool
// and adds a title and a "Back" button at the bottom.
export default function AnalysisMode({ 
  image,  // The picture we are analyzing
  onBack  // Function that runs when the "Back" button is clicked
}) {
  return (
    <div className="flex flex-col items-center gap-6 mt-8 w-full animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      <div className="flex items-center justify-between w-full max-w-5xl px-4 text-center relative mb-2">
        <button
          onClick={onBack}
          className="absolute z-10 left-4 top-1/2 -translate-y-1/2 flex items-center gap-2 text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 px-4 py-2 rounded-full border border-white/10 transition-all duration-300"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="hidden sm:inline font-medium">Back</span>
        </button>
        <h2 className="text-3xl font-bold tracking-tight text-white w-full">Color Analysis</h2>
      </div>

      <div className="w-full max-w-5xl glass-panel p-4 sm:p-8 rounded-3xl overflow-hidden">
        <AdvancedAnalysis image={image} />
      </div>
    </div>
  );
}
