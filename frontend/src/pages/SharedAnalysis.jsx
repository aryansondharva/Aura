import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import {
  Brain,
  Target,
  BookOpen,
  FileText,
  TrendingUp,
  BarChart3,
  AlertCircle,
  Clock,
  Share2,
  Sparkles,
} from "lucide-react";
import "bootstrap/dist/css/bootstrap.min.css";

const BACKEND = import.meta.env.VITE_BACKEND_URL;

const SharedAnalysis = () => {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchSharedReport = async () => {
      try {
        const res = await fetch(`${BACKEND}/api/readiness/shared/${token}`);

        if (res.status === 404) {
          setError("This shared report was not found.");
          return;
        }
        if (res.status === 410) {
          setError("This shared link has expired.");
          return;
        }

        const json = await res.json();
        if (json.error) {
          setError(json.error);
        } else {
          setData(json);
        }
      } catch (err) {
        setError("Failed to load report: " + err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchSharedReport();
  }, [token]);

  // ── Readiness Gauge ──
  const ReadinessGauge = ({ score }) => {
    const radius = 70;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (score / 100) * circumference;
    const color = score >= 85 ? "#22c55e" : score >= 70 ? "#eab308" : score >= 50 ? "#f97316" : "#ef4444";

    return (
      <div className="text-center">
        <svg width="180" height="180" viewBox="0 0 180 180">
          <circle cx="90" cy="90" r={radius} fill="none" stroke="#2a2a2a" strokeWidth="10" />
          <circle cx="90" cy="90" r={radius} fill="none" stroke={color} strokeWidth="10"
            strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
            transform="rotate(-90 90 90)"
            style={{ transition: "stroke-dashoffset 1.5s ease-in-out" }} />
          <text x="90" y="85" textAnchor="middle" fill="white" fontSize="32" fontWeight="bold">
            {score}%
          </text>
          <text x="90" y="108" textAnchor="middle" fill="#999" fontSize="11">
            Readiness Score
          </text>
        </svg>
      </div>
    );
  };

  // ── Loading ──
  if (loading) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center"
        style={{ backgroundColor: "#0a0a0a", color: "white" }}>
        <div className="text-center">
          <div className="spinner-border text-warning mb-3" role="status" />
          <p>Loading shared report...</p>
        </div>
      </div>
    );
  }

  // ── Error ──
  if (error) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center"
        style={{ backgroundColor: "#0a0a0a", color: "white" }}>
        <div className="text-center">
          <AlertCircle size={64} className="mb-3 text-danger" />
          <h4>{error}</h4>
          <p className="text-white-50 mt-2">Ask your classmate for a new link.</p>
        </div>
      </div>
    );
  }

  const session = data?.session || {};
  const readiness = data?.readiness;
  const topQuestions = data?.topQuestions || [];
  const syllabus = data?.syllabus || [];

  return (
    <div className="min-vh-100" style={{ backgroundColor: "#0a0a0a", color: "white" }}>
      {/* Top Bar */}
      <div className="py-3 px-4 d-flex align-items-center justify-content-between"
        style={{ borderBottom: "1px solid #ffffff15", backgroundColor: "#111" }}>
        <div className="d-flex align-items-center gap-2">
          <Brain size={24} style={{ color: "#edb437" }} />
          <span className="fw-bold">Aura — Shared Readiness Report</span>
        </div>
        <span className="small text-white-50">
          <Share2 size={14} className="me-1" />
          Shared by {data?.shared_by || "a classmate"}
        </span>
      </div>

      <div className="container py-4" style={{ maxWidth: "900px" }}>
        {/* Session Header */}
        <div className="text-center mb-4">
          <h2 style={{
            background: "linear-gradient(to right, #edb437, #fff)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          }}>
            {session.session_name || "Exam Readiness Report"}
          </h2>
          {session.subject_name && (
            <span className="badge bg-secondary mt-2">{session.subject_name}</span>
          )}
          <div className="mt-2 text-white-50 small">
            {session.total_pdfs && <span className="me-3"><FileText size={14} className="me-1" />{session.total_pdfs} Papers Analyzed</span>}
            {session.exam_date && <span><Clock size={14} className="me-1" />Exam: {new Date(session.exam_date).toLocaleDateString()}</span>}
          </div>
        </div>

        {/* Readiness Score */}
        {readiness && (
          <div className="row mb-4">
            <div className="col-md-4 mb-3">
              <div className="p-4 rounded text-center" style={{ backgroundColor: "#171717", border: "1px solid #ffffff15" }}>
                <ReadinessGauge score={readiness.overall_score || session.readiness_score || 0} />
              </div>
            </div>
            <div className="col-md-8 mb-3">
              <div className="p-4 rounded h-100" style={{ backgroundColor: "#171717", border: "1px solid #ffffff15" }}>
                <h6 className="mb-3">Score Breakdown</h6>
                <div className="row g-3">
                  {[
                    { label: "Coverage", value: readiness.coverage_score, icon: <BookOpen size={16} /> },
                    { label: "Mastery", value: readiness.mastery_score, icon: <Target size={16} /> },
                    { label: "Velocity", value: readiness.quiz_velocity, icon: <TrendingUp size={16} /> },
                    { label: "Consistency", value: readiness.consistency_score, icon: <Clock size={16} /> },
                  ].map((item) => (
                    <div key={item.label} className="col-6">
                      <div className="p-2 rounded" style={{ backgroundColor: "#1a1a1a" }}>
                        <div className="d-flex align-items-center gap-1 mb-1">
                          {item.icon}
                          <span className="small">{item.label}</span>
                          <span className="ms-auto small" style={{ color: "#edb437" }}>{item.value || 0}%</span>
                        </div>
                        <div className="progress" style={{ height: "3px", backgroundColor: "#2a2a2a" }}>
                          <div className="progress-bar" style={{
                            width: `${item.value || 0}%`,
                            background: (item.value || 0) >= 70 ? "#22c55e" : (item.value || 0) >= 40 ? "#eab308" : "#ef4444",
                          }} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Syllabus */}
        {syllabus.length > 0 && (
          <div className="mb-4 p-4 rounded" style={{ backgroundColor: "#171717", border: "1px solid #ffffff15" }}>
            <h6 className="mb-3">
              <BookOpen size={16} className="me-2" style={{ color: "#edb437" }} />
              Syllabus Topics
            </h6>
            <div className="row g-2">
              {syllabus.map((topic, idx) => (
                <div key={idx} className="col-md-6">
                  <div className="d-flex align-items-center gap-2 p-2 rounded" style={{ backgroundColor: "#1a1a1a" }}>
                    <span className="small flex-grow-1">{topic.topic_name}</span>
                    {topic.is_optional && <span className="badge bg-secondary" style={{ fontSize: "9px" }}>Opt</span>}
                    <span className="badge bg-dark" style={{ fontSize: "9px" }}>{topic.question_count || 0}Q</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Top Questions */}
        {topQuestions.length > 0 && (
          <div className="mb-4 p-4 rounded" style={{ backgroundColor: "#171717", border: "1px solid #ffffff15" }}>
            <h6 className="mb-3">
              <Target size={16} className="me-2" style={{ color: "#edb437" }} />
              Most Asked Questions ({topQuestions.length})
            </h6>
            {topQuestions.map((q, idx) => (
              <div key={idx} className="mb-2 p-3 rounded"
                style={{ backgroundColor: "#1a1a1a", borderLeft: "3px solid #edb437" }}>
                <div className="d-flex align-items-center gap-2 mb-1">
                  <span className="badge" style={{
                    backgroundColor: q.frequency_count >= 5 ? "#ef4444" :
                      q.frequency_count >= 3 ? "#eab308" : "#22c55e",
                    fontSize: "10px",
                  }}>
                    🔥 {q.frequency_count}x
                  </span>
                  <span className="badge bg-secondary" style={{ fontSize: "10px" }}>{q.question_type}</span>
                  <span className="badge bg-dark" style={{ fontSize: "10px" }}>{q.difficulty}</span>
                </div>
                <p className="mb-0 small">{q.question_text}</p>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="text-center py-4">
          <p className="small text-white-50">
            <Sparkles size={14} className="me-1" style={{ color: "#edb437" }} />
            Powered by <strong>Aura — Exam Readiness AI</strong>
          </p>
          <a href="/" className="btn btn-cs btn-sm mt-2">
            Try Aura for Free
          </a>
        </div>
      </div>
    </div>
  );
};

export default SharedAnalysis;
