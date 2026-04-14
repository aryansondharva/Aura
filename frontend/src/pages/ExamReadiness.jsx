import React, { useState, useEffect, useCallback } from "react";
import Sidebar from "../components/Sidebar";
import History from "../components/History";
import useSession from "../utils/useSession";
import {
  EqualApproximately,
  Upload,
  BookOpen,
  Brain,
  TrendingUp,
  Share2,
  ChevronDown,
  ChevronUp,
  Trash2,
  FileText,
  Target,
  Zap,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Sparkles,
  Eye,
  Copy,
  ArrowRight,
  Plus,
  X,
  Loader2,
  BarChart3,
  Calendar,
} from "lucide-react";
import "bootstrap/dist/css/bootstrap.min.css";
import { useNavigate } from "react-router-dom";

const BACKEND = import.meta.env.VITE_BACKEND_URL;

const ExamReadiness = () => {
  const {
    user,
    userId,
    isLoggedIn,
    isSidebarOpen,
    isHistoryOpen,
    toggleSidebar,
    toggleHistory,
  } = useSession();

  const navigate = useNavigate();

  // View state
  const [activeView, setActiveView] = useState("sessions"); // sessions | create | dashboard
  const [sessions, setSessions] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [loading, setLoading] = useState(false);

  // Create session state
  const [sessionName, setSessionName] = useState("");
  const [subjectName, setSubjectName] = useState("");
  const [examDate, setExamDate] = useState("");
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);

  // Syllabus state
  const [syllabusTopics, setSyllabusTopics] = useState([]);
  const [newTopicName, setNewTopicName] = useState("");
  const [newTopicOptional, setNewTopicOptional] = useState(false);
  const [extractingSyllabus, setExtractingSyllabus] = useState(false);

  // Dashboard state
  const [sessionData, setSessionData] = useState(null);
  const [readinessScore, setReadinessScore] = useState(null);
  const [patterns, setPatterns] = useState([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [expandedPattern, setExpandedPattern] = useState(null);
  const [generatingAnswer, setGeneratingAnswer] = useState(null);

  // Share state
  const [shareLink, setShareLink] = useState(null);
  const [showShareModal, setShowShareModal] = useState(false);

  // ── FETCH SESSIONS ──────────────────────────────────────
  const fetchSessions = useCallback(async () => {
    if (!userId) return;
    try {
      const res = await fetch(`${BACKEND}/api/readiness/sessions/${userId}`);
      const data = await res.json();
      setSessions(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch sessions:", err);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) fetchSessions();
  }, [userId, fetchSessions]);

  // ── CREATE SESSION ──────────────────────────────────────
  const handleCreateSession = async () => {
    if (!sessionName.trim()) {
      alert("Please enter a session name");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${BACKEND}/api/readiness/create-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          session_name: sessionName,
          subject_name: subjectName || null,
          exam_date: examDate || null,
        }),
      });
      const data = await res.json();

      if (data.success) {
        // Now upload files if any selected
        if (selectedFiles.length > 0) {
          await uploadPdfs(data.session_id);
        }

        // Save syllabus if any
        if (syllabusTopics.length > 0) {
          await saveSyllabus(data.session_id);
        }

        setSessionName("");
        setSubjectName("");
        setExamDate("");
        setSelectedFiles([]);
        setSyllabusTopics([]);

        await fetchSessions();
        await openSession(data.session_id);
      } else {
        alert(data.error || "Failed to create session");
      }
    } catch (err) {
      alert("Error creating session: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── UPLOAD PDFs ─────────────────────────────────────────
  const uploadPdfs = async (sessionId) => {
    setUploading(true);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append("session_id", sessionId);
    formData.append("user_id", userId);
    selectedFiles.forEach((file) => formData.append("files", file));

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", `${BACKEND}/api/readiness/upload-pdfs`);

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const pct = Math.min(90, Math.floor((e.loaded / e.total) * 100));
          setUploadProgress(pct);
        }
      };

      xhr.onload = () => {
        setUploadProgress(100);
        if (xhr.status === 200) {
          const result = JSON.parse(xhr.responseText);
          if (result.failed?.length > 0) {
            alert(
              `⚠️ ${result.total_processed} PDFs processed, ${result.total_failed} failed:\n` +
                result.failed.map((f) => `• ${f.fileName}: ${f.error}`).join("\n")
            );
          }
          resolve(result);
        } else {
          reject(new Error("Upload failed"));
        }
        setUploading(false);
      };

      xhr.onerror = () => {
        setUploading(false);
        reject(new Error("Upload failed"));
      };
      xhr.send(formData);
    });
  };

  // ── SAVE SYLLABUS ───────────────────────────────────────
  const saveSyllabus = async (sessionId) => {
    try {
      const res = await fetch(`${BACKEND}/api/readiness/set-syllabus`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          user_id: userId,
          topics: syllabusTopics,
        }),
      });
      const data = await res.json();
      return data;
    } catch (err) {
      console.error("Save syllabus error:", err);
    }
  };

  // ── AI EXTRACT SYLLABUS ────────────────────────────────
  const handleExtractSyllabus = async (sessionId) => {
    setExtractingSyllabus(true);
    try {
      const res = await fetch(`${BACKEND}/api/readiness/extract-syllabus`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId, user_id: userId }),
      });
      const data = await res.json();
      if (data.success && data.topics) {
        setSyllabusTopics(data.topics);
        // Also save to DB
        await saveSyllabus(sessionId);
        alert(`✅ AI extracted ${data.topics.length} topics from your papers!`);
      }
    } catch (err) {
      alert("Failed to extract syllabus: " + err.message);
    } finally {
      setExtractingSyllabus(false);
    }
  };

  // ── OPEN SESSION DASHBOARD ─────────────────────────────
  const openSession = async (sessionId) => {
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND}/api/readiness/session/${sessionId}`);
      const data = await res.json();
      setSessionData(data);
      setActiveSession(sessionId);
      setSyllabusTopics(
        data.syllabus?.map((s) => ({
          name: s.topic_name,
          is_optional: s.is_optional,
          is_selected: s.is_selected,
          unit: s.unit_number,
          syllabus_id: s.syllabus_id,
        })) || []
      );
      setPatterns(data.patterns || []);
      setActiveView("dashboard");

      // Fetch readiness score
      await fetchReadinessScore(sessionId);
    } catch (err) {
      console.error("Open session error:", err);
    } finally {
      setLoading(false);
    }
  };

  // ── FETCH READINESS SCORE ──────────────────────────────
  const fetchReadinessScore = async (sessionId) => {
    try {
      const res = await fetch(
        `${BACKEND}/api/readiness/score/${sessionId}?user_id=${userId}`
      );
      const data = await res.json();
      if (data.success) {
        setReadinessScore(data);
      }
    } catch (err) {
      console.error("Fetch readiness score error:", err);
    }
  };

  // ── RUN AI ANALYSIS ────────────────────────────────────
  const handleAnalyze = async () => {
    if (!activeSession) return;
    setAnalyzing(true);
    try {
      const res = await fetch(
        `${BACKEND}/api/readiness/analyze/${activeSession}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_id: userId }),
        }
      );
      const data = await res.json();
      if (data.success) {
        alert(
          `✅ Analysis complete! Found ${data.totalPatterns} question patterns across ${data.totalPdfs} papers.`
        );
        await openSession(activeSession);
      } else {
        alert(data.error || "Analysis failed");
      }
    } catch (err) {
      alert("Analysis error: " + err.message);
    } finally {
      setAnalyzing(false);
    }
  };

  // ── GET AI ANSWER ──────────────────────────────────────
  const handleGetAnswer = async (patternId) => {
    setGeneratingAnswer(patternId);
    try {
      const res = await fetch(`${BACKEND}/api/readiness/answer/${patternId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: activeSession }),
      });
      const data = await res.json();
      if (data.success) {
        setPatterns((prev) =>
          prev.map((p) =>
            p.pattern_id === patternId ? { ...p, ai_answer: data.answer } : p
          )
        );
      }
    } catch (err) {
      console.error("Get answer error:", err);
    } finally {
      setGeneratingAnswer(null);
    }
  };

  // ── SHARE ──────────────────────────────────────────────
  const handleShare = async () => {
    try {
      const res = await fetch(`${BACKEND}/api/readiness/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: activeSession,
          user_id: userId,
          include_chat: true,
          include_scores: true,
          include_patterns: true,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShareLink(
          `${window.location.origin}/shared/${data.share_token}`
        );
        setShowShareModal(true);
      }
    } catch (err) {
      alert("Share error: " + err.message);
    }
  };

  // ── DELETE SESSION ─────────────────────────────────────
  const handleDeleteSession = async (sessionId) => {
    if (!confirm("Are you sure? This will delete all data for this session.")) return;
    try {
      await fetch(`${BACKEND}/api/readiness/session/${sessionId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId }),
      });
      fetchSessions();
      if (activeSession === sessionId) {
        setActiveView("sessions");
        setActiveSession(null);
      }
    } catch (err) {
      alert("Delete error: " + err.message);
    }
  };

  // ── FILE SELECTION ─────────────────────────────────────
  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    if (files.length + selectedFiles.length > 20) {
      alert("Maximum 20 PDFs allowed per session!");
      return;
    }
    setSelectedFiles((prev) => [...prev, ...files]);
  };

  const removeFile = (idx) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  // ── ADD SYLLABUS TOPIC ─────────────────────────────────
  const addSyllabusTopic = () => {
    if (!newTopicName.trim()) return;
    setSyllabusTopics((prev) => [
      ...prev,
      {
        name: newTopicName,
        is_optional: newTopicOptional,
        is_selected: true,
        unit: prev.length + 1,
      },
    ]);
    setNewTopicName("");
    setNewTopicOptional(false);
  };

  const removeSyllabusTopic = (idx) => {
    setSyllabusTopics((prev) => prev.filter((_, i) => i !== idx));
  };

  // ── GTU READINESS GAUGE ─────────────────────────────────
  const ReadinessGauge = ({ score, level, gtuGrade, projectedSEE, willPass }) => {
    const radius = 78;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (score / 100) * circumference;

    return (
      <div className="readiness-gauge text-center">
        <svg width="200" height="210" viewBox="0 0 200 210">
          <circle cx="100" cy="100" r={radius} fill="none" stroke="#2a2a2a" strokeWidth="12" />
          <circle cx="100" cy="100" r={radius} fill="none"
            stroke={level?.color || "#edb437"} strokeWidth="12"
            strokeDasharray={circumference} strokeDashoffset={offset}
            strokeLinecap="round" transform="rotate(-90 100 100)"
            style={{ transition: "stroke-dashoffset 1.5s ease-in-out" }} />
          <text x="100" y="88" textAnchor="middle" fill="white" fontSize="32" fontWeight="bold">{score}%</text>
          <text x="100" y="108" textAnchor="middle" fill="#edb437" fontSize="13" fontWeight="bold">
            {gtuGrade ? `${gtuGrade.grade} Grade · ${gtuGrade.gp} GP` : 'Not Scored'}
          </text>
          <text x="100" y="124" textAnchor="middle" fill="#666" fontSize="10">
            {projectedSEE != null ? `SEE Projection: ${projectedSEE}/70` : level?.label}
          </text>
        </svg>
        {willPass !== undefined && (
          <div
            className={`badge px-3 py-2 mt-1 d-inline-block ${willPass ? 'bg-success' : 'bg-danger'}`}
            style={{ fontSize: '12px' }}>
            {willPass ? '✅ Pass Likely (≥35% SEE)' : '❌ FAIL RISK — Below 35% SEE'}
          </div>
        )}
      </div>
    );
  };

  // ── NOT LOGGED IN ──────────────────────────────────────
  if (!isLoggedIn) {
    return (
      <div className="chat chat-wrapper d-flex min-vh-100">
        <Sidebar isOpen={isSidebarOpen} toggleSidebar={toggleSidebar}
          toggleHistory={toggleHistory} isHistoryOpen={isHistoryOpen} isLoggedIn={isLoggedIn} />
        <div className="chat-content flex-grow-1 p-4 text-white d-flex align-items-center justify-content-center">
          <div className="text-center">
            <Brain size={64} className="mb-3" style={{ color: "#edb437" }} />
            <h3>Sign in to access Exam Readiness AI</h3>
            <button className="btn btn-cs mt-3" onClick={() => navigate("/signin")}>Sign In</button>
          </div>
        </div>
      </div>
    );
  }

  // ── RENDER ─────────────────────────────────────────────
  return (
    <div className="chat chat-wrapper d-flex min-vh-100">
      <div className={`sidebar-area ${isSidebarOpen ? "open" : "collapsed"}`}>
        <Sidebar isOpen={isSidebarOpen} toggleSidebar={toggleSidebar}
          toggleHistory={toggleHistory} isHistoryOpen={isHistoryOpen} isLoggedIn={isLoggedIn} />
        <History isLoggedIn={isLoggedIn} userId={userId}
          isHistoryOpen={isHistoryOpen} onClose={toggleHistory} />
      </div>

      <div className="chat-content flex-grow-1 p-4 text-white d-flex flex-column">
        {/* Header */}
        <div className="container text-center mb-4 mt-3">
          <h2 className="grad_text d-flex align-items-center justify-content-center gap-2">
            <Brain size={32} /> Exam Readiness AI
          </h2>
          <p className="text-white-50 mt-2">
            Upload question papers, set your syllabus, and let AI predict when you're exam-ready
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="container mb-4">
          <div className="d-flex justify-content-center gap-3 flex-wrap">
            <button
              className={`btn ${activeView === "sessions" ? "btn-cs" : "btn-outline-light"} btn-sm`}
              onClick={() => setActiveView("sessions")}
            >
              <BookOpen size={16} className="me-1" /> My Sessions
            </button>
            <button
              className={`btn ${activeView === "create" ? "btn-cs" : "btn-outline-light"} btn-sm`}
              onClick={() => setActiveView("create")}
            >
              <Plus size={16} className="me-1" /> New Session
            </button>
            {activeSession && (
              <button
                className={`btn ${activeView === "dashboard" ? "btn-cs" : "btn-outline-light"} btn-sm`}
                onClick={() => setActiveView("dashboard")}
              >
                <BarChart3 size={16} className="me-1" /> Dashboard
              </button>
            )}
          </div>
        </div>

        {/* ════════════ SESSIONS LIST ════════════ */}
        {activeView === "sessions" && (
          <div className="container">
            {sessions.length === 0 ? (
              <div className="text-center py-5">
                <Target size={64} className="mb-3" style={{ color: "#edb43755" }} />
                <h4>No exam sessions yet</h4>
                <p className="text-white-50">Create your first session to get started</p>
                <button className="btn btn-cs mt-2" onClick={() => setActiveView("create")}>
                  <Plus size={18} className="me-1" /> Create Session
                </button>
              </div>
            ) : (
              <div className="row">
                {sessions.map((s) => (
                  <div key={s.session_id} className="col-md-6 col-xl-4 mb-4">
                    <div className="card topic_card text-white h-100" style={{ cursor: "pointer" }}
                      onClick={() => openSession(s.session_id)}>
                      <div className="card-body">
                        <div className="d-flex justify-content-between align-items-start mb-2">
                          <h5 className="card-title mb-0">{s.session_name}</h5>
                          <Trash2 size={16} style={{ cursor: "pointer", opacity: 0.5 }}
                            onClick={(e) => { e.stopPropagation(); handleDeleteSession(s.session_id); }} />
                        </div>
                        {s.subject_name && (
                          <span className="badge bg-secondary mb-2">{s.subject_name}</span>
                        )}
                        <div className="d-flex justify-content-between align-items-center mt-3">
                          <span className="small text-white-50">
                            <FileText size={14} className="me-1" />
                            {s.total_pdfs} PDFs
                          </span>
                          <span className="small text-white-50">
                            <Calendar size={14} className="me-1" />
                            {s.exam_date ? new Date(s.exam_date).toLocaleDateString() : "No date"}
                          </span>
                        </div>
                        <div className="mt-3">
                          <div className="d-flex justify-content-between align-items-center mb-1">
                            <small>Readiness</small>
                            <small style={{ color: "#edb437" }}>{s.readiness_score || 0}%</small>
                          </div>
                          <div className="progress" style={{ height: "6px", backgroundColor: "#2a2a2a" }}>
                            <div className="progress-bar" style={{
                              width: `${s.readiness_score || 0}%`,
                              background: "linear-gradient(90deg, #edb437, #e49c00)",
                            }} />
                          </div>
                        </div>
                        <div className="mt-3 text-end">
                          <span className={`badge ${s.status === "ready" ? "bg-success" : s.status === "analyzing" ? "bg-warning text-dark" : "bg-secondary"}`}>
                            {s.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ════════════ CREATE SESSION ════════════ */}
        {activeView === "create" && (
          <div className="container" style={{ maxWidth: "800px" }}>
            {/* Session Info */}
            <div className="profile-card mb-4">
              <h5 className="mb-3 d-flex align-items-center gap-2">
                <Sparkles size={20} style={{ color: "#edb437" }} /> Session Details
              </h5>
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label small">Session Name *</label>
                  <input type="text" className="form-control bg-dark text-white border-secondary"
                    placeholder="e.g. Maths 2 Final Prep"
                    value={sessionName} onChange={(e) => setSessionName(e.target.value)} />
                </div>
                <div className="col-md-6">
                  <label className="form-label small">Subject</label>
                  <input type="text" className="form-control bg-dark text-white border-secondary"
                    placeholder="e.g. Engineering Mathematics II"
                    value={subjectName} onChange={(e) => setSubjectName(e.target.value)} />
                </div>
                <div className="col-md-6">
                  <label className="form-label small">Exam Date</label>
                  <input type="date" className="form-control bg-dark text-white border-secondary"
                    value={examDate} onChange={(e) => setExamDate(e.target.value)} />
                </div>
              </div>
            </div>

            {/* Bulk PDF Upload */}
            <div className="profile-card mb-4">
              <h5 className="mb-3 d-flex align-items-center gap-2">
                <Upload size={20} style={{ color: "#edb437" }} /> Upload Question Papers (up to 20)
              </h5>
              <div className="text-center border border-secondary rounded p-4"
                style={{ borderStyle: "dashed !important", cursor: "pointer" }}
                onClick={() => document.getElementById("bulk-pdf-input").click()}>
                <Upload size={40} className="mb-2" style={{ color: "#edb43777" }} />
                <p className="mb-1">Click or drag PDFs here</p>
                <small className="text-white-50">{selectedFiles.length}/20 files selected</small>
                <input id="bulk-pdf-input" type="file" accept=".pdf" multiple
                  style={{ display: "none" }} onChange={handleFileSelect} />
              </div>

              {selectedFiles.length > 0 && (
                <div className="mt-3">
                  {selectedFiles.map((file, idx) => (
                    <div key={idx}
                      className="d-flex align-items-center justify-content-between py-2 px-3 mb-1 rounded"
                      style={{ backgroundColor: "#1a1a1a" }}>
                      <span className="small">
                        <FileText size={14} className="me-2" style={{ color: "#edb437" }} />
                        {file.name}
                      </span>
                      <X size={16} style={{ cursor: "pointer", opacity: 0.5 }}
                        onClick={() => removeFile(idx)} />
                    </div>
                  ))}
                </div>
              )}

              {uploading && (
                <div className="mt-3">
                  <div className="progress" style={{ height: "8px" }}>
                    <div className="progress-bar progress-bar-striped progress-bar-animated"
                      style={{ width: `${uploadProgress}%`, background: "#edb437" }} />
                  </div>
                  <small className="text-white-50 mt-1 d-block text-center">
                    Uploading... {uploadProgress}%
                  </small>
                </div>
              )}
            </div>

            {/* Syllabus */}
            <div className="profile-card mb-4">
              <h5 className="mb-3 d-flex align-items-center gap-2">
                <BookOpen size={20} style={{ color: "#edb437" }} /> Syllabus Topics
                <small className="text-white-50 ms-auto">Mark optional subjects</small>
              </h5>
              <div className="d-flex gap-2 mb-3">
                <input type="text" className="form-control bg-dark text-white border-secondary"
                  placeholder="Topic name (e.g. Differential Equations)"
                  value={newTopicName} onChange={(e) => setNewTopicName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addSyllabusTopic()} />
                <div className="form-check d-flex align-items-center ms-2">
                  <input className="form-check-input" type="checkbox" id="optionalCheck"
                    checked={newTopicOptional} onChange={(e) => setNewTopicOptional(e.target.checked)} />
                  <label className="form-check-label ms-1 small text-nowrap" htmlFor="optionalCheck">
                    Optional
                  </label>
                </div>
                <button className="btn btn-cs btn-sm text-nowrap" onClick={addSyllabusTopic}>
                  <Plus size={16} /> Add
                </button>
              </div>

              {syllabusTopics.length > 0 && (
                <div className="mt-2">
                  {syllabusTopics.map((topic, idx) => (
                    <div key={idx}
                      className="d-flex align-items-center justify-content-between py-2 px-3 mb-1 rounded"
                      style={{ backgroundColor: "#1a1a1a" }}>
                      <span className="small">
                        <span className="me-2" style={{ color: "#edb437" }}>Unit {idx + 1}</span>
                        {topic.name}
                        {topic.is_optional && (
                          <span className="badge bg-secondary ms-2">Optional</span>
                        )}
                      </span>
                      <X size={16} style={{ cursor: "pointer", opacity: 0.5 }}
                        onClick={() => removeSyllabusTopic(idx)} />
                    </div>
                  ))}
                </div>
              )}

              <small className="text-white-50 mt-2 d-block">
                💡 Tip: You can skip this — after uploading papers, click "AI Extract Syllabus" to auto-detect topics.
              </small>
            </div>

            {/* Create Button */}
            <div className="text-center mb-5">
              <button className="btn btn-cs btn-lg px-5" onClick={handleCreateSession}
                disabled={loading || !sessionName.trim()}>
                {loading ? (
                  <><Loader2 size={20} className="me-2 spinner-border-sm" /> Creating...</>
                ) : (
                  <><Sparkles size={20} className="me-2" /> Create Session & Start Analysis</>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ════════════ SESSION DASHBOARD ════════════ */}
        {activeView === "dashboard" && sessionData && (
          <div className="container">
            {/* Session Header */}
            <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
              <div>
                <h4 className="mb-0">{sessionData.session?.session_name}</h4>
                {sessionData.session?.subject_name && (
                  <span className="badge bg-secondary mt-1">{sessionData.session.subject_name}</span>
                )}
              </div>
              <div className="d-flex gap-2">
                <button className="btn btn-outline-light btn-sm" onClick={handleAnalyze}
                  disabled={analyzing}>
                  {analyzing ? (
                    <><Loader2 size={14} className="me-1" /> Analyzing...</>
                  ) : (
                    <><Brain size={14} className="me-1" /> Run AI Analysis</>
                  )}
                </button>
                <button className="btn btn-outline-light btn-sm"
                  onClick={() => handleExtractSyllabus(activeSession)}
                  disabled={extractingSyllabus}>
                  {extractingSyllabus ? (
                    <><Loader2 size={14} className="me-1" /> Extracting...</>
                  ) : (
                    <><Sparkles size={14} className="me-1" /> AI Extract Syllabus</>
                  )}
                </button>
                <button className="btn btn-cs btn-sm" onClick={handleShare}>
                  <Share2 size={14} className="me-1" /> Share
                </button>
              </div>
            </div>

            {/* Readiness Score */}
            <div className="row mb-4">
              <div className="col-lg-4 mb-3">
                <div className="profile-card text-center h-100 d-flex flex-column justify-content-center">
                  <h6 className="mb-3">GTU Exam Readiness</h6>
                  <ReadinessGauge
                    score={readinessScore?.overall || sessionData.session?.readiness_score || 0}
                    level={readinessScore?.level || { label: 'Run Analysis', color: '#666', emoji: '⚪' }}
                    gtuGrade={readinessScore?.gtuGrade}
                    projectedSEE={readinessScore?.projectedSEE}
                    willPass={readinessScore?.willPass}
                  />
                  {readinessScore?.estimatedDate && (
                    <p className="small mt-2 text-white-50">
                      <Calendar size={14} className="me-1" />
                      {readinessScore.estimatedDate}
                    </p>
                  )}
                </div>
              </div>

              {/* Score Breakdown */}
              <div className="col-lg-8 mb-3">
                <div className="profile-card h-100">
                  <h6 className="mb-3">GTU Score Breakdown
                    <small className="text-white-50 ms-2" style={{fontSize:'10px'}}>70 marks SEE · 30 marks CIE</small>
                  </h6>
                  {readinessScore?.breakdown ? (
                    <div className="row g-3">
                      {Object.entries(readinessScore.breakdown).map(([key, val]) => (
                        <div key={key} className="col-6">
                          <div className="p-3 rounded" style={{ backgroundColor: "#1a1a1a" }}>
                            <div className="d-flex justify-content-between mb-1">
                              <span className="small">{val.label || key}</span>
                              <span className="small" style={{ color: "#edb437" }}>
                                {val.score}% <span className="text-white-50">({val.weight})</span>
                              </span>
                            </div>
                            <div className="progress" style={{ height: "4px", backgroundColor: "#2a2a2a" }}>
                              <div className="progress-bar" style={{
                                width: `${val.score}%`,
                                background: val.score >= 65 ? "#22c55e" : val.score >= 40 ? "#eab308" : "#ef4444",
                              }} />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-white-50">
                      <AlertCircle size={32} className="mb-2" />
                      <p>Run AI Analysis first, then take quizzes to see your score</p>
                    </div>
                  )}

                  {/* Recommendations */}
                  {readinessScore?.recommendations && (
                    <div className="mt-3">
                      <h6 className="small text-white-50 mb-2">AI Recommendations</h6>
                      {readinessScore.recommendations.map((rec, i) => (
                        <div key={i} className="d-flex align-items-start gap-2 mb-2 p-2 rounded"
                          style={{ backgroundColor: "#1a1a1a" }}>
                          {rec.priority === "high" ? (
                            <AlertCircle size={16} className="text-danger mt-1 flex-shrink-0" />
                          ) : (
                            <Zap size={16} style={{ color: "#edb437" }} className="mt-1 flex-shrink-0" />
                          )}
                          <div>
                            <span className="small">{rec.message}</span>
                            <br />
                            <span className="small text-white-50">{rec.action}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Uploaded PDFs + Syllabus */}
            <div className="row mb-4">
              <div className="col-md-6 mb-3">
                <div className="profile-card h-100">
                  <h6 className="mb-3">
                    <FileText size={16} className="me-2" style={{ color: "#edb437" }} />
                    Uploaded Papers ({sessionData.pdfs?.length || 0})
                  </h6>
                  {sessionData.pdfs?.map((pdf) => (
                    <div key={pdf.pdf_id} className="d-flex align-items-center gap-2 mb-2 p-2 rounded"
                      style={{ backgroundColor: "#1a1a1a" }}>
                      <FileText size={14} style={{ color: "#edb437" }} />
                      <span className="small flex-grow-1">{pdf.file_name}</span>
                      <span className="badge bg-secondary">{pdf.page_count} pg</span>
                      {pdf.processed && <CheckCircle2 size={14} className="text-success" />}
                    </div>
                  ))}
                </div>
              </div>

              <div className="col-md-6 mb-3">
                <div className="profile-card h-100">
                  <h6 className="mb-3">
                    <BookOpen size={16} className="me-2" style={{ color: "#edb437" }} />
                    Syllabus Topics ({sessionData.syllabus?.length || 0})
                  </h6>
                  {sessionData.syllabus?.length > 0 ? (
                    sessionData.syllabus.map((topic) => (
                      <div key={topic.syllabus_id}
                        className="d-flex align-items-center gap-2 mb-2 p-2 rounded"
                        style={{ backgroundColor: "#1a1a1a" }}>
                        <span className="small" style={{ color: "#edb437" }}>U{topic.unit_number}</span>
                        <span className="small flex-grow-1">{topic.topic_name}</span>
                        {topic.is_optional && <span className="badge bg-secondary">Opt</span>}
                        <span className="badge bg-dark">{topic.question_count || 0} Q</span>
                      </div>
                    ))
                  ) : (
                    <p className="small text-white-50">
                      No syllabus set. Click "AI Extract Syllabus" above.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Question Patterns — Most Asked Questions */}
            <div className="profile-card mb-4">
              <h6 className="mb-3 d-flex align-items-center gap-2">
                <Target size={18} style={{ color: "#edb437" }} />
                Most Asked Questions
                <span className="badge bg-secondary ms-2">{patterns.length} patterns</span>
              </h6>

              {patterns.length > 0 ? (
                <div>
                  {patterns.map((pattern) => (
                    <div key={pattern.pattern_id} className="mb-3 p-3 rounded"
                      style={{
                        backgroundColor: "#1a1a1a",
                        borderLeft: `3px solid ${
                          pattern.frequency_count >= 3 ? '#ef4444' :
                          pattern.frequency_count >= 2 ? '#eab308' : '#edb437'
                        }`
                      }}>
                      <div className="d-flex justify-content-between align-items-start">
                        <div className="flex-grow-1">
                          <div className="d-flex align-items-center gap-1 mb-2 flex-wrap">
                            {/* GTU frequency */}
                            <span className="badge" style={{
                              backgroundColor: pattern.frequency_count >= 3 ? '#ef4444' :
                                pattern.frequency_count >= 2 ? '#eab308' : '#22c55e',
                              fontSize: '10px',
                            }}>🔥 {pattern.frequency_count}× GTU</span>

                            {/* Marks */}
                            {pattern.marks && (
                              <span className="badge bg-dark" style={{ fontSize: '10px' }}>
                                {pattern.marks} marks
                              </span>
                            )}

                            {/* GTU Position: Q1 or Q2-Q5 */}
                            {pattern.appears_in_q1 && (
                              <span className="badge" style={{ backgroundColor: '#7c3aed', fontSize: '10px' }}>
                                Q1 Short
                              </span>
                            )}
                            {pattern.appears_in_long && (
                              <span className="badge" style={{ backgroundColor: '#0891b2', fontSize: '10px' }}>
                                Q2–Q5 Long
                              </span>
                            )}

                            {/* Bloom's Taxonomy Level */}
                            {pattern.bloom_level && (
                              <span className="badge bg-secondary" style={{ fontSize: '10px' }}
                                title={`Bloom's: ${ {'C1':'Remember','C2':'Understand','C3':'Apply','C4':'Analyse','C5':'Evaluate','C6':'Create'}[pattern.bloom_level] || pattern.bloom_level }`}>
                                {pattern.bloom_level}
                              </span>
                            )}

                            {/* Unit */}
                            {pattern.unit && (
                              <span className="badge" style={{ backgroundColor: '#166534', fontSize: '10px' }}>
                                Unit {pattern.unit}
                              </span>
                            )}

                            {/* Difficulty */}
                            <span className="badge bg-dark" style={{ fontSize: '9px', opacity: 0.7 }}>
                              {pattern.difficulty}
                            </span>
                          </div>

                          <p className="mb-1 small">{pattern.question_text}</p>

                          {pattern.source_pdfs && Array.isArray(pattern.source_pdfs) && pattern.source_pdfs.length > 0 && (
                            <small className="text-white-50">
                              📄 Found in: {pattern.source_pdfs.join(', ')}
                            </small>
                          )}
                        </div>

                        <div className="d-flex gap-1 ms-2">
                          <button className="btn btn-outline-light btn-sm"
                            onClick={() => setExpandedPattern(
                              expandedPattern === pattern.pattern_id ? null : pattern.pattern_id
                            )}>
                            {expandedPattern === pattern.pattern_id
                              ? <ChevronUp size={14} />
                              : <Eye size={14} />}
                          </button>
                          {!pattern.ai_answer && (
                            <button className="btn btn-cs btn-sm"
                              onClick={() => handleGetAnswer(pattern.pattern_id)}
                              disabled={generatingAnswer === pattern.pattern_id}
                              title="Generate GTU model answer">
                              {generatingAnswer === pattern.pattern_id
                                ? <Loader2 size={14} className="spinner-border-sm" />
                                : <Sparkles size={14} />}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Expanded GTU Model Answer */}
                      {expandedPattern === pattern.pattern_id && pattern.ai_answer && (
                        <div className="mt-3 p-3 rounded" style={{ backgroundColor: "#0a0a0a" }}>
                          <h6 className="small mb-2" style={{ color: "#edb437" }}>
                            <Sparkles size={12} className="me-1" />
                            GTU Model Answer
                            {pattern.marks ? ` · ${pattern.marks} Marks` : ''}
                            {pattern.bloom_level ? ` · Bloom's ${pattern.bloom_level}` : ''}
                          </h6>
                          <div className="small" style={{ whiteSpace: "pre-wrap" }}>
                            {pattern.ai_answer}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-white-50">
                  <Brain size={40} className="mb-2" />
                  <p>No patterns yet. Upload papers and run AI Analysis.</p>
                </div>
              )}

            </div>

            {/* GTU Topic-wise Breakdown */}
            {readinessScore?.topicScores && readinessScore.topicScores.length > 0 && (
              <div className="profile-card mb-4">
                <h6 className="mb-3 d-flex align-items-center gap-2">
                  <BarChart3 size={18} style={{ color: "#edb437" }} />
                  Unit-wise GTU Readiness
                  <small className="text-white-50 ms-auto">GTU: Q2-Q5 map to units — cover all units!</small>
                </h6>
                <div className="row g-3">
                  {readinessScore.topicScores.map((topic) => (
                    <div key={topic.syllabusId} className="col-md-6 col-xl-4">
                      <div className="p-3 rounded" style={{ backgroundColor: "#1a1a1a" }}>
                        <div className="d-flex justify-content-between mb-1">
                          <span className="small">
                            {topic.unitNumber ? <span style={{ color: '#edb437' }}>Unit {topic.unitNumber}: </span> : ''}
                            {topic.topicName}
                          </span>
                          <span className={`badge ${
                            topic.gtuGrade === 'AA' || topic.gtuGrade === 'AB' ? 'bg-success' :
                            topic.gtuGrade === 'BB' || topic.gtuGrade === 'BC' ? 'bg-warning text-dark' :
                            topic.gtuGrade === 'FF' ? 'bg-danger' : 'bg-secondary'
                          }`}>
                            {topic.gtuGrade || '—'} ({topic.gradePoint ?? '?'}GP)
                          </span>
                        </div>
                        <div className="progress mt-2" style={{ height: "5px", backgroundColor: "#2a2a2a" }}>
                          <div className="progress-bar" style={{
                            width: `${topic.avgPercent}%`,
                            background: topic.mastery === 'strong' ? '#22c55e' : topic.mastery === 'moderate' ? '#eab308' : '#ef4444',
                          }} />
                        </div>
                        <div className="d-flex justify-content-between mt-1">
                          <small className="text-white-50">{topic.attempts} attempt{topic.attempts !== 1 ? 's' : ''}</small>
                          <small className="text-white-50">{topic.questionCount} GTU Qs</small>
                        </div>
                        {topic.isOptional && <span className="badge bg-secondary mt-1" style={{ fontSize: '9px' }}>Optional</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Share Modal */}
        {showShareModal && shareLink && (
          <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
            style={{ backgroundColor: "rgba(0,0,0,0.7)", zIndex: 9999 }}
            onClick={() => setShowShareModal(false)}>
            <div className="profile-card" style={{ maxWidth: "500px", width: "90%" }}
              onClick={(e) => e.stopPropagation()}>
              <h5 className="mb-3 d-flex align-items-center gap-2">
                <Share2 size={20} style={{ color: "#edb437" }} /> Share with Classmates
              </h5>
              <p className="small text-white-50 mb-3">
                Share your readiness analysis, question patterns, and study insights.
                Link expires in 7 days.
              </p>
              <div className="d-flex gap-2">
                <input type="text" className="form-control bg-dark text-white border-secondary"
                  value={shareLink} readOnly />
                <button className="btn btn-cs btn-sm" onClick={() => {
                  navigator.clipboard.writeText(shareLink);
                  alert("Link copied!");
                }}>
                  <Copy size={16} />
                </button>
              </div>
              <button className="btn btn-outline-light btn-sm mt-3 w-100"
                onClick={() => setShowShareModal(false)}>Close</button>
            </div>
          </div>
        )}

        {/* Loading Overlay */}
        {loading && (
          <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
            style={{ backgroundColor: "rgba(0,0,0,0.5)", zIndex: 9999 }}>
            <div className="text-center">
              <div className="spinner-border text-warning" role="status" />
              <p className="mt-2">Loading...</p>
            </div>
          </div>
        )}

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

export default ExamReadiness;
