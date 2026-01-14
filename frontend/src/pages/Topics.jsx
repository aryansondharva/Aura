// Topics.jsx
import React, { useState, useEffect } from "react";
import FileUpload from "../components/FileUpload";
import Sidebar from "../components/Sidebar";
import History from "../components/History";
import useSession from "../utils/useSession";
import {
  EqualApproximately,
  Trash2,
  Pencil,
  PackageSearch,
} from "lucide-react";
import ProgressBar from "react-bootstrap/ProgressBar";
import "bootstrap/dist/css/bootstrap.min.css";
import supabase from "../utils/supabaseClient";
import { useNavigate } from "react-router-dom";
import { ChevronDown, ChevronUp } from "lucide-react";
import { ClockPlus } from "lucide-react";
import { FolderArchive } from "lucide-react";

const Topics = () => {
  const {
    userId,
    isLoggedIn,
    isSidebarOpen,
    isHistoryOpen,
    toggleSidebar,
    toggleHistory,
  } = useSession();

  const navigate = useNavigate();

  // const [uploadedFiles, setUploadedFiles] = useState([]);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [topics, setTopics] = useState([]);
  const [editingTopicId, setEditingTopicId] = useState(null);
  const [newTitle, setNewTitle] = useState("");
  const [loadingTopics, setLoadingTopics] = useState(false);
  const [expandedSummaries, setExpandedSummaries] = useState({});
  const toggleSummary = (topicId) => {
    setExpandedSummaries((prev) => ({
      ...prev,
      [topicId]: !prev[topicId],
    }));
  };

  const fetchTopics = async () => {
    setLoadingTopics(true);
    try {
      // 1. Trigger backend update of weak topics
      await fetch("http://localhost:5000/api/update-weak-topics", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ user_id: userId }),
      });

      // 2. Now fetch topics from Supabase
      const { data, error } = await supabase
        .from("topics")
        .select("*")
        .eq("user_id", userId)
        .eq("archive_status", "not_archived") // exclude archived
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Failed to fetch topics:", error.message);
        return;
      }

      setTopics(data || []);
    } catch (err) {
      console.error("Error updating and fetching topics:", err);
    } finally {
      setLoadingTopics(false); // 👉 Done loading
    }
  };

  const handleFileSelect = async (file) => {
    if (!userId) {
      alert("You must be logged in to upload a file.");
      return;
    }

    setUploading(true);
    setProgress(0);

    try {
      await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        const formData = new FormData();

        formData.append("file", file);
        formData.append("user_id", userId);

        xhr.open("POST", "http://localhost:5000/api/quiz-question");

        // 👇 Tracks file upload progress
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            let percent = Math.floor((event.loaded / event.total) * 100);
            // Show 0-90% during upload
            if (percent > 90) percent = 90;
            setProgress(percent);
          }
        };

        // 👇 Fires after upload is complete but while server is generating topics
        xhr.onload = () => {
          setProgress(100); // full bar when processing completes

          if (xhr.status === 200) {
            let result;
            try {
              result = JSON.parse(xhr.responseText);
            } catch (error) {
              console.error("JSON parse error:", error);
              return reject(new Error("Invalid JSON response from server."));
            }

            // Handle different backend statuses
            if (result.status === "success") {
              alert(`✅ ${result.message}`);
              fetchTopics();
              resolve();
            } else if (result.status === "warning") {
              alert(
                `⚠️ Warning:\n${result.message}\n\n`
              );
              fetchTopics();
              resolve();
            } else if (result.status === "error") {
              alert(`❌ Error:\n${result.message}`);
              reject(new Error(result.message));
            } else {
              alert("Unexpected server response.");
              reject(new Error("Unexpected server response."));
            }

          } else {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        };

        xhr.onerror = () =>
          reject(new Error("Upload failed due to a network error"));
        xhr.send(formData);
      });
    } catch (error) {
      console.error("Error uploading:", error);
      alert(error.message || "Failed to upload and process file.");
    } finally {
      setTimeout(() => {
        setUploading(false);
        setProgress(0);
      }, 800); // Leave progress bar visible a bit after success
    }
  };

  const handleEditTopic = async (topicId) => {
    if (!newTitle.trim()) return;

    const { error } = await supabase
      .from("topics")
      .update({ title: newTitle })
      .eq("topic_id", topicId);

    if (error) {
      alert("Failed to update topic");
      console.error(error);
    } else {
      setEditingTopicId(null);
      setNewTitle("");
      fetchTopics();
    }
  };

  const handleDeleteTopic = async (topicId) => {
    const confirmDelete = confirm(
      "Are you sure you want to delete this topic?"
    );
    if (!confirmDelete) return;

    const { error } = await supabase
      .from("topics")
      .delete()
      .eq("topic_id", topicId);

    if (error) {
      alert("Failed to delete topic");
      console.error(error);
    } else {
      fetchTopics();
    }
  };

  const handleTakeExam = (topic) => {
    // Redirect to exam page, pass topic details via state
    navigate("/exam", {
      state: {
        topicId: topic.topic_id,
        topicTitle: topic.title,
        fileName: topic.file_name,
      },
    });
  };

  useEffect(() => {
    if (userId) {
      fetchTopics();
    }
  }, [userId]);

  const handleArchiveFileTopics = async (fileName) => {
    const confirmArchive = confirm(
      `Are you sure you want to archive all topics under "${fileName}"?`
    );
    if (!confirmArchive) return;

    const { error } = await supabase
      .from("topics")
      .update({ archive_status: "archived" })
      .eq("file_name", fileName)
      .eq("user_id", userId);

    if (error) {
      console.error("Failed to archive topics:", error.message);
      alert("Failed to archive topics.");
    } else {
      fetchTopics(); // Refresh list after archiving
    }
  };

  const handleArchiveTopic = async (topicId) => {
    const confirmArchive = confirm(
      "Are you sure you want to archive this topic?"
    );
    if (!confirmArchive) return;

    const { error } = await supabase
      .from("topics")
      .update({ archive_status: "archived" })
      .eq("topic_id", topicId)
      .eq("user_id", userId);

    if (error) {
      console.error("Failed to archive topic:", error.message);
      alert("Failed to archive topic.");
    } else {
      fetchTopics(); // Refresh after archiving
    }
  };

  return (
    <div className="chat chat-wrapper d-flex min-vh-100">
      {/* Sidebar and History */}
      <div className={`sidebar-area ${isSidebarOpen ? "open" : "collapsed"}`}>
        <Sidebar
          {...{
            isOpen: isSidebarOpen,
            toggleSidebar,
            toggleHistory,
            isHistoryOpen,
            isLoggedIn,
          }}
        />
        <History
          {...{ isLoggedIn, userId, isHistoryOpen, onClose: toggleHistory }}
        />
      </div>

      {/* Main Content */}
      <div className="chat-content flex-grow-1 p-4 text-white d-flex flex-column">
        {/* Header */}
        <div className="container text-center mb-4 mt-4">
          <h2 className="grad_text">Upload Your PDF</h2>
        </div>

        {/* Upload Section */}
        <div className="container mb-4">
          <div className="row justify-content-center mb-">
            <div className="col-xl-6 col-md-8">
              <div
                className="text-center border border-secondary rounded p-5 bg-secondary bg-opacity-25 d-flex flex-column align-items-center justify-content-center"
                style={{ cursor: "pointer" }}
              >
                <FileUpload
                  onFileSelect={handleFileSelect}
                  disableDefaultUpload={true}
                />
                <p className="lead mt-3">
                  Upload your files to generate topics
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Progress Section */}
        {uploading && (
          <div className="container text-center mb-4">
            <h5 className="text-info grad_text">⏳ Processing your file...</h5>
            <ProgressBar
              animated
              now={progress}
              label={`${progress}%`}
              className="mt-3"
            />
          </div>
        )}

        {/* Topics Section */}
        <div className="container">
          {loadingTopics ? (
            <div className="text-center my-5">
              <div className="spinner-border text-light" role="status">
                <span className="visually-hidden">Loading topics...</span>
              </div>
              <p className="mt-3">Loading topics...</p>
            </div>
          ) : topics.length > 0 ? (
            Object.entries(
              topics.reduce((acc, topic) => {
                if (!acc[topic.file_name]) acc[topic.file_name] = [];
                acc[topic.file_name].push(topic);
                return acc;
              }, {})
            ).map(([fileName, topicList], i) => (
              <div className="mt-4" key={i}>
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h4 className="text-white mb-0">
                    <PackageSearch className="me-2" />
                    {fileName}
                  </h4>
                  <button
                    className="btn btn-sm btn-answer"
                    onClick={() => handleArchiveFileTopics(fileName)}
                  >
                    <FolderArchive /> Archieve Module
                  </button>
                </div>
                <div className="row">
                  {topicList.map((topic, idx) => (
                    <div className="col-sm-6 col-md-6 col-xl-4 mb-4" key={idx}>
                      <div className="card topic_card text-white">
                        <div className="card-body">
                          <div className="topic_status d-flex justify-content-between align-items-center mb-4">
                            <span
                              className={`badge m-0 ${topic.topic_status === "Weak"
                                ? "badge-weak"
                                : topic.topic_status === "Completed"
                                  ? "badge-completed"
                                  : ""
                                }`}
                            >
                              {topic.topic_status}
                            </span>
                            <p className="card-text d-flex align-items-center">
                              <ClockPlus className="pe-1" />{" "}
                              {new Date(topic.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="d-flex justify-content-between align-items-start mb-2">
                            {editingTopicId === topic.topic_id ? (
                              <input
                                type="text"
                                className="form-control form-control-sm me-2"
                                value={newTitle}
                                onChange={(e) => setNewTitle(e.target.value)}
                                onBlur={() => handleEditTopic(topic.topic_id)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter")
                                    handleEditTopic(topic.topic_id);
                                  if (e.key === "Escape") {
                                    setEditingTopicId(null);
                                    setNewTitle("");
                                  }
                                }}
                                autoFocus
                              />
                            ) : (
                              <h5 className="card-title mb-0">{topic.title}</h5>
                            )}

                            <div className="d-flex gap-2">
                              <Pencil
                                className="edit-icon"
                                size={18}
                                style={{ cursor: "pointer" }}
                                onClick={() => {
                                  setEditingTopicId(topic.topic_id);
                                  setNewTitle(topic.title);
                                }}
                              />
                              <Trash2
                                className="edit-icon"
                                size={18}
                                style={{ cursor: "pointer" }}
                                onClick={() =>
                                  handleDeleteTopic(topic.topic_id)
                                }
                              />
                            </div>
                          </div>

                          {/* Toggle Button with Arrow */}
                          <button
                            className="btn btn-sm btn-outline w-100 p-0 d-flex justify-content-between align-items-center text-white mt-2"
                            onClick={() => toggleSummary(topic.topic_id)}
                          >
                            Topic Summary
                            {expandedSummaries[topic.topic_id] ? (
                              <ChevronUp size={16} />
                            ) : (
                              <ChevronDown size={16} />
                            )}
                          </button>

                          {expandedSummaries[topic.topic_id] && (
                            <div className="card-topic-summary text-white small mt-2">
                              {topic.topic_summary || "No summary available."}
                            </div>
                          )}
                          <div className="d-flex justify-content-between align-items-center mt-4">
                            <button
                              className="btn btn-sm btn-cs"
                              onClick={() => handleTakeExam(topic)}
                            >
                              Take Exam
                            </button>
                            <button
                              className="btn btn-sm btn-outline-light"
                              onClick={() => handleArchiveTopic(topic.topic_id)}
                            >
                              <FolderArchive />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center text-muted">
              <p>No topics found. Upload a file to get started!</p>
            </div>
          )}
        </div>

        {/* Mobile Sidebar Toggle */}
        <span className="navbar-toggler-menu">
          <EqualApproximately
            className="d-md-none position-fixed top-0 start-0 m-3"
            onClick={toggleSidebar}
            style={{ zIndex: 99 }}
          />
        </span>
      </div>
    </div>
  );
};

export default Topics;