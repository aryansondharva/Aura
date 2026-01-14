import React from "react";
import { useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus } from "@fortawesome/free-solid-svg-icons";
import { Tooltip } from "bootstrap";

const FileUpload = ({ onFileSelect, disableDefaultUpload = false }) => {
  useEffect(() => {
    const tooltipTriggerList = document.querySelectorAll(
      '[data-bs-toggle="tooltip"]'
    );
    tooltipTriggerList.forEach((tooltipTriggerEl) => {
      new Tooltip(tooltipTriggerEl);
    });
  }, []);

  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB size limit

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      alert("File size exceeds the 5MB limit.");
      return;
    }

    if (onFileSelect) {
      onFileSelect(file);
    }

    if (disableDefaultUpload) {
      return; // ❌ Skip default upload if disabled
    }

    const userId = localStorage.getItem("userId");
    if (!userId) {
      console.error("User ID is not available.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("user_id", userId);
    formData.append("message", "File upload with user_id!");

    try {
      const res = await fetch("http://127.0.0.1:5000/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (res.ok) {
        console.log("✅ Upload success:", data);
      } else {
        const errMsg = data.error || data.message || "Unknown error";

        if (res.status === 409) {
          alert("Duplicate file: " + errMsg);
        } else if (res.status === 413) {
          alert("File too large: " + errMsg);
        } else {
          alert("Upload failed: " + errMsg);
        }

        console.error("❌ Upload failed:", errMsg);
      }
    } catch (err) {
      console.error("❌ Upload error:", err);
      alert("Upload error");
    }
  };

  return (
    <>
      <label
        htmlFor="file-upload"
        className="upload-icon chat_ic"
        data-bs-toggle="tooltip"
        data-bs-placement="top"
        title="Allowed formats: PDF, DOC, DOCX, TXT. Max size: 5 MB."
      >
        <FontAwesomeIcon
          icon={faPlus}
          style={{ color: "#ffffff", cursor: "pointer" }}
        />
      </label>
      <input
        type="file"
        id="file-upload"
        style={{ display: "none" }}
        accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp"
        onChange={handleFileChange}
      />
    </>
  );
};

export default FileUpload;