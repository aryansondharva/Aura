import React, { useState, useEffect, useCallback, useMemo } from "react";
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
  ArrowLeft,
  Plus,
  X,
  Loader2,
  BarChart3,
  Calendar,
  Edit3,
  ChevronRight,
  RefreshCw,
  GraduationCap,
  Award,
  Layers,
  PenTool,
} from "lucide-react";
import "bootstrap/dist/css/bootstrap.min.css";
import { useNavigate } from "react-router-dom";

const BACKEND = import.meta.env.VITE_BACKEND_URL;
const GTU_SUBJECT_PRESETS = [
  { code: "3110005", short: "Maths-2", subject: "Engineering Mathematics II" },
  { code: "3110013", short: "DSA", subject: "Data Structures" },
  { code: "3110014", short: "DBMS", subject: "Database Management Systems" },
  { code: "3110016", short: "OS", subject: "Operating System" },
  { code: "3110007", short: "PPS", subject: "Programming for Problem Solving" },
];
const GTU_PASS_THRESHOLD = 40;
const GTU_STRONG_SCORING_THRESHOLD = 65;
const GTU_WEAK_TOPIC_THRESHOLD = 40;
const GTU_MAX_SEE_SCORE = 70;

/* ─── Custom Styles ─────────────────────────────────────── */
const styles = {
  stepCard: {
    background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
    border: "1px solid rgba(237, 180, 55, 0.15)",
    borderRadius: "16px",
    padding: "28px",
    marginBottom: "20px",
    transition: "all 0.3s ease",
  },
  stepBadge: (active, done) => ({
    width: "36px",
    height: "36px",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "700",
    fontSize: "14px",
    background: done
      ? "linear-gradient(135deg, #22c55e, #16a34a)"
      : active
      ? "linear-gradient(135deg, #edb437, #e49c00)"
      : "#2a2a2a",
    color: done || active ? "#000" : "#666",
    transition: "all 0.3s ease",
    flexShrink: 0,
  }),
  stepLine: (done) => ({
    width: "2px",
    height: "20px",
    backgroundColor: done ? "#22c55e" : "#2a2a2a",
    margin: "0 auto",
    transition: "background-color 0.3s ease",
  }),
  sessionCard: {
    background: "linear-gradient(135deg, #1a1a2e 0%, #0f0f23 100%)",
    border: "1px solid rgba(237, 180, 55, 0.1)",
    borderRadius: "16px",
    padding: "20px",
    cursor: "pointer",
    transition: "all 0.3s ease",
    position: "relative",
    overflow: "hidden",
  },
  glowBorder: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "2px",
    background: "linear-gradient(90deg, transparent, #edb437, transparent)",
    opacity: 0.6,
  },
  patternCard: (freq) => ({
    background: "#0f0f1a",
    borderRadius: "12px",
    padding: "16px",
    marginBottom: "12px",
    borderLeft: `4px solid ${freq >= 3 ? "#ef4444" : freq >= 2 ? "#eab308" : "#22c55e"}`,
    transition: "all 0.2s ease",
  }),
  editBanner: {
    background: "linear-gradient(90deg, rgba(237,180,55,0.1) 0%, rgba(237,180,55,0.05) 100%)",
    border: "1px solid rgba(237,180,55,0.3)",
    borderRadius: "12px",
    padding: "16px 20px",
    marginBottom: "20px",
  },
  emptyState: {
    textAlign: "center",
    padding: "60px 20px",
  },
  pill: (active) => ({
    padding: "8px 20px",
    borderRadius: "50px",
    fontSize: "13px",
    fontWeight: "600",
    border: "none",
    cursor: "pointer",
    transition: "all 0.2s ease",
    background: active
      ? "linear-gradient(135deg, #edb437, #e49c00)"
      : "rgba(255,255,255,0.05)",
    color: active ? "#000" : "#aaa",
  }),
};

  const ExamReadiness = () => {
  const {
    userId,
    isLoggedIn,
    isSidebarOpen,
    isHistoryOpen,
    toggleSidebar,
    toggleHistory,
  } = useSession();

  const navigate = useNavigate();

  // ── Core State ───────────────────────────────────
  const [activeView, setActiveView] = useState("sessions"); // sessions | create | dashboard
  const [sessions, setSessions] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [loading, setLoading] = useState(false);

  // ── Create/Edit wizard state ─────────────────────
  const [wizardStep, setWizardStep] = useState(1); // 1=info, 2=pdfs, 3=syllabus
  const [sessionName, setSessionName] = useState("");
  const [subjectName, setSubjectName] = useState("");
  const [examDate, setExamDate] = useState("");
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);

  // ── Syllabus state ───────────────────────────────
  const [syllabusTopics, setSyllabusTopics] = useState([]);
  const [newTopicName, setNewTopicName] = useState("");
  const [newTopicOptional, setNewTopicOptional] = useState(false);
  const [extractingSyllabus, setExtractingSyllabus] = useState(false);

  // ── Dashboard state ──────────────────────────────
  const [sessionData, setSessionData] = useState(null);
  const [readinessScore, setReadinessScore] = useState(null);
  const [patterns, setPatterns] = useState([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [expandedPattern, setExpandedPattern] = useState(null);
  const [generatingAnswer, setGeneratingAnswer] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [dashTab, setDashTab] = useState("overview"); // overview | questions | topics | output

  // ── Share state ──────────────────────────────────
  const [shareLink, setShareLink] = useState(null);
  const [showShareModal, setShowShareModal] = useState(false);

  const applyGtuPreset = (preset) => {
    setSubjectName(preset.subject);
    if (!sessionName.trim()) {
      setSessionName(`${preset.short} GTU Prep`);
    }
  };

  const gtuPowerInsights = useMemo(() => {
    const overallReadinessScore =
      readinessScore?.overall ?? sessionData?.session?.readiness_score ?? 0;
    const examDateValue = sessionData?.session?.exam_date || examDate || null;
    const daysLeft = examDateValue
      ? Math.max(0, Math.ceil((new Date(examDateValue) - new Date()) / (1000 * 60 * 60 * 24)))
      : null;

    const frequencyByUnit = (patterns || []).reduce((acc, pattern) => {
      const unit = pattern?.unit;
      if (!unit) return acc;
      acc[unit] = (acc[unit] || 0) + (pattern.frequency_count || 1);
      return acc;
    }, {});

    const highYieldUnits = Object.entries(frequencyByUnit)
      .map(([unit, frequency]) => ({ unit: Number(unit), frequency }))
      .filter((item) => Number.isFinite(item.unit))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 3);

    const weakTopics = (readinessScore?.topicScores || [])
      .filter(
        (topic) =>
          topic.mastery === "weak" ||
          (topic.avgPercent ?? 0) < GTU_WEAK_TOPIC_THRESHOLD
      )
      .sort((a, b) => (a.avgPercent ?? 0) - (b.avgPercent ?? 0))
      .slice(0, 3);

    const longQuestionCount = (patterns || []).filter((p) => p.appears_in_long).length;
    const longQuestionShare = patterns?.length
      ? Math.round((longQuestionCount / patterns.length) * 100)
      : 0;

    return {
      overallReadinessScore,
      daysLeft,
      highYieldUnits,
      weakTopics,
      longQuestionShare,
      passGap:
        overallReadinessScore < GTU_PASS_THRESHOLD
          ? GTU_PASS_THRESHOLD - overallReadinessScore
          : 0,
      rankGap:
        overallReadinessScore < GTU_STRONG_SCORING_THRESHOLD
          ? GTU_STRONG_SCORING_THRESHOLD - overallReadinessScore
          : 0,
      dailyPatternTarget:
        daysLeft && daysLeft > 0 && patterns?.length
          ? Math.max(1, Math.ceil(patterns.length / daysLeft))
          : null,
    };
  }, [readinessScore, sessionData, examDate, patterns]);

  const getGtuGapMessage = () => {
    if (gtuPowerInsights.passGap > 0) {
      return `Need ~${gtuPowerInsights.passGap.toFixed(0)}% more to cross GTU pass-safety zone.`;
    }
    if (gtuPowerInsights.rankGap > 0) {
      return `Need ~${gtuPowerInsights.rankGap.toFixed(0)}% more to reach strong GTU scoring zone.`;
    }
    return "You are already in a strong GTU scoring zone.";
  };

  const pluralize = (count, singular, plural = `${singular}s`) =>
    count === 1 ? singular : plural;

  const outputPhaseInsights = useMemo(() => {
    const overallScore = gtuPowerInsights.overallReadinessScore;
    const projectedSEE =
      readinessScore?.projectedSEE ??
      Math.round((overallScore / 100) * GTU_MAX_SEE_SCORE);
    const willPass =
      readinessScore?.willPass !== undefined
        ? readinessScore.willPass
        : overallScore >= GTU_PASS_THRESHOLD;

    const recommendations = Array.isArray(readinessScore?.recommendations)
      ? readinessScore.recommendations
      : [];

    const normalizedRecommendations = recommendations.map((rec) => ({
      ...rec,
      text:
        rec?.message ||
        rec?.action ||
        "Revise high-yield GTU patterns and rerun analysis for focused recommendations.",
    }));

    const topQuestionOutputs = [...(patterns || [])]
      .sort((a, b) => (b.frequency_count || 0) - (a.frequency_count || 0))
      .slice(0, 5);

    const actionQueue = [];

    if (gtuPowerInsights.passGap > 0) {
      actionQueue.push({
        priority: "high",
        title: "Close pass-safety gap",
        detail: `Recover ~${gtuPowerInsights.passGap.toFixed(0)}% to cross GTU pass-safety.`,
      });
    } else if (gtuPowerInsights.rankGap > 0) {
      actionQueue.push({
        priority: "medium",
        title: "Push to strong scoring zone",
        detail: `Gain ~${gtuPowerInsights.rankGap.toFixed(0)}% to enter strong GTU scoring.`,
      });
    } else {
      actionQueue.push({
        priority: "low",
        title: "Defend your strong zone",
        detail: "Stay consistent with timed GTU full-paper revisions.",
      });
    }

    if (gtuPowerInsights.dailyPatternTarget) {
      actionQueue.push({
        priority: "medium",
        title: "Daily output target",
        detail: `Complete ${gtuPowerInsights.dailyPatternTarget} high-yield ${pluralize(gtuPowerInsights.dailyPatternTarget, "pattern")} per day.`,
      });
    }

    actionQueue.push({
      priority: gtuPowerInsights.longQuestionShare >= 50 ? "high" : "medium",
      title: "Long-question strategy",
      detail: `Long questions contribute ${gtuPowerInsights.longQuestionShare}% of repeated patterns.`,
    });

    if (gtuPowerInsights.weakTopics.length > 0) {
      const weakTopicNames = gtuPowerInsights.weakTopics
        .map((topic) => topic.topicName)
        .filter(Boolean)
        .slice(0, 2)
        .join(", ");
      actionQueue.push({
        priority: "high",
        title: "Weak-topic intervention",
        detail: weakTopicNames
          ? `Prioritize: ${weakTopicNames}.`
          : "Prioritize your weakest topics first.",
      });
    }

    return {
      projectedSEE,
      willPass,
      topQuestionOutputs,
      actionQueue,
      recommendations: normalizedRecommendations.slice(0, 3),
      sevenDayPatternGoal: gtuPowerInsights.dailyPatternTarget
        ? gtuPowerInsights.dailyPatternTarget * 7
        : null,
    };
  }, [gtuPowerInsights, readinessScore, patterns]);

  // ══════════════════════════════════════════════════
  //  API CALLS
  // ══════════════════════════════════════════════════

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

  // ── CREATE SESSION ────────────────────────────────
  const handleCreateSession = async () => {
    if (!sessionName.trim()) return;

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
        if (selectedFiles.length > 0) {
          await uploadPdfs(data.session_id);
        }
        if (syllabusTopics.length > 0) {
          await saveSyllabus(data.session_id);
        }

        resetWizard();
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

  const resetWizard = () => {
    setSessionName("");
    setSubjectName("");
    setExamDate("");
    setSelectedFiles([]);
    setSyllabusTopics([]);
    setWizardStep(1);
  };

  // ── UPLOAD PDFs ───────────────────────────────────
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

  // ── SAVE SYLLABUS ─────────────────────────────────
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

  // ── AI EXTRACT SYLLABUS ──────────────────────────
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
        setSyllabusTopics(
          data.topics.map((t) => ({
            name: t.topic_name || t.name,
            is_optional: t.is_optional,
            is_selected: true,
            unit: t.unit_number || t.unit,
          }))
        );
        await saveSyllabus(sessionId);
        await openSession(sessionId); // refresh dashboard
      }
    } catch (err) {
      alert("Failed to extract syllabus: " + err.message);
    } finally {
      setExtractingSyllabus(false);
    }
  };

  // ── OPEN SESSION ──────────────────────────────────
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
      setEditMode(false);
      setDashTab("overview");
      await fetchReadinessScore(sessionId);
    } catch (err) {
      console.error("Open session error:", err);
    } finally {
      setLoading(false);
    }
  };

  // ── READINESS SCORE ───────────────────────────────
  const fetchReadinessScore = async (sessionId) => {
    try {
      const res = await fetch(
        `${BACKEND}/api/readiness/score/${sessionId}?user_id=${userId}`
      );
      const data = await res.json();
      if (data.success) setReadinessScore(data);
    } catch (err) {
      console.error("Fetch readiness score error:", err);
    }
  };

  // ── RUN AI ANALYSIS ───────────────────────────────
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

  // ── GET AI ANSWER ─────────────────────────────────
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

  // ── SHARE ─────────────────────────────────────────
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
        setShareLink(`${window.location.origin}/shared/${data.share_token}`);
        setShowShareModal(true);
      }
    } catch (err) {
      alert("Share error: " + err.message);
    }
  };

  // ── DELETE SESSION ────────────────────────────────
  const handleDeleteSession = async (sessionId) => {
    if (!confirm("Delete this session and all its data?")) return;
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

  // ── EDIT MODE: Upload new PDFs ────────────────────
  const handleEditUpload = async () => {
    if (!activeSession || selectedFiles.length === 0) return;
    try {
      await uploadPdfs(activeSession);
      setSelectedFiles([]);
      await openSession(activeSession);
    } catch (err) {
      alert("Upload error: " + err.message);
    }
  };

  // ── EDIT MODE: Save syllabus changes ──────────────
  const handleEditSyllabus = async () => {
    if (!activeSession) return;
    try {
      await saveSyllabus(activeSession);
      await openSession(activeSession);
    } catch (err) {
      alert("Save error: " + err.message);
    }
  };

  // ── FILE / TOPIC HELPERS ──────────────────────────
  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    if (files.length + selectedFiles.length > 20) {
      alert("Maximum 20 PDFs allowed!");
      return;
    }
    setSelectedFiles((prev) => [...prev, ...files]);
  };

  const removeFile = (idx) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== idx));
  };

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

  // ══════════════════════════════════════════════════
  //  SUB-COMPONENTS
  // ══════════════════════════════════════════════════

  /* Readiness Gauge */
  const ReadinessGauge = ({ score, level, gtuGrade, projectedSEE, willPass }) => {
    const radius = 70;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (score / 100) * circumference;
    const gaugeColor = score >= 65 ? "#22c55e" : score >= 40 ? "#eab308" : "#ef4444";

    return (
      <div className="text-center">
        <svg width="180" height="180" viewBox="0 0 180 180">
          <circle cx="90" cy="90" r={radius} fill="none" stroke="#1a1a2e" strokeWidth="10" />
          <circle
            cx="90" cy="90" r={radius} fill="none"
            stroke={level?.color || gaugeColor}
            strokeWidth="10"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            transform="rotate(-90 90 90)"
            style={{ transition: "stroke-dashoffset 1.5s ease-in-out" }}
          />
          <text x="90" y="80" textAnchor="middle" fill="white" fontSize="28" fontWeight="bold">
            {score}%
          </text>
          <text x="90" y="100" textAnchor="middle" fill="#edb437" fontSize="12" fontWeight="600">
            {gtuGrade ? `${gtuGrade.grade} · ${gtuGrade.gp} GP` : "Not Scored"}
          </text>
          <text x="90" y="116" textAnchor="middle" fill="#666" fontSize="10">
            {projectedSEE != null ? `SEE: ${projectedSEE}/70` : level?.label || ""}
          </text>
        </svg>
        {willPass !== undefined && (
          <div
            className="d-inline-block mt-2 px-3 py-1 rounded-pill"
            style={{
              fontSize: "11px",
              fontWeight: "600",
              background: willPass
                ? "rgba(34,197,94,0.15)"
                : "rgba(239,68,68,0.15)",
              color: willPass ? "#22c55e" : "#ef4444",
              border: `1px solid ${willPass ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}`,
            }}
          >
            {willPass ? "✅ Likely to Pass" : "❌ Fail Risk"}
          </div>
        )}
      </div>
    );
  };

  // ══════════════════════════════════════════════════
  //  NOT LOGGED IN
  // ══════════════════════════════════════════════════

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

  // ══════════════════════════════════════════════════
  //  MAIN RENDER
  // ══════════════════════════════════════════════════

  return (
    <div className="chat chat-wrapper d-flex min-vh-100">
      <div className={`sidebar-area ${isSidebarOpen ? "open" : "collapsed"}`}>
        <Sidebar isOpen={isSidebarOpen} toggleSidebar={toggleSidebar}
          toggleHistory={toggleHistory} isHistoryOpen={isHistoryOpen} isLoggedIn={isLoggedIn} />
        <History isLoggedIn={isLoggedIn} userId={userId}
          isHistoryOpen={isHistoryOpen} onClose={toggleHistory} />
      </div>

      <div className="chat-content flex-grow-1 p-3 p-md-4 text-white d-flex flex-column"
        style={{ overflowY: "auto" }}>

        {/* ───── HEADER ───── */}
        <div className="text-center mb-4 mt-2">
          <div className="d-flex align-items-center justify-content-center gap-2 mb-2">
            <GraduationCap size={28} style={{ color: "#edb437" }} />
            <h3 className="grad_text mb-0" style={{ fontWeight: 700 }}>
              Exam Readiness AI
            </h3>
          </div>
          <p className="text-white-50 mb-0" style={{ fontSize: "14px" }}>
            Upload papers → Get AI insights → Ace your exams
          </p>
        </div>

        {/* ───── BREADCRUMB NAV ───── */}
        <div className="d-flex align-items-center gap-2 mb-4 flex-wrap justify-content-center">
          <button
            style={styles.pill(activeView === "sessions")}
            onClick={() => { setActiveView("sessions"); setEditMode(false); }}
          >
            <BookOpen size={14} className="me-1" /> My Sessions
          </button>
          <button
            style={styles.pill(activeView === "create")}
            onClick={() => { setActiveView("create"); setWizardStep(1); }}
          >
            <Plus size={14} className="me-1" /> New Session
          </button>
          {activeSession && (
            <button
              style={styles.pill(activeView === "dashboard")}
              onClick={() => setActiveView("dashboard")}
            >
              <BarChart3 size={14} className="me-1" /> Dashboard
            </button>
          )}
        </div>


        {/* ════════════════════════════════════════════
            SESSIONS LIST
        ════════════════════════════════════════════ */}
        {activeView === "sessions" && (
          <div className="container" style={{ maxWidth: "900px" }}>
            {sessions.length === 0 ? (
              <div style={styles.emptyState}>
                <div style={{
                  width: "80px", height: "80px", borderRadius: "50%",
                  background: "rgba(237,180,55,0.08)", display: "flex",
                  alignItems: "center", justifyContent: "center", margin: "0 auto 20px",
                }}>
                  <Target size={36} style={{ color: "#edb437" }} />
                </div>
                <h4 style={{ fontWeight: 600 }}>No sessions yet</h4>
                <p className="text-white-50" style={{ fontSize: "14px", maxWidth: "400px", margin: "0 auto 20px" }}>
                  Create your first exam session — upload question papers and let AI find the most important topics for you.
                </p>
                <button
                  className="btn px-4 py-2"
                  style={{
                    background: "linear-gradient(135deg, #edb437, #e49c00)",
                    color: "#000", fontWeight: 600, borderRadius: "50px", border: "none",
                  }}
                  onClick={() => setActiveView("create")}
                >
                  <Plus size={18} className="me-1" /> Create First Session
                </button>
              </div>
            ) : (
              <div className="row g-3">
                {sessions.map((s) => (
                  <div key={s.session_id} className="col-md-6">
                    <div
                      style={styles.sessionCard}
                      className="h-100"
                      onClick={() => openSession(s.session_id)}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = "rgba(237,180,55,0.35)";
                        e.currentTarget.style.transform = "translateY(-2px)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = "rgba(237,180,55,0.1)";
                        e.currentTarget.style.transform = "translateY(0)";
                      }}
                    >
                      <div style={styles.glowBorder} />

                      <div className="d-flex justify-content-between align-items-start mb-3">
                        <div>
                          <h5 style={{ fontWeight: 600, marginBottom: "4px" }}>{s.session_name}</h5>
                          {s.subject_name && (
                            <span className="badge" style={{
                              background: "rgba(237,180,55,0.15)", color: "#edb437",
                              fontSize: "11px", fontWeight: 500,
                            }}>
                              {s.subject_name}
                            </span>
                          )}
                        </div>
                        <Trash2
                          size={15}
                          style={{ cursor: "pointer", opacity: 0.3 }}
                          className="hover-opacity-1"
                          onClick={(e) => { e.stopPropagation(); handleDeleteSession(s.session_id); }}
                        />
                      </div>

                      <div className="d-flex gap-3 mb-3" style={{ fontSize: "12px", color: "#888" }}>
                        <span><FileText size={12} className="me-1" /> {s.total_pdfs || 0} Papers</span>
                        <span>
                          <Calendar size={12} className="me-1" />
                          {s.exam_date ? new Date(s.exam_date).toLocaleDateString() : "No date"}
                        </span>
                      </div>

                      {/* Readiness bar */}
                      <div>
                        <div className="d-flex justify-content-between mb-1">
                          <span style={{ fontSize: "11px", color: "#888" }}>Readiness</span>
                          <span style={{ fontSize: "12px", color: "#edb437", fontWeight: 600 }}>
                            {s.readiness_score || 0}%
                          </span>
                        </div>
                        <div style={{
                          height: "6px", borderRadius: "3px",
                          backgroundColor: "#1a1a2e", overflow: "hidden",
                        }}>
                          <div style={{
                            width: `${s.readiness_score || 0}%`,
                            height: "100%",
                            borderRadius: "3px",
                            background: "linear-gradient(90deg, #edb437, #e49c00)",
                            transition: "width 0.5s ease",
                          }} />
                        </div>
                      </div>

                      <div className="mt-3 d-flex justify-content-between align-items-center">
                        <span className="badge" style={{
                          fontSize: "10px",
                          background: s.status === "ready" ? "rgba(34,197,94,0.15)" :
                            s.status === "analyzing" ? "rgba(234,179,8,0.15)" : "rgba(255,255,255,0.05)",
                          color: s.status === "ready" ? "#22c55e" :
                            s.status === "analyzing" ? "#eab308" : "#666",
                        }}>
                          {s.status}
                        </span>
                        <ChevronRight size={16} style={{ color: "#edb437", opacity: 0.5 }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}


        {/* ════════════════════════════════════════════
            CREATE SESSION — STEP-BY-STEP WIZARD
        ════════════════════════════════════════════ */}
        {activeView === "create" && (
          <div className="container" style={{ maxWidth: "700px" }}>

            {/* Step Indicators */}
            <div className="d-flex justify-content-center align-items-center gap-0 mb-4">
              {[
                { num: 1, label: "Details" },
                { num: 2, label: "Upload Papers" },
                { num: 3, label: "Syllabus" },
              ].map((step, i) => (
                <React.Fragment key={step.num}>
                  <div className="text-center" style={{ cursor: "pointer" }}
                    onClick={() => setWizardStep(step.num)}>
                    <div style={styles.stepBadge(wizardStep === step.num, wizardStep > step.num)}>
                      {wizardStep > step.num ? <CheckCircle2 size={16} /> : step.num}
                    </div>
                    <div style={{
                      fontSize: "10px", marginTop: "4px", fontWeight: 600,
                      color: wizardStep === step.num ? "#edb437" : wizardStep > step.num ? "#22c55e" : "#555",
                    }}>
                      {step.label}
                    </div>
                  </div>
                  {i < 2 && (
                    <div style={{
                      flex: 1, height: "2px", maxWidth: "80px", margin: "0 8px",
                      marginBottom: "18px",
                      background: wizardStep > step.num ? "#22c55e" : "#2a2a2a",
                      borderRadius: "1px",
                      transition: "background 0.3s ease",
                    }} />
                  )}
                </React.Fragment>
              ))}
            </div>

            {/* ── Step 1: Basic Info ── */}
            {wizardStep === 1 && (
              <div style={styles.stepCard}>
                <h5 className="mb-1 d-flex align-items-center gap-2" style={{ fontWeight: 600 }}>
                  <PenTool size={20} style={{ color: "#edb437" }} />
                  What are you preparing for?
                </h5>
                <p className="text-white-50 mb-4" style={{ fontSize: "13px" }}>
                  Give your session a name so you can find it later.
                </p>

                <div className="mb-3">
                  <label className="form-label small" style={{ color: "#aaa" }}>Session Name *</label>
                  <input
                    type="text"
                    className="form-control"
                    style={{
                      backgroundColor: "#0f0f1a", color: "white",
                      border: "1px solid #2a2a3a", borderRadius: "10px",
                      padding: "12px 16px",
                    }}
                    placeholder="e.g. Maths 2 Final Prep"
                    value={sessionName}
                    onChange={(e) => setSessionName(e.target.value)}
                    autoFocus
                  />
                </div>

                <div className="row g-3 mb-4">
                  <div className="col-12">
                    <label className="form-label small mb-2" style={{ color: "#aaa" }}>
                      GTU Quick Subject Presets
                    </label>
                    <div className="d-flex gap-2 flex-wrap">
                      {GTU_SUBJECT_PRESETS.map((preset) => (
                        <button
                          key={preset.code}
                          type="button"
                          className="btn btn-sm px-3"
                          style={{
                            borderRadius: "50px",
                            border:
                              subjectName === preset.subject
                                ? "1px solid rgba(237,180,55,0.8)"
                                : "1px solid rgba(255,255,255,0.15)",
                            color: subjectName === preset.subject ? "#edb437" : "#aaa",
                            background:
                              subjectName === preset.subject ? "rgba(237,180,55,0.08)" : "transparent",
                            fontSize: "11px",
                            fontWeight: 600,
                          }}
                          onClick={() => applyGtuPreset(preset)}
                        >
                          {preset.short} · {preset.code}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small" style={{ color: "#aaa" }}>Subject (optional)</label>
                    <input
                      type="text"
                      className="form-control"
                      style={{
                        backgroundColor: "#0f0f1a", color: "white",
                        border: "1px solid #2a2a3a", borderRadius: "10px",
                        padding: "12px 16px",
                      }}
                      placeholder="e.g. Engineering Mathematics II"
                      value={subjectName}
                      onChange={(e) => setSubjectName(e.target.value)}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small" style={{ color: "#aaa" }}>Exam Date (optional)</label>
                    <input
                      type="date"
                      className="form-control"
                      style={{
                        backgroundColor: "#0f0f1a", color: "white",
                        border: "1px solid #2a2a3a", borderRadius: "10px",
                        padding: "12px 16px",
                      }}
                      value={examDate}
                      onChange={(e) => setExamDate(e.target.value)}
                    />
                  </div>
                </div>

                <div className="text-end">
                  <button
                    className="btn px-4 py-2"
                    style={{
                      background: sessionName.trim()
                        ? "linear-gradient(135deg, #edb437, #e49c00)"
                        : "#2a2a2a",
                      color: sessionName.trim() ? "#000" : "#555",
                      fontWeight: 600, borderRadius: "50px", border: "none",
                    }}
                    disabled={!sessionName.trim()}
                    onClick={() => setWizardStep(2)}
                  >
                    Next: Upload Papers <ArrowRight size={16} className="ms-1" />
                  </button>
                </div>
              </div>
            )}

            {/* ── Step 2: Upload PDFs ── */}
            {wizardStep === 2 && (
              <div style={styles.stepCard}>
                <h5 className="mb-1 d-flex align-items-center gap-2" style={{ fontWeight: 600 }}>
                  <Upload size={20} style={{ color: "#edb437" }} />
                  Upload Question Papers
                </h5>
                <p className="text-white-50 mb-4" style={{ fontSize: "13px" }}>
                  Add past question papers (PDF). AI will analyze them to find important patterns.
                  You can upload up to 20 files.
                </p>

                {/* Drop Zone */}
                <div
                  className="text-center p-4 mb-3"
                  style={{
                    border: "2px dashed rgba(237,180,55,0.25)",
                    borderRadius: "12px",
                    cursor: "pointer",
                    transition: "all 0.2s",
                    backgroundColor: "rgba(237,180,55,0.03)",
                  }}
                  onClick={() => document.getElementById("bulk-pdf-input").click()}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "rgba(237,180,55,0.5)";
                    e.currentTarget.style.backgroundColor = "rgba(237,180,55,0.06)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "rgba(237,180,55,0.25)";
                    e.currentTarget.style.backgroundColor = "rgba(237,180,55,0.03)";
                  }}
                >
                  <Upload size={32} style={{ color: "#edb437", opacity: 0.5 }} className="mb-2" />
                  <p className="mb-1" style={{ fontSize: "14px" }}>Click to select PDF files</p>
                  <small className="text-white-50">{selectedFiles.length}/20 files selected</small>
                  <input
                    id="bulk-pdf-input" type="file" accept=".pdf" multiple
                    style={{ display: "none" }}
                    onChange={handleFileSelect}
                  />
                </div>

                {/* File List */}
                {selectedFiles.length > 0 && (
                  <div className="mb-3">
                    {selectedFiles.map((file, idx) => (
                      <div
                        key={idx}
                        className="d-flex align-items-center justify-content-between py-2 px-3 mb-1 rounded"
                        style={{ backgroundColor: "#0f0f1a", borderRadius: "8px" }}
                      >
                        <span className="small d-flex align-items-center gap-2">
                          <FileText size={14} style={{ color: "#edb437" }} />
                          {file.name}
                        </span>
                        <X
                          size={14} style={{ cursor: "pointer", opacity: 0.4 }}
                          onClick={() => removeFile(idx)}
                        />
                      </div>
                    ))}
                  </div>
                )}

                {uploading && (
                  <div className="mb-3">
                    <div style={{ height: "6px", borderRadius: "3px", backgroundColor: "#1a1a2e" }}>
                      <div
                        className="progress-bar-animated"
                        style={{
                          width: `${uploadProgress}%`, height: "100%",
                          borderRadius: "3px",
                          background: "linear-gradient(90deg, #edb437, #e49c00)",
                          transition: "width 0.3s",
                        }}
                      />
                    </div>
                    <small className="text-white-50 d-block text-center mt-1">
                      Uploading... {uploadProgress}%
                    </small>
                  </div>
                )}

                <div className="d-flex justify-content-between mt-3">
                  <button
                    className="btn btn-outline-light btn-sm px-3"
                    style={{ borderRadius: "50px" }}
                    onClick={() => setWizardStep(1)}
                  >
                    <ArrowLeft size={14} className="me-1" /> Back
                  </button>
                  <div className="d-flex gap-2">
                    <button
                      className="btn btn-outline-light btn-sm px-3"
                      style={{ borderRadius: "50px", fontSize: "13px" }}
                      onClick={() => setWizardStep(3)}
                    >
                      Skip
                    </button>
                    <button
                      className="btn px-4 py-2"
                      style={{
                        background: "linear-gradient(135deg, #edb437, #e49c00)",
                        color: "#000", fontWeight: 600, borderRadius: "50px", border: "none",
                      }}
                      onClick={() => setWizardStep(3)}
                    >
                      Next <ArrowRight size={16} className="ms-1" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── Step 3: Syllabus (optional) ── */}
            {wizardStep === 3 && (
              <div style={styles.stepCard}>
                <h5 className="mb-1 d-flex align-items-center gap-2" style={{ fontWeight: 600 }}>
                  <BookOpen size={20} style={{ color: "#edb437" }} />
                  Add Syllabus Topics
                </h5>
                <p className="text-white-50 mb-3" style={{ fontSize: "13px" }}>
                  Optional — you can skip this and let AI auto-detect topics from your papers later.
                </p>

                <div className="d-flex gap-2 mb-3">
                  <input
                    type="text"
                    className="form-control flex-grow-1"
                    style={{
                      backgroundColor: "#0f0f1a", color: "white",
                      border: "1px solid #2a2a3a", borderRadius: "10px",
                      padding: "10px 14px", fontSize: "13px",
                    }}
                    placeholder="e.g. Differential Equations"
                    value={newTopicName}
                    onChange={(e) => setNewTopicName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addSyllabusTopic()}
                  />
                  <label
                    className="d-flex align-items-center gap-1 text-nowrap"
                    style={{ fontSize: "12px", color: "#888", cursor: "pointer" }}
                  >
                    <input
                      type="checkbox"
                      checked={newTopicOptional}
                      onChange={(e) => setNewTopicOptional(e.target.checked)}
                      style={{ accentColor: "#edb437" }}
                    />
                    Optional
                  </label>
                  <button
                    className="btn btn-sm"
                    style={{
                      background: "linear-gradient(135deg, #edb437, #e49c00)",
                      color: "#000", fontWeight: 600, borderRadius: "10px",
                      padding: "8px 16px", border: "none",
                    }}
                    onClick={addSyllabusTopic}
                  >
                    <Plus size={16} />
                  </button>
                </div>

                {syllabusTopics.length > 0 && (
                  <div className="mb-3">
                    {syllabusTopics.map((topic, idx) => (
                      <div
                        key={idx}
                        className="d-flex align-items-center justify-content-between py-2 px-3 mb-1"
                        style={{ backgroundColor: "#0f0f1a", borderRadius: "8px" }}
                      >
                        <span className="small d-flex align-items-center gap-2">
                          <span style={{ color: "#edb437", fontWeight: 600, fontSize: "11px" }}>
                            U{idx + 1}
                          </span>
                          {topic.name}
                          {topic.is_optional && (
                            <span style={{
                              fontSize: "9px", padding: "2px 6px",
                              borderRadius: "4px", background: "rgba(255,255,255,0.06)",
                              color: "#888",
                            }}>
                              Optional
                            </span>
                          )}
                        </span>
                        <X
                          size={14} style={{ cursor: "pointer", opacity: 0.4 }}
                          onClick={() => removeSyllabusTopic(idx)}
                        />
                      </div>
                    ))}
                  </div>
                )}

                <div
                  className="d-flex align-items-center gap-2 p-3 rounded mb-4"
                  style={{ background: "rgba(237,180,55,0.06)", borderRadius: "10px" }}
                >
                  <Sparkles size={16} style={{ color: "#edb437", flexShrink: 0 }} />
                  <span style={{ fontSize: "12px", color: "#aaa" }}>
                    Don't worry if you skip this — after uploading papers, click 
                    <strong style={{ color: "#edb437" }}> "AI Extract Syllabus"</strong> on the dashboard and AI will auto-detect all topics.
                  </span>
                </div>

                <div className="d-flex justify-content-between">
                  <button
                    className="btn btn-outline-light btn-sm px-3"
                    style={{ borderRadius: "50px" }}
                    onClick={() => setWizardStep(2)}
                  >
                    <ArrowLeft size={14} className="me-1" /> Back
                  </button>
                  <button
                    className="btn px-4 py-2"
                    style={{
                      background: "linear-gradient(135deg, #edb437, #e49c00)",
                      color: "#000", fontWeight: 600, borderRadius: "50px", border: "none",
                      fontSize: "14px",
                    }}
                    onClick={handleCreateSession}
                    disabled={loading}
                  >
                    {loading ? (
                      <><Loader2 size={16} className="me-1 spinner-border-sm" /> Creating...</>
                    ) : (
                      <><Sparkles size={16} className="me-1" /> Create Session</>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}


        {/* ════════════════════════════════════════════
            SESSION DASHBOARD
        ════════════════════════════════════════════ */}
        {activeView === "dashboard" && sessionData && (
          <div className="container" style={{ maxWidth: "1000px" }}>

            {/* ── Dashboard Header ── */}
            <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
              <div>
                <button
                  className="btn btn-sm mb-1 p-0"
                  style={{ color: "#888", fontSize: "12px" }}
                  onClick={() => { setActiveView("sessions"); setEditMode(false); }}
                >
                  <ArrowLeft size={12} className="me-1" /> Back to Sessions
                </button>
                <h4 style={{ fontWeight: 700, marginBottom: "2px" }}>
                  {sessionData.session?.session_name}
                </h4>
                {sessionData.session?.subject_name && (
                  <span className="badge" style={{
                    background: "rgba(237,180,55,0.12)", color: "#edb437",
                    fontSize: "11px", fontWeight: 500,
                  }}>
                    {sessionData.session.subject_name}
                  </span>
                )}
              </div>

              <div className="d-flex gap-2 flex-wrap">
                {/* Edit Toggle */}
                <button
                  className="btn btn-sm px-3"
                  style={{
                    borderRadius: "50px",
                    border: editMode ? "1px solid #edb437" : "1px solid rgba(255,255,255,0.15)",
                    background: editMode ? "rgba(237,180,55,0.1)" : "transparent",
                    color: editMode ? "#edb437" : "#aaa",
                    fontSize: "12px", fontWeight: 600,
                  }}
                  onClick={() => { setEditMode(!editMode); setSelectedFiles([]); }}
                >
                  <Edit3 size={13} className="me-1" />
                  {editMode ? "Done Editing" : "Edit Session"}
                </button>

                <button
                  className="btn btn-sm px-3"
                  style={{
                    borderRadius: "50px", border: "1px solid rgba(255,255,255,0.15)",
                    color: "#aaa", fontSize: "12px",
                  }}
                  onClick={handleAnalyze}
                  disabled={analyzing}
                >
                  {analyzing ? (
                    <><Loader2 size={13} className="me-1" /> Analyzing...</>
                  ) : (
                    <><Brain size={13} className="me-1" /> Run AI Analysis</>
                  )}
                </button>

                <button
                  className="btn btn-sm px-3"
                  style={{
                    borderRadius: "50px",
                    background: "linear-gradient(135deg, #edb437, #e49c00)",
                    color: "#000", fontSize: "12px", fontWeight: 600, border: "none",
                  }}
                  onClick={handleShare}
                >
                  <Share2 size={13} className="me-1" /> Share
                </button>
              </div>
            </div>

            {/* ── Edit Mode Banner ── */}
            {editMode && (
              <div style={styles.editBanner}>
                <div className="d-flex align-items-center gap-2 mb-2">
                  <Edit3 size={18} style={{ color: "#edb437" }} />
                  <span style={{ fontWeight: 600, fontSize: "14px" }}>Edit Mode</span>
                  <span className="text-white-50" style={{ fontSize: "12px" }}>
                    — Upload new papers or update syllabus topics
                  </span>
                </div>

                {/* Upload new PDFs */}
                <div className="mb-3">
                  <h6 className="mb-2 d-flex align-items-center gap-2" style={{ fontSize: "13px" }}>
                    <Upload size={14} style={{ color: "#edb437" }} /> Add More Papers
                  </h6>
                  <div
                    className="text-center p-3"
                    style={{
                      border: "1px dashed rgba(237,180,55,0.25)",
                      borderRadius: "10px", cursor: "pointer",
                      backgroundColor: "rgba(237,180,55,0.03)",
                    }}
                    onClick={() => document.getElementById("edit-pdf-input").click()}
                  >
                    <Upload size={24} style={{ color: "#edb437", opacity: 0.4 }} className="mb-1" />
                    <p className="mb-0" style={{ fontSize: "12px" }}>Click to upload new PDFs</p>
                    <input
                      id="edit-pdf-input" type="file" accept=".pdf" multiple
                      style={{ display: "none" }}
                      onChange={handleFileSelect}
                    />
                  </div>

                  {selectedFiles.length > 0 && (
                    <div className="mt-2">
                      {selectedFiles.map((file, idx) => (
                        <div key={idx}
                          className="d-flex align-items-center justify-content-between py-1 px-3 mb-1"
                          style={{ backgroundColor: "#0f0f1a", borderRadius: "6px" }}>
                          <span className="small"><FileText size={12} className="me-1" style={{ color: "#edb437" }} />{file.name}</span>
                          <X size={12} style={{ cursor: "pointer", opacity: 0.4 }} onClick={() => removeFile(idx)} />
                        </div>
                      ))}
                      <button
                        className="btn btn-sm mt-2 px-3"
                        style={{
                          background: "linear-gradient(135deg, #edb437, #e49c00)",
                          color: "#000", fontWeight: 600, borderRadius: "50px",
                          border: "none", fontSize: "12px",
                        }}
                        onClick={handleEditUpload}
                        disabled={uploading}
                      >
                        {uploading ? <><Loader2 size={12} className="me-1" /> Uploading...</> : <><Upload size={12} className="me-1" /> Upload Now</>}
                      </button>
                    </div>
                  )}

                  {uploading && (
                    <div className="mt-2">
                      <div style={{ height: "4px", borderRadius: "2px", backgroundColor: "#1a1a2e" }}>
                        <div style={{
                          width: `${uploadProgress}%`, height: "100%",
                          borderRadius: "2px",
                          background: "linear-gradient(90deg, #edb437, #e49c00)",
                        }} />
                      </div>
                    </div>
                  )}
                </div>

                {/* Update syllabus */}
                <div>
                  <h6 className="mb-2 d-flex align-items-center gap-2" style={{ fontSize: "13px" }}>
                    <BookOpen size={14} style={{ color: "#edb437" }} /> Edit Syllabus Topics
                  </h6>

                  <div className="d-flex gap-2 mb-2">
                    <input
                      type="text" className="form-control"
                      style={{
                        backgroundColor: "#0f0f1a", color: "white",
                        border: "1px solid #2a2a3a", borderRadius: "8px",
                        padding: "8px 12px", fontSize: "12px",
                      }}
                      placeholder="Add new topic..."
                      value={newTopicName}
                      onChange={(e) => setNewTopicName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addSyllabusTopic()}
                    />
                    <label className="d-flex align-items-center gap-1 small text-nowrap" style={{ color: "#666" }}>
                      <input type="checkbox" checked={newTopicOptional}
                        onChange={(e) => setNewTopicOptional(e.target.checked)}
                        style={{ accentColor: "#edb437" }} /> Opt
                    </label>
                    <button className="btn btn-sm" style={{
                      background: "#edb437", color: "#000", borderRadius: "8px",
                      fontWeight: 600, padding: "6px 12px",
                    }} onClick={addSyllabusTopic}>
                      <Plus size={14} />
                    </button>
                  </div>

                  {syllabusTopics.length > 0 && (
                    <div className="mb-2" style={{ maxHeight: "150px", overflowY: "auto" }}>
                      {syllabusTopics.map((topic, idx) => (
                        <div key={idx}
                          className="d-flex align-items-center justify-content-between py-1 px-3 mb-1"
                          style={{ backgroundColor: "#0f0f1a", borderRadius: "6px" }}>
                          <span className="small">
                            <span style={{ color: "#edb437", fontSize: "10px", fontWeight: 700, marginRight: "6px" }}>U{idx + 1}</span>
                            {topic.name}
                            {topic.is_optional && <span className="ms-1" style={{ fontSize: "9px", color: "#666" }}>(opt)</span>}
                          </span>
                          <X size={12} style={{ cursor: "pointer", opacity: 0.4 }} onClick={() => removeSyllabusTopic(idx)} />
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="d-flex gap-2">
                    <button
                      className="btn btn-sm px-3"
                      style={{
                        borderRadius: "50px", border: "1px solid rgba(237,180,55,0.3)",
                        color: "#edb437", fontSize: "11px",
                      }}
                      onClick={() => handleExtractSyllabus(activeSession)}
                      disabled={extractingSyllabus}
                    >
                      {extractingSyllabus ? <><Loader2 size={12} className="me-1" /> Extracting...</> : <><Sparkles size={12} className="me-1" /> AI Extract Syllabus</>}
                    </button>
                    <button
                      className="btn btn-sm px-3"
                      style={{
                        borderRadius: "50px",
                        background: "linear-gradient(135deg, #22c55e, #16a34a)",
                        color: "#fff", fontSize: "11px", fontWeight: 600, border: "none",
                      }}
                      onClick={handleEditSyllabus}
                    >
                      <CheckCircle2 size={12} className="me-1" /> Save Changes
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── Dashboard Tabs ── */}
            <div className="d-flex gap-2 mb-4">
              {[
                { id: "overview", label: "Overview", icon: <Award size={13} /> },
                { id: "questions", label: "Questions", icon: <Target size={13} /> },
                { id: "topics", label: "Topics", icon: <Layers size={13} /> },
                { id: "output", label: "Output", icon: <Sparkles size={13} /> },
              ].map((tab) => (
                <button
                  key={tab.id}
                  style={{
                    ...styles.pill(dashTab === tab.id),
                    fontSize: "12px", padding: "7px 16px",
                  }}
                  onClick={() => setDashTab(tab.id)}
                >
                  {tab.icon} <span className="ms-1">{tab.label}</span>
                </button>
              ))}
            </div>


            {/* ── OVERVIEW TAB ── */}
            {dashTab === "overview" && (
              <div className="row g-3">
                {/* Readiness Gauge */}
                <div className="col-lg-5 mb-3">
                  <div className="profile-card h-100 d-flex flex-column align-items-center justify-content-center">
                    <h6 style={{ fontWeight: 600, marginBottom: "16px" }}>
                      <GraduationCap size={16} className="me-2" style={{ color: "#edb437" }} />
                      Your GTU Readiness
                    </h6>
                    <ReadinessGauge
                      score={readinessScore?.overall || sessionData.session?.readiness_score || 0}
                      level={readinessScore?.level || { label: "Run Analysis First", color: "#666" }}
                      gtuGrade={readinessScore?.gtuGrade}
                      projectedSEE={readinessScore?.projectedSEE}
                      willPass={readinessScore?.willPass}
                    />
                    {readinessScore?.estimatedDate && (
                      <p className="small mt-2 text-white-50">
                        <Calendar size={12} className="me-1" />
                        {readinessScore.estimatedDate}
                      </p>
                    )}
                  </div>
                </div>

                {/* Score Breakdown */}
                <div className="col-lg-7 mb-3">
                  <div className="profile-card h-100">
                    <h6 className="mb-3" style={{ fontWeight: 600 }}>
                      <BarChart3 size={16} className="me-2" style={{ color: "#edb437" }} />
                      Score Breakdown
                      <span className="text-white-50 ms-2" style={{ fontSize: "10px", fontWeight: 400 }}>
                        70 marks SEE · 30 marks CIE
                      </span>
                    </h6>

                    {readinessScore?.breakdown ? (
                      <div className="row g-2">
                        {Object.entries(readinessScore.breakdown).map(([key, val]) => (
                          <div key={key} className="col-6">
                            <div className="p-2 rounded" style={{ backgroundColor: "#0f0f1a", borderRadius: "10px" }}>
                              <div className="d-flex justify-content-between mb-1">
                                <span style={{ fontSize: "11px" }}>{val.label || key}</span>
                                <span style={{ fontSize: "11px", color: "#edb437", fontWeight: 600 }}>
                                  {val.score}%
                                  <span className="text-white-50" style={{ fontSize: "9px" }}> ({val.weight})</span>
                                </span>
                              </div>
                              <div style={{ height: "4px", borderRadius: "2px", backgroundColor: "#1a1a2e" }}>
                                <div style={{
                                  width: `${val.score}%`, height: "100%", borderRadius: "2px",
                                  background: val.score >= 65 ? "#22c55e" : val.score >= 40 ? "#eab308" : "#ef4444",
                                }} />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-4 text-white-50">
                        <Brain size={28} className="mb-2" style={{ opacity: 0.3 }} />
                        <p style={{ fontSize: "13px" }}>Run AI Analysis to see your score breakdown</p>
                      </div>
                    )}

                    {/* Recommendations */}
                    {readinessScore?.recommendations && (
                      <div className="mt-3">
                        <h6 style={{ fontSize: "12px", color: "#888", marginBottom: "8px" }}>
                          AI Recommendations
                        </h6>
                        {readinessScore.recommendations.map((rec, i) => (
                          <div
                            key={i}
                            className="d-flex align-items-start gap-2 mb-2 p-2 rounded"
                            style={{ backgroundColor: "#0f0f1a", borderRadius: "8px" }}
                          >
                            {rec.priority === "high" ? (
                              <AlertCircle size={14} className="text-danger mt-1 flex-shrink-0" />
                            ) : (
                              <Zap size={14} style={{ color: "#edb437" }} className="mt-1 flex-shrink-0" />
                            )}
                            <div>
                              <span style={{ fontSize: "12px" }}>{rec.message}</span>
                              <br />
                              <span style={{ fontSize: "11px", color: "#666" }}>{rec.action}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Quick Stats Row */}
                <div className="col-md-4">
                  <div className="profile-card text-center h-100" style={{ padding: "20px" }}>
                    <FileText size={24} style={{ color: "#edb437", marginBottom: "8px" }} />
                    <h3 style={{ fontWeight: 700, marginBottom: "2px" }}>
                      {sessionData.pdfs?.length || 0}
                    </h3>
                    <span style={{ fontSize: "12px", color: "#888" }}>Papers Uploaded</span>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="profile-card text-center h-100" style={{ padding: "20px" }}>
                    <BookOpen size={24} style={{ color: "#edb437", marginBottom: "8px" }} />
                    <h3 style={{ fontWeight: 700, marginBottom: "2px" }}>
                      {sessionData.syllabus?.length || 0}
                    </h3>
                    <span style={{ fontSize: "12px", color: "#888" }}>Syllabus Topics</span>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="profile-card text-center h-100" style={{ padding: "20px" }}>
                    <Target size={24} style={{ color: "#edb437", marginBottom: "8px" }} />
                    <h3 style={{ fontWeight: 700, marginBottom: "2px" }}>
                      {patterns.length}
                    </h3>
                    <span style={{ fontSize: "12px", color: "#888" }}>Question Patterns</span>
                  </div>
                </div>

                <div className="col-12">
                  <div className="profile-card">
                    <h6 className="mb-3" style={{ fontWeight: 600 }}>
                      <Sparkles size={16} className="me-2" style={{ color: "#edb437" }} />
                      GTU Power Insights
                    </h6>

                    <div className="row g-3">
                      <div className="col-md-4">
                        <div className="p-3 rounded" style={{ backgroundColor: "#0f0f1a" }}>
                          <div style={{ fontSize: "11px", color: "#888" }}>Exam Countdown</div>
                          <div style={{ fontSize: "20px", fontWeight: 700, color: "#edb437" }}>
                            {gtuPowerInsights.daysLeft === null || gtuPowerInsights.daysLeft === undefined
                              ? "Set exam date"
                              : `${gtuPowerInsights.daysLeft} day${gtuPowerInsights.daysLeft === 1 ? "" : "s"} left`}
                          </div>
                          {gtuPowerInsights.dailyPatternTarget && (
                            <div style={{ fontSize: "11px", color: "#aaa" }}>
                              Target {gtuPowerInsights.dailyPatternTarget} {pluralize(gtuPowerInsights.dailyPatternTarget, "pattern")} per day
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="col-md-4">
                        <div className="p-3 rounded h-100" style={{ backgroundColor: "#0f0f1a" }}>
                          <div style={{ fontSize: "11px", color: "#888", marginBottom: "6px" }}>High-yield Units</div>
                          {gtuPowerInsights.highYieldUnits.length > 0 ? (
                            gtuPowerInsights.highYieldUnits.map((unit) => (
                              <div key={unit.unit} style={{ fontSize: "12px", marginBottom: "4px" }}>
                                <span style={{ color: "#edb437", fontWeight: 700 }}>Unit {unit.unit}</span>
                                <span style={{ color: "#666" }}> · {unit.frequency} repeat hits</span>
                              </div>
                            ))
                          ) : (
                            <div style={{ fontSize: "12px", color: "#666" }}>Run analysis for unit trends</div>
                          )}
                        </div>
                      </div>

                      <div className="col-md-4">
                        <div className="p-3 rounded h-100" style={{ backgroundColor: "#0f0f1a" }}>
                          <div style={{ fontSize: "11px", color: "#888", marginBottom: "6px" }}>Action Focus</div>
                          {gtuPowerInsights.weakTopics.length > 0 ? (
                            gtuPowerInsights.weakTopics.map((topic) => (
                              <div key={topic.syllabusId} style={{ fontSize: "12px", marginBottom: "4px" }}>
                                <span style={{ color: "#ef4444", fontWeight: 700 }}>
                                  {(topic.avgPercent ?? 0).toFixed(0)}%
                                </span>
                                <span style={{ color: "#aaa" }}> · {topic.topicName}</span>
                              </div>
                            ))
                          ) : (
                            <div style={{ fontSize: "12px", color: "#22c55e" }}>No weak topics detected</div>
                          )}
                          <div style={{ fontSize: "11px", color: "#666", marginTop: "8px" }}>
                            Long-question weight in patterns: {gtuPowerInsights.longQuestionShare}%
                          </div>
                        </div>
                      </div>
                    </div>

                    {(gtuPowerInsights.passGap > 0 || gtuPowerInsights.rankGap > 0) && (
                      <div
                        className="mt-3 p-2 rounded"
                        style={{ background: "rgba(237,180,55,0.06)", border: "1px solid rgba(237,180,55,0.15)" }}
                      >
                        <small style={{ color: "#aaa" }}>
                          {getGtuGapMessage()}
                        </small>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}


            {/* ── QUESTIONS TAB ── */}
            {dashTab === "questions" && (
              <div>
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h6 style={{ fontWeight: 600, marginBottom: 0 }}>
                    <Target size={16} className="me-2" style={{ color: "#edb437" }} />
                    Most Asked Questions
                    <span className="ms-2 badge" style={{
                      background: "rgba(237,180,55,0.12)", color: "#edb437",
                      fontSize: "10px",
                    }}>{patterns.length} found</span>
                  </h6>
                </div>

                {patterns.length > 0 ? (
                  <div>
                    {patterns.map((pattern) => (
                      <div key={pattern.pattern_id} style={styles.patternCard(pattern.frequency_count)}>
                        <div className="d-flex justify-content-between align-items-start">
                          <div className="flex-grow-1">
                            {/* Tags Row */}
                            <div className="d-flex flex-wrap gap-1 mb-2">
                              <span className="badge" style={{
                                background: pattern.frequency_count >= 3 ? "rgba(239,68,68,0.15)" :
                                  pattern.frequency_count >= 2 ? "rgba(234,179,8,0.15)" : "rgba(34,197,94,0.15)",
                                color: pattern.frequency_count >= 3 ? "#ef4444" :
                                  pattern.frequency_count >= 2 ? "#eab308" : "#22c55e",
                                fontSize: "10px", fontWeight: 600,
                              }}>🔥 {pattern.frequency_count}× asked</span>

                              {pattern.marks && (
                                <span className="badge" style={{
                                  background: "rgba(255,255,255,0.05)", color: "#888",
                                  fontSize: "10px",
                                }}>{pattern.marks} marks</span>
                              )}

                              {pattern.appears_in_q1 && (
                                <span className="badge" style={{
                                  background: "rgba(124,58,237,0.15)", color: "#a78bfa",
                                  fontSize: "10px",
                                }}>Q1 Short</span>
                              )}

                              {pattern.appears_in_long && (
                                <span className="badge" style={{
                                  background: "rgba(8,145,178,0.15)", color: "#67e8f9",
                                  fontSize: "10px",
                                }}>Q2–Q5 Long</span>
                              )}

                              {pattern.bloom_level && (
                                <span className="badge" style={{
                                  background: "rgba(255,255,255,0.05)", color: "#666",
                                  fontSize: "9px",
                                }}
                                  title={`Bloom's: ${{ C1: "Remember", C2: "Understand", C3: "Apply", C4: "Analyse", C5: "Evaluate", C6: "Create" }[pattern.bloom_level] || pattern.bloom_level}`}
                                >
                                  {pattern.bloom_level}
                                </span>
                              )}

                              {pattern.unit && (
                                <span className="badge" style={{
                                  background: "rgba(22,101,52,0.2)", color: "#4ade80",
                                  fontSize: "10px",
                                }}>Unit {pattern.unit}</span>
                              )}
                            </div>

                            <p className="mb-1" style={{ fontSize: "13px", lineHeight: 1.5 }}>
                              {pattern.question_text}
                            </p>

                            {pattern.source_pdfs && Array.isArray(pattern.source_pdfs) && pattern.source_pdfs.length > 0 && (
                              <small style={{ color: "#555", fontSize: "11px" }}>
                                📄 {pattern.source_pdfs.join(", ")}
                              </small>
                            )}
                          </div>

                          <div className="d-flex gap-1 ms-2 flex-shrink-0">
                            <button
                              className="btn btn-sm"
                              style={{
                                width: "32px", height: "32px", borderRadius: "8px",
                                border: "1px solid rgba(255,255,255,0.1)",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                background: "transparent", color: "#aaa", padding: 0,
                              }}
                              onClick={() =>
                                setExpandedPattern(
                                  expandedPattern === pattern.pattern_id ? null : pattern.pattern_id
                                )
                              }
                            >
                              {expandedPattern === pattern.pattern_id ? <ChevronUp size={14} /> : <Eye size={14} />}
                            </button>
                            {!pattern.ai_answer && (
                              <button
                                className="btn btn-sm"
                                style={{
                                  width: "32px", height: "32px", borderRadius: "8px",
                                  background: "linear-gradient(135deg, #edb437, #e49c00)",
                                  display: "flex", alignItems: "center", justifyContent: "center",
                                  border: "none", color: "#000", padding: 0,
                                }}
                                onClick={() => handleGetAnswer(pattern.pattern_id)}
                                disabled={generatingAnswer === pattern.pattern_id}
                                title="Generate AI answer"
                              >
                                {generatingAnswer === pattern.pattern_id ? (
                                  <Loader2 size={14} className="spinner-border-sm" />
                                ) : (
                                  <Sparkles size={14} />
                                )}
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Expanded Answer */}
                        {expandedPattern === pattern.pattern_id && pattern.ai_answer && (
                          <div
                            className="mt-3 p-3 rounded"
                            style={{
                              backgroundColor: "#050510",
                              borderRadius: "10px",
                              border: "1px solid rgba(237,180,55,0.1)",
                            }}
                          >
                            <h6 className="mb-2 d-flex align-items-center gap-1" style={{ fontSize: "12px", color: "#edb437" }}>
                              <Sparkles size={12} /> AI Model Answer
                              {pattern.marks ? ` · ${pattern.marks}M` : ""}
                            </h6>
                            <div style={{ fontSize: "12px", whiteSpace: "pre-wrap", lineHeight: 1.6, color: "#ccc" }}>
                              {pattern.ai_answer}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-5 text-white-50">
                    <Brain size={40} className="mb-2" style={{ opacity: 0.2 }} />
                    <p style={{ fontSize: "13px" }}>No patterns yet — upload papers and run AI Analysis.</p>
                  </div>
                )}
              </div>
            )}


            {/* ── OUTPUT TAB ── */}
            {dashTab === "output" && (
              <div className="row g-3">
                <div className="col-lg-4">
                  <div className="profile-card h-100">
                    <h6 className="mb-3" style={{ fontWeight: 600 }}>
                      <Award size={16} className="me-2" style={{ color: "#edb437" }} />
                      Result Snapshot
                    </h6>
                    <div className="p-3 rounded mb-2" style={{ backgroundColor: "#0f0f1a" }}>
                      <div style={{ fontSize: "11px", color: "#888" }}>Current readiness</div>
                      <div style={{ fontSize: "22px", fontWeight: 700, color: "#edb437" }}>
                        {gtuPowerInsights.overallReadinessScore.toFixed(0)}%
                      </div>
                    </div>
                    <div className="p-3 rounded mb-2" style={{ backgroundColor: "#0f0f1a" }}>
                      <div style={{ fontSize: "11px", color: "#888" }}>Projected SEE</div>
                      <div style={{ fontSize: "18px", fontWeight: 700 }}>
                        {outputPhaseInsights.projectedSEE}/{GTU_MAX_SEE_SCORE}
                      </div>
                    </div>
                    <div
                      className="p-2 rounded text-center"
                      style={{
                        fontSize: "12px",
                        fontWeight: 600,
                        background: outputPhaseInsights.willPass
                          ? "rgba(34,197,94,0.15)"
                          : "rgba(239,68,68,0.15)",
                        color: outputPhaseInsights.willPass ? "#22c55e" : "#ef4444",
                        border: `1px solid ${outputPhaseInsights.willPass ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}`,
                      }}
                    >
                      {outputPhaseInsights.willPass ? "✅ Pass Trajectory" : "⚠️ Pass Risk"}
                    </div>
                    {outputPhaseInsights.sevenDayPatternGoal && (
                      <div className="mt-2" style={{ fontSize: "11px", color: "#888" }}>
                        7-day target: {outputPhaseInsights.sevenDayPatternGoal} high-yield {pluralize(outputPhaseInsights.sevenDayPatternGoal, "pattern")}.
                      </div>
                    )}
                  </div>
                </div>

                <div className="col-lg-8">
                  <div className="profile-card h-100">
                    <h6 className="mb-3" style={{ fontWeight: 600 }}>
                      <Target size={16} className="me-2" style={{ color: "#edb437" }} />
                      Output Action Queue
                    </h6>
                    <div className="row g-2">
                      {outputPhaseInsights.actionQueue.map((item, idx) => (
                        <div key={idx} className="col-md-6">
                          <div
                            className="p-3 rounded h-100"
                            style={{
                              backgroundColor: "#0f0f1a",
                              border: "1px solid rgba(255,255,255,0.05)",
                            }}
                          >
                            <div className="d-flex align-items-center mb-1">
                              {item.priority === "high" ? (
                                <AlertCircle size={13} className="text-danger me-2" />
                              ) : (
                                <CheckCircle2 size={13} className="text-success me-2" />
                              )}
                              <span style={{ fontSize: "12px", fontWeight: 600 }}>{item.title}</span>
                            </div>
                            <div style={{ fontSize: "11px", color: "#888" }}>{item.detail}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                    {outputPhaseInsights.recommendations.length > 0 && (
                      <div className="mt-3">
                        <h6 style={{ fontSize: "12px", color: "#888" }}>AI Priority Notes</h6>
                        {outputPhaseInsights.recommendations.map((rec, i) => (
                          <div
                            key={i}
                            className="p-2 rounded mb-2"
                            style={{ backgroundColor: "#0f0f1a", fontSize: "12px" }}
                          >
                            <span style={{ color: "#ddd" }}>{rec.text}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="col-12">
                  <div className="profile-card">
                    <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
                      <h6 className="mb-0" style={{ fontWeight: 600 }}>
                        <FileText size={16} className="me-2" style={{ color: "#edb437" }} />
                        Output Question Set (Most Repeated)
                      </h6>
                      <button
                        className="btn btn-sm px-3"
                        style={{
                          borderRadius: "50px",
                          border: "1px solid rgba(237,180,55,0.3)",
                          color: "#edb437",
                          fontSize: "11px",
                        }}
                        onClick={() => setDashTab("questions")}
                      >
                        Open Questions Tab
                      </button>
                    </div>
                    {outputPhaseInsights.topQuestionOutputs.length > 0 ? (
                      <div className="row g-2">
                        {outputPhaseInsights.topQuestionOutputs.map((pattern) => (
                          <div key={pattern.pattern_id} className="col-md-6">
                            <div
                              className="p-3 rounded h-100"
                              style={{
                                backgroundColor: "#0f0f1a",
                                border: "1px solid rgba(255,255,255,0.05)",
                              }}
                            >
                              <div className="mb-1" style={{ fontSize: "11px", color: "#edb437", fontWeight: 700 }}>
                                {pattern.frequency_count || 1}× asked · {pattern.marks || "?"} marks
                              </div>
                              <div style={{ fontSize: "12px", color: "#ddd" }}>{pattern.question_text}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ fontSize: "12px", color: "#666" }}>
                        Run AI analysis to generate your output question set.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}


            {/* ── TOPICS TAB ── */}
            {dashTab === "topics" && (
              <div>
                <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
                  <h6 style={{ fontWeight: 600, marginBottom: 0 }}>
                    <Layers size={16} className="me-2" style={{ color: "#edb437" }} />
                    Unit-wise Breakdown
                  </h6>
                  <button
                    className="btn btn-sm px-3"
                    style={{
                      borderRadius: "50px", border: "1px solid rgba(237,180,55,0.3)",
                      color: "#edb437", fontSize: "11px",
                    }}
                    onClick={() => handleExtractSyllabus(activeSession)}
                    disabled={extractingSyllabus}
                  >
                    {extractingSyllabus ? <><Loader2 size={12} className="me-1" /> Extracting...</> : <><Sparkles size={12} className="me-1" /> AI Extract Syllabus</>}
                  </button>
                </div>

                {/* Uploaded Papers List */}
                <div className="mb-4">
                  <h6 style={{ fontSize: "13px", color: "#888", fontWeight: 600, marginBottom: "10px" }}>
                    <FileText size={14} className="me-2" style={{ color: "#edb437" }} />
                    Uploaded Papers ({sessionData.pdfs?.length || 0})
                  </h6>
                  <div className="d-flex flex-wrap gap-2">
                    {sessionData.pdfs?.map((pdf) => (
                      <div
                        key={pdf.pdf_id}
                        className="d-flex align-items-center gap-2 px-3 py-2"
                        style={{
                          backgroundColor: "#0f0f1a",
                          borderRadius: "8px",
                          border: "1px solid rgba(255,255,255,0.05)",
                          fontSize: "12px",
                        }}
                      >
                        <FileText size={12} style={{ color: "#edb437" }} />
                        <span>{pdf.file_name}</span>
                        <span style={{ color: "#555" }}>·</span>
                        <span style={{ color: "#555" }}>{pdf.page_count}pg</span>
                        {pdf.processed && <CheckCircle2 size={12} className="text-success" />}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Syllabus Topics */}
                <div>
                  <h6 style={{ fontSize: "13px", color: "#888", fontWeight: 600, marginBottom: "10px" }}>
                    <BookOpen size={14} className="me-2" style={{ color: "#edb437" }} />
                    Syllabus Topics ({sessionData.syllabus?.length || 0})
                  </h6>

                  {readinessScore?.topicScores && readinessScore.topicScores.length > 0 ? (
                    <div className="row g-3">
                      {readinessScore.topicScores.map((topic) => (
                        <div key={topic.syllabusId} className="col-md-6">
                          <div className="p-3 rounded" style={{
                            backgroundColor: "#0f0f1a", borderRadius: "12px",
                            border: "1px solid rgba(255,255,255,0.04)",
                          }}>
                            <div className="d-flex justify-content-between mb-2">
                              <span style={{ fontSize: "13px" }}>
                                {topic.unitNumber && (
                                  <span style={{ color: "#edb437", fontWeight: 700, marginRight: "6px" }}>
                                    Unit {topic.unitNumber}
                                  </span>
                                )}
                                {topic.topicName}
                              </span>
                              <span className="badge" style={{
                                fontSize: "10px",
                                background:
                                  topic.gtuGrade === "AA" || topic.gtuGrade === "AB" ? "rgba(34,197,94,0.15)" :
                                  topic.gtuGrade === "BB" || topic.gtuGrade === "BC" ? "rgba(234,179,8,0.15)" :
                                  topic.gtuGrade === "FF" ? "rgba(239,68,68,0.15)" : "rgba(255,255,255,0.05)",
                                color:
                                  topic.gtuGrade === "AA" || topic.gtuGrade === "AB" ? "#22c55e" :
                                  topic.gtuGrade === "BB" || topic.gtuGrade === "BC" ? "#eab308" :
                                  topic.gtuGrade === "FF" ? "#ef4444" : "#666",
                              }}>
                                {topic.gtuGrade || "—"} ({topic.gradePoint ?? "?"}GP)
                              </span>
                            </div>
                            <div style={{ height: "4px", borderRadius: "2px", backgroundColor: "#1a1a2e" }}>
                              <div style={{
                                width: `${topic.avgPercent}%`, height: "100%", borderRadius: "2px",
                                background: topic.mastery === "strong" ? "#22c55e" :
                                  topic.mastery === "moderate" ? "#eab308" : "#ef4444",
                              }} />
                            </div>
                            <div className="d-flex justify-content-between mt-2">
                              <small style={{ color: "#555", fontSize: "11px" }}>
                                {topic.attempts} attempt{topic.attempts !== 1 ? "s" : ""}
                              </small>
                              <small style={{ color: "#555", fontSize: "11px" }}>
                                {topic.questionCount} GTU Qs
                              </small>
                            </div>
                            {topic.isOptional && (
                              <span style={{
                                fontSize: "9px", padding: "2px 6px",
                                borderRadius: "4px", background: "rgba(255,255,255,0.05)",
                                color: "#666", marginTop: "4px", display: "inline-block",
                              }}>Optional</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : sessionData.syllabus?.length > 0 ? (
                    <div className="row g-2">
                      {sessionData.syllabus.map((topic) => (
                        <div key={topic.syllabus_id} className="col-md-6">
                          <div className="d-flex align-items-center gap-2 p-3 rounded" style={{
                            backgroundColor: "#0f0f1a", borderRadius: "10px",
                          }}>
                            <span style={{ color: "#edb437", fontWeight: 700, fontSize: "12px" }}>
                              U{topic.unit_number}
                            </span>
                            <span className="flex-grow-1" style={{ fontSize: "13px" }}>
                              {topic.topic_name}
                            </span>
                            {topic.is_optional && (
                              <span style={{
                                fontSize: "9px", padding: "2px 6px",
                                borderRadius: "4px", background: "rgba(255,255,255,0.05)",
                                color: "#666",
                              }}>Opt</span>
                            )}
                            <span style={{ fontSize: "11px", color: "#555" }}>
                              {topic.question_count || 0}Q
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4" style={{ color: "#555", fontSize: "13px" }}>
                      No syllabus set. Click "AI Extract Syllabus" above or use Edit Mode.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}


        {/* ───── Share Modal ───── */}
        {showShareModal && shareLink && (
          <div
            className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
            style={{ backgroundColor: "rgba(0,0,0,0.75)", zIndex: 9999, backdropFilter: "blur(4px)" }}
            onClick={() => setShowShareModal(false)}
          >
            <div
              className="profile-card"
              style={{ maxWidth: "480px", width: "90%", borderRadius: "16px" }}
              onClick={(e) => e.stopPropagation()}
            >
              <h5 className="mb-3 d-flex align-items-center gap-2" style={{ fontWeight: 600 }}>
                <Share2 size={20} style={{ color: "#edb437" }} /> Share Analysis
              </h5>
              <p style={{ fontSize: "13px", color: "#888" }}>
                Share your readiness analysis with classmates. Link expires in 7 days.
              </p>
              <div className="d-flex gap-2">
                <input
                  type="text"
                  className="form-control"
                  style={{
                    backgroundColor: "#0f0f1a", color: "white",
                    border: "1px solid #2a2a3a", borderRadius: "10px",
                    fontSize: "13px",
                  }}
                  value={shareLink} readOnly
                />
                <button
                  className="btn btn-sm px-3"
                  style={{
                    background: "linear-gradient(135deg, #edb437, #e49c00)",
                    color: "#000", fontWeight: 600, borderRadius: "10px", border: "none",
                  }}
                  onClick={() => {
                    navigator.clipboard.writeText(shareLink);
                    alert("Link copied!");
                  }}
                >
                  <Copy size={14} />
                </button>
              </div>
              <button
                className="btn btn-outline-light btn-sm mt-3 w-100"
                style={{ borderRadius: "10px" }}
                onClick={() => setShowShareModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* Loading Overlay */}
        {loading && (
          <div
            className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
            style={{ backgroundColor: "rgba(0,0,0,0.6)", zIndex: 9999, backdropFilter: "blur(4px)" }}
          >
            <div className="text-center">
              <div className="spinner-border" style={{ color: "#edb437" }} role="status" />
              <p className="mt-2" style={{ fontSize: "14px" }}>Loading...</p>
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
