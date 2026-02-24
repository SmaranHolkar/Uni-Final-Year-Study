import React, { useState } from "react";
import { useAuth } from "../../AuthContext";
import { supabase } from "../../supabaseClient";

export default function StepOne({ onNext }) {
  const { session, setCurrentDocumentId, setCurrentDocumentTitle } = useAuth();
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [dragActive, setDragActive] = useState(false);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      validateAndSetFile(selectedFile);
    }
  };

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

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      validateAndSetFile(droppedFile);
    }
  };

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

      console.log('🔑 Auth token available:', freshSession.access_token.substring(0, 20) + '...');

      const formData = new FormData();
      formData.append("document", file);
      formData.append("title", title.trim());

      const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";
      // Use query parameter as fallback if headers don't work
      const uploadUrl = `${API_BASE}/api/upload-document?token=${encodeURIComponent(freshSession.access_token)}`;
      console.log('📤 Uploading to:', API_BASE + '/api/upload-document');
      
      const response = await fetch(uploadUrl, {
        method: "POST",
        headers: {
          'Authorization': `Bearer ${freshSession.access_token}`
        },
        credentials: 'include',
        body: formData
      });

      console.log('📥 Response status:', response.status);
      const data = await response.json();
      console.log('📥 Response data:', data);

      if (!response.ok) {
        throw new Error(data.error || data.message || "Upload failed");
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
      setError(err.message || "Failed to upload document. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const removeFile = () => {
    setFile(null);
    setError("");
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Upload Your Study Material</h2>
      <p style={styles.subtitle}>
        Upload a document to generate personalized questions and learning materials
      </p>

      <div style={styles.inputGroup}>
        <label style={styles.label}>Document Title *</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g., Chapter 5: Data Structures"
          style={styles.input}
          disabled={uploading}
        />
      </div>

      <div
        style={{
          ...styles.dropzone,
          ...(dragActive ? styles.dropzoneActive : {}),
        }}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        {!file ? (
          <>
            <div style={styles.uploadIcon}>📄</div>
            <p style={styles.dropzoneText}>
              Drag and drop your file here, or
            </p>
            <label style={styles.browseButton}>
              Browse Files
              <input
                type="file"
                accept=".pdf,.doc,.docx,.txt"
                onChange={handleFileChange}
                style={styles.fileInput}
              />
            </label>
            <p style={styles.helpText}>
              Supported formats: PDF, DOC, DOCX, TXT (Max 10MB)
            </p>
          </>
        ) : (
          <div style={styles.filePreview}>
            <div style={styles.fileIcon}></div>
            <div style={styles.fileInfo}>
              <p style={styles.fileName}>{file.name}</p>
              <p style={styles.fileSize}>
                {(file.size / 1024).toFixed(2)} KB
              </p>
            </div>
            <button
              onClick={removeFile}
              style={styles.removeButton}
              disabled={uploading}
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {error && <div style={styles.error}>{error}</div>}

      <button
        onClick={handleUpload}
        disabled={!file || uploading}
        style={{
          ...styles.uploadButton,
          ...((!file || uploading) ? styles.uploadButtonDisabled : {}),
        }}
      >
        {uploading ? "Uploading..." : "Upload and Continue"}
      </button>
    </div>
  );
}

const styles = {
  container: {
    width: "100%",
    maxWidth: "600px",
    margin: "0 auto",
    padding: "40px 20px",
  },
  inputGroup: {
    marginBottom: "25px",
  },
  label: {
    display: "block",
    fontSize: "14px",
    fontWeight: "600",
    marginBottom: "8px",
    color: "var(--card-foreground)",
  },
  input: {
    width: "100%",
    padding: "12px",
    fontSize: "16px",
    border: "1px solid var(--border, #ccc)",
    borderRadius: "6px",
    backgroundColor: "var(--background, #fff)",
    color: "var(--card-foreground)",
    outline: "none",
    transition: "border-color 0.2s ease",
  },
  title: {
    fontSize: "28px",
    fontWeight: "600",
    marginBottom: "10px",
    color: "var(--card-foreground)",
  },
  subtitle: {
    fontSize: "16px",
    color: "var(--muted-foreground, #666)",
    marginBottom: "30px",
  },
  dropzone: {
    border: "2px dashed var(--border, #ccc)",
    borderRadius: "12px",
    padding: "60px 20px",
    textAlign: "center",
    backgroundColor: "var(--background, #fafafa)",
    transition: "all 0.3s ease",
    cursor: "pointer",
    marginBottom: "20px",
  },
  dropzoneActive: {
    borderColor: "var(--primary, #007bff)",
    backgroundColor: "var(--accent, #e3f2fd)",
  },
  uploadIcon: {
    fontSize: "48px",
    marginBottom: "20px",
  },
  dropzoneText: {
    fontSize: "16px",
    color: "var(--card-foreground)",
    marginBottom: "15px",
  },
  browseButton: {
    display: "inline-block",
    padding: "10px 24px",
    backgroundColor: "var(--primary, #007bff)",
    color: "white",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "500",
    transition: "background-color 0.2s ease",
  },
  fileInput: {
    display: "none",
  },
  helpText: {
    fontSize: "13px",
    color: "var(--muted-foreground, #999)",
    marginTop: "15px",
  },
  filePreview: {
    display: "flex",
    alignItems: "center",
    padding: "20px",
    backgroundColor: "var(--card, #fff)",
    borderRadius: "8px",
    gap: "15px",
  },
  fileIcon: {
    fontSize: "32px",
  },
  fileInfo: {
    flex: 1,
    textAlign: "left",
  },
  fileName: {
    fontSize: "16px",
    fontWeight: "500",
    color: "var(--card-foreground)",
    marginBottom: "5px",
  },
  fileSize: {
    fontSize: "14px",
    color: "var(--muted-foreground, #666)",
  },
  removeButton: {
    background: "none",
    border: "none",
    fontSize: "24px",
    color: "var(--destructive, #dc3545)",
    cursor: "pointer",
    padding: "5px",
    lineHeight: 1,
  },
  error: {
    padding: "12px",
    backgroundColor: "var(--destructive, #fee)",
    color: "var(--destructive-foreground, #c00)",
    borderRadius: "6px",
    marginBottom: "20px",
    fontSize: "14px",
  },
  uploadButton: {
    width: "100%",
    padding: "14px",
    fontSize: "16px",
    fontWeight: "600",
    color: "white",
    backgroundColor: "var(--primary, #007bff)",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    transition: "background-color 0.2s ease",
  },
  uploadButtonDisabled: {
    backgroundColor: "var(--muted, #ccc)",
    cursor: "not-allowed",
    opacity: 0.6,
  },
};
