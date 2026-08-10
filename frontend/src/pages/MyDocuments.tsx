import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Trash2, RefreshCw, Sparkles, Plus, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';
import { UploadedFile } from '../types';

export const MyDocumentsPage: React.FC = () => {
  const [documents, setDocuments] = useState<UploadedFile[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDocs = async () => {
    try {
      const data = await api.getDocuments();
      setDocuments(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocs();
  }, []);

  useEffect(() => {
    const hasProcessing = documents.some(d => d.status === 'processing');
    if (!hasProcessing) return;

    const interval = setInterval(() => {
      fetchDocs();
    }, 2000);
    return () => clearInterval(interval);
  }, [documents]);


  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this document?')) {
      await api.deleteDocument(id);
      fetchDocs();
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-100">Knowledge Repository</h1>
          <p className="text-slate-400 text-sm">Manage uploaded PDFs, DOCX, PPTX, and extracted topic structures.</p>
        </div>
        <Link to="/upload" className="gradient-btn px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2">
          <Plus className="w-4 h-4" /> Upload New File
        </Link>
      </div>

      {documents.length === 0 ? (
        <div className="glass-panel p-12 rounded-3xl text-center border border-slate-800">
          <FileText className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-200">No Documents Uploaded</h3>
          <p className="text-slate-400 text-sm mt-1 mb-4">Upload your first document to extract AI question sets.</p>
          <Link to="/upload" className="gradient-btn px-4 py-2 rounded-xl text-sm font-bold inline-flex items-center gap-2">
            Upload Document
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {documents.map((doc) => (
            <div key={doc.id} className="glass-card p-6 rounded-2xl border border-slate-800 flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
                    <FileText className="w-5 h-5" />
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-400">
                    {doc.status}
                  </span>
                </div>
                <h3 className="font-bold text-slate-100 line-clamp-1">{doc.filename}</h3>
                <p className="text-xs text-slate-400 mt-1">{Math.round(doc.file_size / 1024)} KB | {doc.chapter_count} chapters | {doc.topic_count} topics</p>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                <Link
                  to={`/generate-quiz?docId=${doc.id}`}
                  className="gradient-btn px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" /> Generate Quiz
                </Link>
                <button
                  onClick={() => handleDelete(doc.id)}
                  className="p-1.5 text-slate-500 hover:text-red-400 transition-colors"
                  title="Delete Document"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
