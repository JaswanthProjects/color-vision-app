import { useEffect, useRef, useState } from "react";
import { Camera, X, Loader2 } from "lucide-react";

// Accesses the user's camera so they can take a picture
export default function CameraView({ 
  onCapture, // Function that runs when the "Capture" button is clicked
  onClose    // Function that runs when the "Stop" button is clicked
}) {
  // References to the HTML elements on the page
  const videoRef = useRef(null);  // The live video feed from the camera
  const canvasRef = useRef(null); // A hidden "canvas" where we draw the photo when taken

  // State variables (data that changes while running)
  const [loading, setLoading] = useState(true);     // Is the camera still loading?
  const [cameraReady, setCameraReady] = useState(false); // Can we take a picture now?
  const [error, setError] = useState("");           // Did something go wrong (like denied permissions)?
  const [flash, setFlash] = useState(false);        // Should we flash the screen white?

  // Initialize Camera when component mounts
  useEffect(() => {
    let stream;

    // Make sure our video element is rendered
    if (!videoRef.current) return;

    setLoading(true);
    setCameraReady(false);

    // Request access to the user-facing camera
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "user" } })
      .then((s) => {
        stream = s;
        videoRef.current.srcObject = stream;

        // When the video feed is ready, play it
        videoRef.current.onloadedmetadata = async () => {
          try {
            await videoRef.current.play();
            setLoading(false);
            setCameraReady(true);
          } catch (playErr) {
            console.log("Video play error:", playErr);
            setError("Cannot play camera video.");
            setLoading(false);
          }
        };
      })
      .catch((err) => {
        // Handle cases where the user denies permission or no camera is found
        console.error("Camera error:", err);
        setError("Camera blocked or unavailable.");
        setLoading(false);
      });

    // Cleanup: Stop the camera stream when the component unmounts
    return () => {
      if (stream) stream.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // This runs when you click the "Capture" button
  const captureSnapshot = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return; // Wait until camera is ready

    // Make the hidden image canvas the exact same size as the live video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // "Draw" the current frame of the video onto the hidden canvas (taking the picture)
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Briefly flash the screen white so the user knows they took a picture
    setFlash(true);
    setTimeout(() => setFlash(false), 200);

    // Save the picture we just drew and send it back to App.jsx
    onCapture(canvas.toDataURL("image/png"));
  };

  return (
    <div className="w-full flex flex-col items-center justify-center gap-6 mt-12 relative animate-in fade-in duration-500">
      {/* Show loading spinner while requesting camera permissions */}
      {loading && !error && (
        <div className="flex flex-col items-center py-6">
          <Loader2 className="w-12 h-12 text-purple-500 animate-spin" />
          <p className="mt-4 text-gray-400 font-medium tracking-wide">Opening camera...</p>
        </div>
      )}

      {/* Show error message if camera fails to load */}
      {error && (
        <div className="glass-panel p-6 rounded-2xl border-red-500/20 bg-red-500/10 text-center max-w-sm">
          <p className="text-red-400 font-medium">{error}</p>
        </div>
      )}

      <div className="flex flex-col items-center justify-center relative">
        <div className={`relative overflow-hidden rounded-3xl border border-white/10 shadow-2xl shadow-blue-500/20 ${loading ? "hidden" : "block"}`}>
          <video
            ref={videoRef}
            className="w-[480px] h-[360px] object-cover max-w-[90vw]"
            playsInline
          />
          {flash && (
            <div className="absolute inset-0 bg-white opacity-80 pointer-events-none transition-opacity animate-in fade-out duration-300"></div>
          )}
        </div>

        {cameraReady && (
          <div className="flex gap-4 mt-8">
            <button
              onClick={captureSnapshot}
              className="glass-button flex items-center gap-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border-blue-500/30 px-8 py-4 rounded-full text-lg font-semibold transition-all hover:scale-105"
            >
              <Camera className="w-6 h-6" />
              Capture Detail
            </button>
            <button
              onClick={onClose}
              className="glass-button flex items-center justify-center bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/30 w-16 h-16 rounded-full transition-all hover:scale-105"
              aria-label="Close"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        )}
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
