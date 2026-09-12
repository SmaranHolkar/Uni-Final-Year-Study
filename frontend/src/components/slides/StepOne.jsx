import React, { useEffect, useState } from "react";
import { useAuth } from "../../AuthContext";
import { supabase } from "../../supabaseClient";
import { Skeleton } from "../Skeleton.jsx";

// Handles StepOne logic.
export default function StepOne({ onNext }) {
  const { setCurrentDocumentId, setCurrentDocumentTitle, session } = useAuth();
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [studySessionsRemaining, setStudySessionsRemaining] = useState(null);
  const [isLoadingTierStatus, setIsLoadingTierStatus] = useState(false);

  useEffect(() => {
    if (!session?.access_token) {
      setStudySessionsRemaining(null);
      setIsLoadingTierStatus(false);
      return;
    }

    const fetchTierStatus = async () => {
      setIsLoadingTierStatus(true);
      try {
        const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";
        const response = await fetch(`${API_BASE}/api/tier-status`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          credentials: "include",
        });

        if (!response.ok) {
          setStudySessionsRemaining(null);
          return;
        }

        const data = await response.json();
        const quotas = Array.isArray(data?.data?.quotas) ? data.data.quotas : [];
        const sessionQuota = quotas.find((quota) => quota.actionType !== "learning_tool_generate");
        const remaining = Number(sessionQuota?.remaining);
        setStudySessionsRemaining(Number.isFinite(remaining) ? remaining : null);
      } catch {
        setStudySessionsRemaining(null);
      } finally {
        setIsLoadingTierStatus(false);
      }
    };

    fetchTierStatus();
  }, [session?.access_token]);

  // Handles handleFileChange logic.
  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      validateAndSetFile(selectedFile);
    }
  };

  // Handles validateAndSetFile logic.
  const validateAndSetFile = (selectedFile) => {
    // Validate file type
    const validTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain"
    ];
    
    if (!validTypes.includes(selectedFile.type)) {
      setError("Please upload a PDF, DOC, DOCX, or TXT file");
      return;
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB in bytes
    if (selectedFile.size > maxSize) {
      setError("File size must be less than 10MB");
      return;
    }

    setError("");
    setFile(selectedFile);
  };

  // Handles handleDrag logic.
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  // Handles handleDrop logic.
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      validateAndSetFile(droppedFile);
    }
  };

  // Handles handleUpload logic.
  const handleUpload = async () => {
    if (!file) {
      setError("Please select a file first");
      return;
    }

    if (!title.trim()) {
      setError("Please enter a title for your document");
      return;
    }

    setUploading(true);
    setError("");

    try {
      // Get fresh session to ensure token is valid
      const { data: { session: freshSession } } = await supabase.auth.getSession();
      
      if (!freshSession?.access_token) {
        setError("Your session has expired. Please refresh the page and log in again.");
        setUploading(false);
        return;
      }

      const formData = new FormData();
      formData.append("document", file);
      formData.append("title", title.trim());

      const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";
      // Use query parameter as fallback if headers don't work
      const uploadUrl = `${API_BASE}/api/upload-document`;
      
      const response = await fetch(uploadUrl, {
        method: "POST",
        headers: {
          'Authorization': `Bearer ${freshSession.access_token}`
        },
        credentials: 'include',
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error("Upload failed");
      }
      
      // Store document ID and title in context for use in StepTwo/StepThree
      if (data.document?.id) {
        setCurrentDocumentId(data.document.id);
        setCurrentDocumentTitle(title.trim());
      }
      
      // Pass uploaded document info
      onNext(data);
    } catch (err) {
      console.error("Upload error:", err);
      setError("Failed to upload document. Please try again");
    } finally {
      setUploading(false);
    }
  };

  // Handles removeFile logic.
  const removeFile = () => {
    setFile(null);
    setError("");
  };

  const renderUploadingSkeleton = () => (
    <div className="w-full max-w-2xl mx-auto p-4 sm:p-6" aria-hidden>
      <Skeleton style={{ height: '1.55rem', width: '13.5rem' }} />
      <Skeleton className="mt-2" style={{ height: '0.9rem', width: '22rem' }} />

      <div className="mt-6 mb-4">
        <Skeleton style={{ height: '0.78rem', width: '8rem' }} />
        <Skeleton className="mt-2" rounded="10px" style={{ height: '2.7rem', width: '100%' }} />
      </div>

      <div className="border border-dashed border-[#2e2e33] bg-[#18181b] rounded-[12px] p-10 mb-5 text-center">
        <Skeleton rounded="999px" style={{ height: '3rem', width: '3rem', margin: '0 auto' }} />
        <Skeleton className="mt-3" style={{ height: '0.8rem', width: '42%', margin: '0.75rem auto 0' }} />
        <Skeleton className="mt-2" style={{ height: '0.72rem', width: '55%', margin: '0.5rem auto 0' }} />
      </div>

      <Skeleton rounded="10px" style={{ height: '2.8rem', width: '100%' }} />
    </div>
  );

  return (
    <div className="w-full max-w-2xl mx-auto p-4 sm:p-6">
      {uploading && renderUploadingSkeleton()}
      {!uploading && (
        <div className="card-standard p-6 sm:p-8 space-y-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-[#f0f0ee]">
              Upload Study Material
            </h2>
            <p className="text-xs text-[#a1a1a6] mt-1.5 leading-relaxed">
              Upload a lecture document, textbook extract, or notes to generate grounded quizzes and canvas tools.
            </p>
          </div>

          <div className="flex items-center justify-between p-3 rounded-[10px] bg-[#131519] border border-[#2e2e33]">
            <span className="text-xs font-medium uppercase tracking-wider text-[#a1a1a6]">Study Quota</span>
            <span className="badge-standard">
              {isLoadingTierStatus ? "Loading..." : `${studySessionsRemaining ?? 0} sessions remaining`}
            </span>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-medium uppercase tracking-wider text-[#a1a1a6]">
              Document Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. CS302: Distributed Systems Lecture 4"
              className="input-standard w-full"
              disabled={uploading}
            />
          </div>

          <div
            className={`border-2 border-dashed rounded-[12px] p-8 text-center transition-all cursor-pointer ${
              dragActive
                ? "border-[#f0f0ee] bg-[#18181b]"
                : "border-[#2e2e33] hover:border-[#404047] bg-[#131519]/50"
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            {!file ? (
              <div className="space-y-3">
                <div className="w-12 h-12 mx-auto rounded-[10px] bg-[#18181b] border border-[#2e2e33] flex items-center justify-center text-xl text-[#f0f0ee]">
                  📄
                </div>
                <div>
                  <p className="text-sm font-medium text-[#f0f0ee]">
                    Drag and drop your file here, or
                  </p>
                  <label className="btn-secondary inline-block mt-2 px-4 py-1.5 text-xs cursor-pointer font-medium">
                    Browse File
                    <input
                      type="file"
                      accept=".pdf,.txt"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                </div>
                <p className="text-xs text-[#a1a1aa]">
                  Supported formats: PDF, TXT (Max 10MB)
                </p>
              </div>
            ) : (
              <div className="flex items-center justify-between p-4 rounded-[10px] bg-[#18181b] border border-[#2e2e33]">
                <div className="flex items-center gap-3 text-left">
                  <div className="text-2xl">📄</div>
                  <div>
                    <p className="text-sm font-medium text-[#f0f0ee] truncate max-w-xs">{file.name}</p>
                    <p className="text-xs text-[#a1a1a6]">{(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={removeFile}
                  disabled={uploading}
                  className="btn-ghost p-1 text-[#f87171] hover:text-[#ef4444]"
                >
                  ✕
                </button>
              </div>
            )}
          </div>

          {error && (
            <div className="p-3 rounded-[10px] bg-[#ef4444]/10 border border-[#ef4444]/30 text-xs text-[#f87171]">
              {error}
            </div>
          )}

          <button
            onClick={handleUpload}
            disabled={!file || uploading}
            className="btn-primary w-full py-3 text-sm flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {uploading ? "Uploading & Vectorizing..." : "Start Study Session →"}
          </button>
        </div>
      )}
    </div>
  );
}

