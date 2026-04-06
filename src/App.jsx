import { useState, useRef } from "react";
import { Camera, Image as ImageIcon, Sparkles } from "lucide-react";

import CameraView from "./components/CameraView";
import ImagePreview from "./components/ImagePreview";
import AnalysisMode from "./components/AnalysisMode";
import ColorblindAssist from "./components/ColorblindAssist";

function App() {
  const [capturedImage, setCapturedImage] = useState(null);
  const [mode, setMode] = useState("home");
  const fileInputRef = useRef(null);

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setCapturedImage(e.target.result);
        setMode("preview");
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="min-h-screen p-6 flex flex-col items-center">
      {mode === "home" && (
        <div className="flex flex-col items-center w-full max-w-lg mt-24 gap-10">
          <div className="flex flex-col items-center gap-4 text-center animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="p-4 bg-white/5 rounded-3xl mb-2 shadow-2xl shadow-purple-500/20 border border-white/10 backdrop-blur-xl">
              <Sparkles className="w-10 h-10 text-purple-400" />
            </div>
            <h1 className="text-5xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-br from-white to-white/60 drop-shadow-sm">
              ColorVision
            </h1>
            <p className="text-gray-400 text-lg">Intelligent color analysis & assist</p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 w-full">
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

            <input 
              type="file" 
              accept="image/*" 
              className="hidden" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
            />

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

      {mode === "camera" && (
        <CameraView
          onCapture={(img) => {
            setCapturedImage(img);
            setMode("preview");
          }}
          onClose={() => setMode("home")}
        />
      )}

      {mode === "preview" && (
        <ImagePreview
          image={capturedImage}
          onAnalyze={() => setMode("analysis")}
          onColorblindAssist={() => setMode("colorblind")}
          onRetake={() => setMode("camera")}
        />
      )}

      {mode === "analysis" && (
        <AnalysisMode 
          image={capturedImage} 
          onBack={() => setMode("preview")}
        />
      )}

      {mode === "colorblind" && (
        <ColorblindAssist 
          image={capturedImage} 
          onBack={() => setMode("preview")}
        />
      )}
    </div>
  );
}

export default App;
