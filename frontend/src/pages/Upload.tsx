import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UploadCloud, FileText, CheckCircle2, AlertCircle, Sparkles, ArrowRight, Loader2 } from 'lucide-react';
import { api } from '../services/api';
import { UploadedFile } from '../types';

export const UploadPage: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadedDoc, setUploadedDoc] = useState<UploadedFile | null>(null);
  const navigate = useNavigate();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setUploading(true);
    setError(null);

    try {
      const doc = await api.uploadDocument(selectedFile);
      setUploadedDoc(doc);
    } catch (err: any) {
      setError(err.message || 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const handleProceedToQuiz = () => {
    if (uploadedDoc) {
      navigate(`/generate-quiz?docId=${uploadedDoc.id}`);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-8">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold uppercase tracking-wider">
          <Sparkles className="w-4 h-4" /> Multi-Format Document Ingestion Engine
        </div>
        <h1 className="text-3xl font-extrabold text-slate-100">Upload Knowledge Document</h1>
        <p className="text-slate-400 text-sm max-w-xl mx-auto">
          Support for PDF, DOCX, PPTX, TXT, and scanned image OCR. The engine automatically detects chapters, topics, and structure.
        </p>
      </div>

      {!uploadedDoc ? (
        <div className="glass-panel p-8 rounded-3xl border border-slate-800 space-y-6">
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            className="border-2 border-dashed border-slate-800 hover:border-indigo-500/50 rounded-2xl p-10 text-center bg-slate-950/50 transition-colors cursor-pointer"
          >
            <input
              type="file"
              id="file-upload"
              accept=".pdf,.docx,.pptx,.txt,.png,.jpg,.jpeg"
              onChange={handleFileChange}
              className="hidden"
            />
            <label htmlFor="file-upload" className="cursor-pointer block">
              <UploadCloud className="w-16 h-16 text-indigo-400 mx-auto mb-4 animate-bounce" />
              <p className="text-lg font-bold text-slate-200">
                {selectedFile ? selectedFile.name : 'Drag & drop document or click to browse'}
              </p>
              <p className="text-xs text-slate-500 mt-2">
                Supported: PDF, DOCX, PPTX, TXT, PNG, JPG, JPEG (Max 50MB)
              </p>
            </label>
          </div>

          {error && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-center gap-2">
              <AlertCircle className="w-5 h-5 shrink-0" /> {error}
            </div>
          )}

          <button
            onClick={handleUpload}
            disabled={!selectedFile || uploading}
            className="w-full gradient-btn py-4 rounded-xl text-base font-bold flex items-center justify-center gap-2 shadow-xl shadow-indigo-500/25 disabled:opacity-50"
          >
            {uploading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" /> Processing & Extracting Topics...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" /> Process & Extract Document
              </>
            )}
          </button>
        </div>
      ) : (
        <div className="glass-panel p-8 rounded-3xl border border-emerald-500/30 bg-emerald-950/10 space-y-6">
          <div className="flex items-center gap-3 text-emerald-400">
            <CheckCircle2 className="w-8 h-8" />
            <div>
              <h2 className="text-xl font-bold text-slate-100">Document Processed Successfully!</h2>
              <p className="text-xs text-slate-400">{uploadedDoc.filename} ({Math.round(uploadedDoc.file_size / 1024)} KB)</p>
            </div>
          </div>

          {/* Extracted Structure Cards */}
          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
              <span className="text-xs text-slate-400 font-semibold uppercase">Chapters Detected</span>
              <div className="text-2xl font-bold text-indigo-400 mt-1">{uploadedDoc.chapter_count}</div>
            </div>
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
              <span className="text-xs text-slate-400 font-semibold uppercase">Topics Segmented</span>
              <div className="text-2xl font-bold text-purple-400 mt-1">{uploadedDoc.topic_count}</div>
            </div>
          </div>

          {/* Text Excerpt Preview */}
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-400 mb-2">Extracted Text Excerpt</label>
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs font-mono text-slate-300 max-h-48 overflow-y-auto leading-relaxed">
              {uploadedDoc.extracted_text?.slice(0, 1000)}...
            </div>
          </div>

          <div className="flex items-center justify-between pt-4">
            <button
              onClick={() => { setUploadedDoc(null); setSelectedFile(null); }}
              className="text-xs text-slate-400 hover:text-white"
            >
              Upload Another Document
            </button>
            <button
              onClick={handleProceedToQuiz}
              className="gradient-btn px-6 py-3 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-indigo-500/25"
            >
              Generate AI Quiz <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
