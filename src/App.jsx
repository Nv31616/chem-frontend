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
    <div className="flex flex-col lg:flex-row h-screen w-screen overflow-hidden bg-gray-100 font-sans">
      
      {/* Reference Section */}
      <div className="flex flex-col w-full h-2/5 lg:h-full lg:w-1/2 bg-white border-b-2 lg:border-b-0 lg:border-r-2 border-gray-300 shadow-sm z-10 p-4">
        
        {/* Controls Toolbar */}
        <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
          <select
            value={compoundType}
            onChange={(e) => setCompoundType(e.target.value)}
            className="p-2 border rounded font-semibold bg-gray-50 text-gray-700 flex-grow lg:flex-grow-0"
          >
            <option value="linear">1D / Linear Compounds</option>
            <option value="cyclic">Cyclic Compounds</option>
          </select>
          
          <div className="flex gap-2 ml-auto">
            <button
              onClick={handleSkip}
              disabled={!currentImage}
              className="px-4 py-2 bg-amber-400 text-black font-bold rounded hover:bg-amber-500 disabled:opacity-50 transition"
            >
              Skip
            </button>
            <button
              onClick={handleSave}
              disabled={!currentImage}
              className="px-4 py-2 bg-blue-600 text-white font-bold rounded hover:bg-blue-700 disabled:opacity-50 transition"
            >
              Save & Next
            </button>
          </div>
        </div>

        {/* Large Centered Reference Image */}
        {currentImage ? (
          <div className="flex flex-col flex-grow items-center justify-center overflow-hidden">
            <span className="font-bold text-lg text-gray-600 bg-gray-100 px-4 py-1 rounded mb-3 shadow-sm border border-gray-200">
              {currentImage.filename.replace(/\.json$/i, '')}
            </span>
            <div className="flex-grow flex items-center justify-center w-full h-full overflow-hidden p-2 bg-gray-50 rounded border border-gray-200 shadow-inner">
              <img
                src={currentImage.imageUrl}
                alt="Reference"
                className="object-contain max-h-full max-w-full drop-shadow-md"
              />
            </div>
          </div>
        ) : (
          <div className="flex flex-grow items-center justify-center text-gray-400 font-medium text-lg">
            {isLoading ? "Loading..." : "No image available"}
          </div>
        )}
      </div>

      {/* Excalidraw Canvas Area */}
      <div className="flex-grow h-3/5 lg:h-full relative">
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