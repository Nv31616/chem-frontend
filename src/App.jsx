import { useState, useEffect } from "react";
import { Excalidraw, exportToBlob } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";

// Configure your backend URL here
const API_BASE_URL = "https://chem-canvas-collector.onrender.com/api";

function App() {
  const [excalidrawAPI, setExcalidrawAPI] = useState(null);
  const [currentImage, setCurrentImage] = useState(null);
  const [compoundType, setCompoundType] = useState("linear");
  const [isCompleted, setIsCompleted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchNextImage();
  }, [compoundType]);

  const fetchNextImage = async () => {
    setIsLoading(true);
    setIsCompleted(false);
    try {
      const response = await fetch(`${API_BASE_URL}/queue?type=${compoundType}`);
      
      if (response.status === 404) {
        setIsCompleted(true);
        setCurrentImage(null);
      } else {
        const data = await response.json();
        setCurrentImage(data);
      }
    } catch (error) {
      console.error("Failed to fetch next image:", error);
      alert("Error connecting to the backend.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = async () => {
    if (!currentImage) return;
    
    try {
      await fetch(`${API_BASE_URL}/skip`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: currentImage.filename }),
      });
      clearCanvas();
      fetchNextImage();
    } catch (error) {
      console.error("Error skipping image:", error);
    }
  };

  const handleSave = async () => {
    if (!excalidrawAPI || !currentImage) return;

    const elements = excalidrawAPI.getSceneElements();
    if (!elements || elements.length === 0) {
      alert("Please draw something before saving!");
      return;
    }

    try {
      const blob = await exportToBlob({
        elements,
        appState: excalidrawAPI.getAppState(),
        files: excalidrawAPI.getFiles(),
        exportPadding: 20,
      });

      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = async () => {
        const base64Data = reader.result;

        await fetch(`${API_BASE_URL}/save`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filename: currentImage.filename,
            image: base64Data,
          }),
        });

        clearCanvas();
        fetchNextImage();
      };
    } catch (error) {
      console.error("Error saving drawing:", error);
    }
  };

  const clearCanvas = () => {
    if (excalidrawAPI) {
      excalidrawAPI.updateScene({ elements: [] });
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-gray-100 font-sans">
      
      {/* Reference Section - Always Top, 1/4 of the height, Row Layout */}
      <div className="flex flex-row items-center justify-between w-full h-1/4 bg-white border-b-2 border-gray-300 shadow-sm z-10 p-2 sm:p-4 gap-2 sm:gap-4">
        
        {/* 1. Left Div: Dropdown and Title */}
        <div className="flex flex-col justify-center items-start gap-2 sm:gap-3 flex-shrink-0 w-1/4 max-w-[200px]">
          <select
            value={compoundType}
            onChange={(e) => setCompoundType(e.target.value)}
            className="p-1 sm:p-2 border rounded font-semibold bg-gray-50 text-gray-700 text-xs sm:text-sm w-full outline-none"
          >
            <option value="linear">1D / Linear</option>
            <option value="cyclic">Cyclic</option>
          </select>
          
          {currentImage && (
            <span className="font-bold text-xs sm:text-sm text-gray-600 bg-gray-100 px-2 py-1 sm:px-3 sm:py-1.5 rounded shadow-sm border border-gray-200 w-full truncate text-center">
              {currentImage.filename.replace(/\.json$/i, '')}
            </span>
          )}
        </div>

        {/* 2. Center Div: Image (Maximized) */}
        <div className="flex-grow h-full flex items-center justify-center overflow-hidden p-1 sm:p-2 bg-gray-50 rounded border border-gray-200 shadow-inner">
          {currentImage ? (
            <img
              src={currentImage.imageUrl}
              alt="Reference"
              // w-full and h-full force the image to expand to the container's boundaries
              className="object-contain w-full h-full drop-shadow-md"
            />
          ) : (
            <div className="text-gray-400 font-medium text-sm sm:text-lg">
              {isLoading ? "Loading..." : "No image available"}
            </div>
          )}
        </div>

        {/* 3. Right Div: Buttons */}
        <div className="flex flex-col sm:flex-row justify-center items-stretch sm:items-center gap-2 flex-shrink-0">
          <button
            onClick={handleSkip}
            disabled={!currentImage}
            className="px-3 py-2 sm:px-4 sm:py-2 bg-amber-400 text-black font-bold text-xs sm:text-sm rounded hover:bg-amber-500 disabled:opacity-50 transition whitespace-nowrap"
          >
            Skip
          </button>
          <button
            onClick={handleSave}
            disabled={!currentImage}
            className="px-3 py-2 sm:px-4 sm:py-2 bg-blue-600 text-white font-bold text-xs sm:text-sm rounded hover:bg-blue-700 disabled:opacity-50 transition whitespace-nowrap"
          >
            Save & Next
          </button>
        </div>
      </div>

      {/* Excalidraw Canvas Area - Always Bottom, 3/4 of the height */}
      <div className="flex-grow h-3/4 relative">
        {isLoading && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/80 backdrop-blur-sm">
            <h2 className="text-xl font-bold animate-pulse text-gray-700">Loading next image...</h2>
          </div>
        )}
        
        {isCompleted && !isLoading && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-white">
            <div className="text-center p-6 border-2 border-green-200 rounded-lg bg-green-50">
              <h2 className="text-2xl font-bold text-green-700 mb-2">Queue Completed!</h2>
              <p className="text-green-600 font-medium">No pending {compoundType} images left in the database.</p>
            </div>
          </div>
        )}

        <Excalidraw
          excalidrawAPI={(api) => setExcalidrawAPI(api)}
          UIOptions={{ canvasActions: { clearCanvas: false, loadScene: false, export: false } }}
        />
      </div>
    </div>
  );
}

export default App;