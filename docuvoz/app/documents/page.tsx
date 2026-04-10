"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useLanguage } from "@/lib/contexts/LanguageContext";

type MockDoc = { id: string; fileName: string; date: string; preview: string; folderId: string | null };
type Folder = { id: string; name: string; parentId: string | null; isEditing: boolean };

export default function DocumentsPage() {
  const { t } = useLanguage();
  const [recentDocs, setRecentDocs] = useState<MockDoc[]>([]);
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);

  // Folder Mock Data
  const [folders, setFolders] = useState<Folder[]>([
    { id: "f1", name: "Immigration Papers", parentId: null, isEditing: false },
    { id: "f2", name: "Visas", parentId: "f1", isEditing: false }
  ]);

  const translatedDocs: MockDoc[] = [
    { id: "mock_123", fileName: "Legal_Permit_Document.pdf", date: "Oct 24, 2026", preview: "https://images.unsplash.com/photo-1626240098906-896db84fa07f?q=80&w=200&auto=format&fit=crop", folderId: "f1" }
  ];

  useEffect(() => {
    const loaded = JSON.parse(localStorage.getItem("mock_recent_docs") || "[]").map((d: any) => ({ ...d, folderId: d.folderId || null }));
    setRecentDocs(loaded);
  }, []);

  // Filter docs by Selected Folder
  const filterByFolder = (docs: MockDoc[]) => {
    if (activeFolderId === null) return docs;
    return docs.filter(doc => doc.folderId === activeFolderId);
  };

  const filteredRecent = filterByFolder(recentDocs);
  const filteredTranslated = filterByFolder(translatedDocs);

  // --- Folder Management ---
  const handleAddFolder = (parentId: string | null) => {
    const newFolder: Folder = {
      id: "folder_" + Math.random().toString(36).substring(7),
      name: "New Folder",
      parentId,
      isEditing: true
    };
    setFolders([...folders, newFolder]);
  };

  const handleUpdateFolderName = (id: string, newName: string) => {
    setFolders(folders.map(f => f.id === id ? { ...f, name: newName, isEditing: false } : f));
  };

  // --- Drag and Drop ---
  const handleDragStart = (e: React.DragEvent, docId: string, isRecent: boolean) => {
    e.dataTransfer.setData("docId", docId);
    e.dataTransfer.setData("isRecent", isRecent ? "true" : "false");
  };

  const handleDropToFolder = (e: React.DragEvent, targetFolderId: string | null) => {
    e.preventDefault();
    const docId = e.dataTransfer.getData("docId");
    const isRecent = e.dataTransfer.getData("isRecent") === "true";

    if (isRecent) {
      const updated = recentDocs.map(d => d.id === docId ? { ...d, folderId: targetFolderId } : d);
      setRecentDocs(updated);
      localStorage.setItem("mock_recent_docs", JSON.stringify(updated));
    } else {
      // In a real app we'd trigger an API to move translated doc
      alert(`Moved document to folder!`);
    }
  };

  const handleDelete = (id: string, isRecent: boolean) => {
    if (isRecent) {
      const updated = recentDocs.filter(d => d.id !== id);
      setRecentDocs(updated);
      localStorage.setItem("mock_recent_docs", JSON.stringify(updated));
    } else {
      alert("Deleted from Database!");
    }
  };

  // Render Folder Tree Recursive Function
  const renderFolders = (parentId: string | null, depth = 0) => {
    return folders
      .filter(f => f.parentId === parentId)
      .map(folder => (
        <div key={folder.id} className="w-full">
          <div 
            onClick={() => setActiveFolderId(folder.id)}
            onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add("bg-zinc-800"); }}
            onDragLeave={(e) => e.currentTarget.classList.remove("bg-zinc-800")}
            onDrop={(e) => { e.currentTarget.classList.remove("bg-zinc-800"); handleDropToFolder(e, folder.id); }}
            style={{ paddingLeft: `${depth * 1 + 1}rem` }}
            className={`group w-full py-2 pr-4 flex items-center justify-between cursor-pointer transition-colors ${activeFolderId === folder.id ? 'bg-zinc-900 border-l-2 border-emerald-500' : 'hover:bg-zinc-900/50 border-l-2 border-transparent'}`}
          >
            <div className="flex items-center gap-2 overflow-hidden">
              <svg className="w-4 h-4 text-zinc-500 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path d="M2 6a2 2 0 012-2h4l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"></path></svg>
              {folder.isEditing ? (
                <input 
                  autoFocus
                  defaultValue={folder.name}
                  onBlur={(e) => handleUpdateFolderName(folder.id, e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleUpdateFolderName(folder.id, e.currentTarget.value)}
                  className={`bg-black border border-zinc-700 text-white px-1 py-0.5 rounded w-full outline-none focus:border-emerald-500 ${depth === 0 ? 'text-base font-semibold' : 'text-sm'}`}
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <span className={`text-zinc-300 truncate cursor-text ${depth === 0 ? 'text-base font-semibold text-zinc-200' : 'text-sm'}`} onDoubleClick={(e) => { e.stopPropagation(); setFolders(folders.map(f => f.id === folder.id ? { ...f, isEditing: true } : f)); }}>
                  {folder.name}
                </span>
              )}
            </div>
            
            {/* Add Sub-folder Button */}
            <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
              <button 
                onClick={(e) => { e.stopPropagation(); handleAddFolder(folder.id); }}
                className="text-zinc-500 hover:text-white p-0.5 rounded-md hover:bg-zinc-700" 
                title="New Subfolder"
              >
                +
              </button>
            </div>
          </div>
          {renderFolders(folder.id, depth + 1)}
        </div>
      ));
  };


  return (
    <div className="flex h-screen bg-black text-white overflow-hidden">
      
      {/* LEFT SIDEBAR: Folders */}
      <aside className="w-64 shrink-0 border-r border-zinc-800 bg-zinc-950 flex flex-col h-full overflow-y-auto">
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between sticky top-0 bg-zinc-950 z-10">
          <h2 className="text-sm font-bold tracking-wider text-zinc-400 uppercase">
            {t("Folders", "Carpetas")}
          </h2>
          <button onClick={() => handleAddFolder(null)} className="text-zinc-400 hover:text-white hover:bg-zinc-800 p-1 rounded transition">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          </button>
        </div>
        
        <div className="py-2 flex-1">
          <div 
            onClick={() => setActiveFolderId(null)}
            onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add("bg-zinc-800"); }}
            onDragLeave={(e) => e.currentTarget.classList.remove("bg-zinc-800")}
            onDrop={(e) => { e.currentTarget.classList.remove("bg-zinc-800"); handleDropToFolder(e, null); }}
            className={`w-full py-2 px-4 flex items-center gap-2 cursor-pointer transition-colors ${activeFolderId === null ? 'bg-zinc-900 border-l-2 border-emerald-500' : 'hover:bg-zinc-900/50 border-l-2 border-transparent'}`}
          >
             <svg className="w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
             <span className="text-sm font-medium">{t("All Documents", "Todos los Documentos")}</span>
          </div>
          <div className="my-2 h-px w-full bg-zinc-800"></div>
          {renderFolders(null, 0)}
        </div>
      </aside>

      {/* RIGHT SIDE: Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-y-auto p-8 relative">
        <div className="flex justify-between items-end mb-10 border-b border-zinc-800 pb-6 w-full max-w-5xl">
          <div>
            <h1 className="text-3xl font-bold text-zinc-100 flex items-center gap-3">
              {activeFolderId ? folders.find(f => f.id === activeFolderId)?.name : t("My Documents", "Mis Documentos")}
            </h1>
            <p className="text-sm text-zinc-500 mt-2">
              {t("Drag and drop document cards into folders on the left to organize.", "Arrastra y suelta documentos a las carpetas a la izquierda para organizar.")}
            </p>
          </div>
          <Link href="/upload" className="mb-1 text-sm font-semibold bg-zinc-100 text-black px-4 py-2 rounded-lg hover:bg-white transition-colors">
            {t("+ New Photo/Doc", "+ Nueva Foto")}
          </Link>
        </div>

        <div className="w-full max-w-5xl">
          {/* Recently Received Documents */}
          <div className="mb-16">
            <h2 className="text-xl font-semibold text-zinc-200 mb-6 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              {t("Recently Received", "Recibidos Recientemente")}
            </h2>
            
            {filteredRecent.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
                {filteredRecent.map((doc) => (
                  <div 
                    key={doc.id} 
                    draggable
                    onDragStart={(e) => handleDragStart(e, doc.id, true)}
                    className="flex flex-col p-4 border border-zinc-800 bg-zinc-950 rounded-2xl hover:border-zinc-500 transition-colors cursor-grab active:cursor-grabbing group relative overflow-hidden"
                  >
                    <div className="w-full h-32 bg-zinc-900 rounded-xl mb-4 overflow-hidden flex items-center justify-center border border-zinc-800 relative">
                      {doc.preview.startsWith("data:image") ? (
                        <img src={doc.preview} alt="preview" className="object-cover w-full h-full opacity-60" />
                      ) : (
                        <svg className="w-10 h-10 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      )}
                      
                      <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity p-4">
                         <Link href={`/document/${doc.id}`} className="w-full text-center text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded p-2 transition">
                           {t("Translate Now", "Traducir Ahora")}
                         </Link>
                         <button onClick={() => handleDelete(doc.id, true)} className="w-full text-xs font-semibold bg-red-950/80 border border-red-900 hover:bg-red-900 text-red-200 rounded p-2 transition">
                           {t("Delete", "Eliminar")}
                         </button>
                      </div>
                    </div>
                    <h3 className="font-medium text-zinc-300 truncate" title={doc.fileName}>{doc.fileName}</h3>
                    <p className="text-xs text-zinc-500 mt-1">{doc.date}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="w-full p-8 border border-zinc-800/50 bg-zinc-950/50 rounded-2xl text-center">
                <p className="text-zinc-600 text-sm">
                  {t("No recent documents.", "No hay documentos recientes.")}
                </p>
              </div>
            )}
          </div>

          {/* Translated Docs Section */}
          <div>
            <h2 className="text-xl font-semibold text-zinc-200 mb-6 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              {t("Translated Docs", "Documentos Traducidos")}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
              {filteredTranslated.map((doc) => (
                <div 
                  key={doc.id} 
                  draggable
                  onDragStart={(e) => handleDragStart(e, doc.id, false)}
                  className="flex flex-col p-4 border border-zinc-800 bg-zinc-950 rounded-2xl hover:border-zinc-500 transition-colors cursor-grab active:cursor-grabbing group relative overflow-hidden"
                >
                  <div className="w-full h-32 bg-zinc-900 rounded-xl mb-4 overflow-hidden flex items-center justify-center border border-zinc-800 relative">
                    <img src={doc.preview} alt="preview" className="object-cover w-full h-full opacity-40" />
                    <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity p-4">
                        <Link href={`/document/${doc.id}`} className="w-full text-center text-xs font-semibold bg-white text-black hover:bg-zinc-200 rounded p-2 transition">
                          {t("Open Translation", "Abrir Traducción")}
                        </Link>
                        <button onClick={() => alert("Summary mock")} className="w-full text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-600 rounded p-2 transition">
                          {t("Hear Summary", "Escuchar Resumen")}
                        </button>
                    </div>
                  </div>
                  <h3 className="font-medium text-emerald-400 truncate" title={doc.fileName}>{doc.fileName}</h3>
                  <p className="text-xs text-zinc-500 mt-1">{doc.date}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

    </div>
  );
}
