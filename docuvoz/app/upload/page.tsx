"use client";

import React, { useRef, useState, useEffect } from "react";
import { useLanguage } from "@/lib/contexts/LanguageContext";
import { useSearchParams, useRouter } from "next/navigation";

export default function UploadPage() {
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isDragging, setIsDragging] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  
  // Camera refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);

  // If the user clicked "Take a Photo" from the home page, auto-open the camera modal
  useEffect(() => {
    if (searchParams.get("mode") === "camera") {
      openCamera();
    }
    return () => stopCamera(); // Cleanup on unmount
  }, [searchParams]);

  const openCamera = async () => {
    setIsCameraOpen(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: "environment" } 
      });
      setMediaStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      alert(t("Could not access camera. Please check permissions.", "No se pudo acceder a la cámara. Revisa los permisos."));
      setIsCameraOpen(false);
    }
  };

  const stopCamera = () => {
    if (mediaStream) {
      mediaStream.getTracks().forEach(track => track.stop());
      setMediaStream(null);
    }
    setIsCameraOpen(false);
  };

  const saveMockDocumentAndRedirect = (fileName: string, dataUrl: string) => {
    const existing = JSON.parse(localStorage.getItem("mock_recent_docs") || "[]");
    existing.unshift({
      id: Math.random().toString(36).substring(7),
      fileName: fileName,
      date: new Date().toLocaleDateString(),
      preview: dataUrl
    });
    localStorage.setItem("mock_recent_docs", JSON.stringify(existing));
    router.push("/documents");
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = canvas.toDataURL("image/jpeg");
        stopCamera();
        saveMockDocumentAndRedirect(`Photo_Capture_${new Date().getTime()}.jpg`, imageData);
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const processFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target && typeof event.target.result === "string") {
        saveMockDocumentAndRedirect(file.name, event.target.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-black text-white px-6 py-12 relative overflow-hidden">
      
      {/* Live Webcam Modal Overlay */}
      {isCameraOpen && (
        <div className="absolute inset-0 z-50 bg-black flex flex-col items-center justify-center p-6">
          <div className="relative w-full max-w-2xl bg-zinc-900 rounded-3xl overflow-hidden border-2 border-zinc-700 shadow-2xl">
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              className="w-full h-auto bg-black"
            />
            {/* Hidden canvas for capturing frame */}
            <canvas ref={canvasRef} className="hidden" />
            
            <div className="absolute bottom-0 w-full p-6 flex justify-between items-center bg-gradient-to-t from-black/80 to-transparent">
              <button 
                onClick={stopCamera}
                className="px-6 py-3 rounded-xl bg-zinc-800 text-white font-semibold hover:bg-zinc-700 transition"
              >
                {t("Cancel", "Cancelar")}
              </button>
              
              <button 
                onClick={capturePhoto}
                className="w-16 h-16 rounded-full bg-white border-4 border-zinc-400 hover:scale-105 transition shadow-[0_0_20px_rgba(255,255,255,0.4)]"
              ></button>
              
              <div className="w-[88px]"></div> {/* Spacer to center the capture button */}
            </div>
          </div>
        </div>
      )}

      <div className="w-full max-w-2xl text-center mb-10">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4 text-zinc-100">
          {t("Upload your document", "Sube tu documento")}
        </h1>
        <p className="text-lg text-zinc-400">
          {t(
            "Choose a PDF or image file from your device, or take a quick photo using your camera.",
            "Elige un archivo PDF o imagen de tu dispositivo, o toma una foto rápida con tu cámara."
          )}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl relative z-10">
        
        {/* Drag and Drop File Upload Area */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`flex flex-col items-center justify-center p-12 rounded-3xl border-2 border-dashed cursor-pointer transition-all duration-300 ${
            isDragging
              ? "border-zinc-300 bg-zinc-900 shadow-xl shadow-zinc-800/50 scale-105"
              : "border-zinc-800 bg-zinc-950 hover:border-zinc-500 hover:bg-zinc-900"
          }`}
        >
          <svg className="w-12 h-12 text-zinc-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 15v4c0 1.1.9 2 2 2h14a2 2 0 002-2v-4M17 8l-5-5-5 5M12 3v12" />
          </svg>
          <h3 className="text-xl font-semibold text-zinc-200 mb-2">
            {t("Browse or Drop File", "Buscar o Soltar Archivo")}
          </h3>
          <p className="text-sm text-zinc-500 text-center">
            {t("Supports PDF, JPG, PNG", "Soporta PDF, JPG, PNG")}
          </p>
          {/* Hidden file input */}
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept=".pdf, image/jpeg, image/png"
            onChange={handleFileChange}
          />
        </div>

        {/* Live Camera Button */}
        <div
          onClick={openCamera}
          className="flex flex-col items-center justify-center p-12 rounded-3xl border border-zinc-800 bg-zinc-950 cursor-pointer transition-all duration-300 hover:bg-zinc-900 shadow-lg"
        >
          <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center mb-4 transition-transform hover:scale-110">
            <svg className="w-8 h-8 text-zinc-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-zinc-200 mb-2">
            {t("Take a Photo", "Tomar una Foto")}
          </h3>
          <p className="text-sm text-zinc-500 text-center">
            {t("Instantly scan a paper document", "Escanea al instante un documento físico")}
          </p>
        </div>

      </div>
    </div>
  );
}
