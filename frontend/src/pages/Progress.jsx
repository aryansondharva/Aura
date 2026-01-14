import React, { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import History from "../components/History";
import useSession from "../utils/useSession";
import {
  EqualApproximately,
  ChevronDown,
  ChevronUp,
  PackageSearch,
} from "lucide-react";
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";
import "bootstrap/dist/css/bootstrap.min.css";
import GraphAnalysis from "../components/GraphAnalysis";

const Progress = () => {
  const {
    user,
    userId,
    isLoggedIn,
    isSidebarOpen,
    isHistoryOpen,
    toggleSidebar,
    toggleHistory,
  } = useSession();

  const [expandedTopics, setExpandedTopics] = useState({});
  const [progressData, setProgressData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [analysisData, setAnalysisData] = useState([]);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [attemptData, setAttemptData] = useState(null);

  useEffect(() => {
    const fetchProgress = async () => {
      setLoading(true);
      try {

        // 🔁 Trigger weak topic update first
        await fetch("http://localhost:5000/api/update-weak-topics", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_id: userId }),
        });

        // ✅ Then fetch progress
        const response = await fetch(
          `http://localhost:5000/api/progress/${userId}`
        );
        if (response.ok) {
          const { attempts, topics } = await response.json();

          const topicMetaMap = {};
          topics.forEach((t) => {
            topicMetaMap[t.topic_id] = {
              title: t.title,
              fileName: t.file_name,
            };
          });

          const topicAttemptsMap = {};
          attempts.forEach((a) => {
            const tId = a.topic_id;
            topicAttemptsMap[tId] = topicAttemptsMap[tId] || [];
            topicAttemptsMap[tId].push(a);
          });

          const transformedProgress = Object.entries(topicAttemptsMap).map(
            ([topicId, list]) => {
              const sorted = list.sort(
                (a, b) => new Date(a.submitted_at) - new Date(b.submitted_at)
              );
              const latest = sorted[sorted.length - 1];
              const previous =
                sorted.length > 1 ? sorted[sorted.length - 2] : null;
              const first = sorted[0];

              const latestScore = latest.score;
              const previousScore = previous?.score ?? null;
              const firstScore = first.score;

              const progress_percent =
                previousScore !== null
                  ? parseFloat(
                      (
                        ((latestScore - previousScore) * 100) /
                        previousScore
                      ).toFixed(2)
                    )
                  : null;

              const overall_progress_percent =
                sorted.length > 1 && firstScore !== 0
                  ? parseFloat(
                      (((latestScore - firstScore) * 100) / firstScore).toFixed(
                        2
                      )
                    )
                  : null;

              return {
                topic_id: topicId,
                topic_title: topicMetaMap[topicId]?.title || `Topic ${topicId}`,
                file_name:
                  topicMetaMap[topicId]?.fileName || "Unknown Document",
                latest_score: latestScore,
                previous_score: previousScore,
                first_score: firstScore,
                progress_percent,
                overall_progress_percent,
                total_attempts: sorted.length,
                attempt_history: sorted.map((a, i) => ({
                  attempt_number: i + 1,
                  score: a.score,
                  submitted_at: a.submitted_at,
                  improvement:
                    i === 0
                      ? null
                      : +(a.score - sorted[i - 1].score).toFixed(2),
                })),
              };
            }
          );

          setProgressData(transformedProgress);
        } else {
          console.error("Error fetching progress:", response.statusText);
          setProgressData([]);
        }
      } catch (error) {
        console.error("Error fetching progress:", error.message);
        setProgressData([]);
      }
      setLoading(false);
    };

    if (userId) fetchProgress();
  }, [userId]);

  const toggleHistoryView = (topicId) => {
    setExpandedTopics((prev) => ({ ...prev, [topicId]: !prev[topicId] }));
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return "";

    const [datePart, timePart] = timestamp.split("T");
    const [year, month, day] = datePart.split("-");
    const [hour, minute] = timePart.split(":");

    let hourNum = parseInt(hour);
    const ampm = hourNum >= 12 ? "PM" : "AM";
    hourNum = hourNum % 12 || 12;

    return `${day}/${month}/${year.slice(2)} - ${String(hourNum).padStart(
      2,
      "0"
    )}:${minute} ${ampm}`;
  };

  const transformData = (data) => {
    return data.map((item, index) => {
      const attemptHistory = item.attempt_history || [];
      const latestAttempt = attemptHistory[attemptHistory.length - 1] || {};
      return {
        topicId: item.topic_id || `t${index + 1}`,
        fileName: item.file_name || "Document",
        topicTitle: item.topic_title || `Topic ${index + 1}`,
        latestScore: item.latest_score || latestAttempt.score || 0,
        latestAttemptNumber:
          latestAttempt.attempt_number || item.total_attempts || 0,
        totalAttempts: item.total_attempts || 1,
        overallProgress: item.overall_progress_percent || 0,
        history: attemptHistory.slice().reverse(),
      };
    });
  };

  const transformedData = transformData(progressData);

  const groupedTopics = transformedData.reduce((acc, curr) => {
    if (curr.latestScore === null) return acc;
    if (!acc[curr.fileName]) acc[curr.fileName] = [];
    acc[curr.fileName].push(curr);
    return acc;
  }, {});

  const handleAnswerAnalysis = async (topicId, attemptNumber) => {
    setShowModal(true);
    setLoadingAnalysis(true);
    setAnalysisData([]);
    setAttemptData(null);
    try {
      const response = await fetch(
        `http://localhost:5000/api/answer-analysis?topic_id=${topicId}&attempt_number=${attemptNumber}&user_id=${userId}`
      );
      if (response.ok) {
        const data = await response.json();
        setAnalysisData(data.questions);
        setAttemptData(data.attempt_data);
      }
    } finally {
      setLoadingAnalysis(false);
    }
  };

  return (
    <div className="chat chat-wrapper d-flex min-vh-100">
      <div className={`sidebar-area ${isSidebarOpen ? "open" : "collapsed"}`}>
        <Sidebar
          isOpen={isSidebarOpen}
          toggleSidebar={toggleSidebar}
          toggleHistory={toggleHistory}
          isHistoryOpen={isHistoryOpen}
          isLoggedIn={isLoggedIn}
        />
        <History
          isLoggedIn={isLoggedIn}
          userId={user?.id}
          isHistoryOpen={isHistoryOpen}
          onClose={toggleHistory}
        />
      </div>

      <div className="chat-content flex-grow-1 p-4 text-white">
        <div className="container text-center mb-4 mt-4">
          <h2 className="grad_text">Your Progress Overview</h2>
        </div>

        <div className="container">
          {loading ? (
            <div
              className="d-flex justify-content-center align-items-center"
              style={{ height: "150px" }}
            >
              <div className="spinner-border text-primary" role="status" />
            </div>
          ) : Object.keys(groupedTopics).length === 0 ? (
            <div className="text-center mt-5">
              <h5 className="text-warning">
                📌 Take exams for progress overview
              </h5>
            </div>
          ) : (
            Object.entries(groupedTopics).map(([fileName, topics]) => (
              <div key={fileName} className="mb-5">
                <h4 className="text-white mb-3">
                  <PackageSearch className="me-2" /> {fileName}
                </h4>
                <div className="row">
                  {topics.map((topic, idx) => {
                    const safeFileName = fileName.replace(/\W/g, "");
                    const topicId = topic.topicId || idx;
                    const modalId = `graphModal_${safeFileName}_${topicId}`;

                    return (
                      <div className="col-md-6 col-xl-4 mb-4" key={idx}>
                        <div className="card topic_card text-white">
                          <div className="card-body">
                            <h5 className="card-title mb-1">
                              {topic.topicTitle}
                            </h5>
                            <div className="d-flex justify-content-between align-items-center">
                              <div className="my-3" style={{ width: 60 }}>
                                <CircularProgressbar
                                  value={(topic.latestScore / 10) * 100}
                                  text={`${topic.latestScore.toFixed(1)}/10`}
                                  styles={buildStyles({
                                    textColor: "white",
                                    pathColor:
                                      topic.latestScore >= 8
                                        ? "#28a745"
                                        : topic.latestScore >= 6
                                        ? "#ffc107"
                                        : "#dc3545",
                                    trailColor: "#444",
                                  })}
                                />
                              </div>

                              <button
                                type="button"
                                className="btn btn-sm btn-answer"
                                data-bs-toggle="modal"
                                data-bs-target={`#${modalId}`}
                              >
                                View Graph Analysis
                              </button>
                            </div>

                            <div className="mt-3 marks_progress">
                              <button
                                className="btn btn-sm btn-outline w-100 d-flex justify-content-between align-items-center text-white ans_drp"
                                onClick={() => toggleHistoryView(topic.topicId)}
                              >
                                Exam Marks History
                                {expandedTopics[topic.topicId] ? (
                                  <ChevronUp size={16} />
                                ) : (
                                  <ChevronDown size={16} />
                                )}
                              </button>

                              {expandedTopics[topic.topicId] && (
                                <div className="mt-2">
                                  {topic.history.map((attempt, i) => {
                                    const improvement =
                                      attempt.improvement ?? 0;
                                    return (
                                      <div key={i} className="marks_hitory">
                                        <div className="d-flex justify-content-between test_details_progress">
                                          <strong>
                                            Test{" "}
                                            {attempt.attempt_number || i + 1}
                                          </strong>
                                          <span className="text-muted small">
                                            {formatTimestamp(
                                              attempt.submitted_at
                                            )}
                                          </span>
                                        </div>
                                        <div className="d-flex justify-content-between align-items-center mt-2">
                                          <span>
                                            <strong>{attempt.score}/10</strong>{" "}
                                            (
                                            {improvement > 0 ? (
                                              <span className="text-success">
                                                +{improvement.toFixed(1)} ↑
                                              </span>
                                            ) : improvement < 0 ? (
                                              <span className="text-danger">
                                                {improvement.toFixed(1)} ↓
                                              </span>
                                            ) : (
                                              <span className="text-secondary">
                                                0 →
                                              </span>
                                            )}
                                            )
                                          </span>
                                          <button
                                            className="btn btn-sm btn-answer"
                                            onClick={() =>
                                              handleAnswerAnalysis(
                                                topic.topicId,
                                                attempt.attempt_number || i + 1
                                              )
                                            }
                                          >
                                            Answer Analysis
                                          </button>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Modal for Graph */}
                        <div
                          className="modal fade"
                          id={modalId}
                          tabIndex="-1"
                          aria-hidden="true"
                        >
                          <div className="modal-dialog modal-lg modal-dialog-centered">
                            <div className="modal-content bg-dark text-white">
                              <div className="modal-header">
                                <h5 className="modal-title">
                                  Graph Analysis: {topic.topicTitle}
                                </h5>
                                <button
                                  type="button"
                                  className="btn-close btn-close-white"
                                  data-bs-dismiss="modal"
                                ></button>
                              </div>
                              <div className="modal-body pt-5">
                                <GraphAnalysis
                                  topicTitle={topic.topicTitle}
                                  history={topic.history}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        <span className="navbar-toggler-menu">
          <EqualApproximately
            className="d-md-none position-fixed top-0 start-0 m-3"
            onClick={toggleSidebar}
            style={{ zIndex: 99 }}
          />
        </span>
      </div>

      {showModal &&
        ((
          <div
            className="modal-backdrop fade show"
            onClick={() => setShowModal(false)}
          ></div>
        ),
        (
          <div className="modal show d-block" tabIndex="-1" role="dialog">
            <div className="modal-dialog modal-xl modal-lg" role="document">
              <div className="modal-content bg-dark text-white">
                <div className="modal-header p-4">
                  <div>
                    <h5 className="modal-title">Answer Analysis</h5>
                    {attemptData && (
                      <div className="attempt-info">
                        <span className="me-3">
                          <strong>Score:</strong> {attemptData.score || "N/A"}
                          /10
                        </span>
                        <span>
                          <strong>Date:</strong>{" "}
                          {new Date(
                            attemptData.submitted_at
                          ).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    className="btn-close btn-close-white"
                    onClick={() => setShowModal(false)}
                  ></button>
                </div>
                <div className="modal-body p-4">
                  {loadingAnalysis ? (
                    <div className="text-center">
                      <div
                        className="spinner-border text-light"
                        role="status"
                      />
                    </div>
                  ) : analysisData.length === 0 ? (
                    <p>No analysis data found.</p>
                  ) : (
                    analysisData.map((q, index) => (
                      <div
                        key={q.question_id || index}
                        className="dedicated_answer_box"
                      >
                        <p>
                          <strong>Q{index + 1}:</strong> {q.question_text}
                        </p>
                        <p>
                          <strong>Your answer:</strong>{" "}
                          <span
                            style={{
                              color: q.is_correct ? "limegreen" : "red",
                            }}
                          >
                            {q.selected_option
                              ? `(${q.selected_option}) ${q.selected_option_text}`
                              : "No answer selected"}
                          </span>
                        </p>
                        {!q.is_correct && (
                          <p>
                            <strong>Correct answer:</strong>{" "}
                            <span style={{ color: "limegreen" }}>
                              ({q.correct_option}) {q.correct_option_text}
                            </span>
                          </p>
                        )}
                        <p className="expl">
                          <strong>Explanation:</strong> {q.explanation}
                        </p>
                      </div>
                    ))
                  )}
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-sm btn-answer"
                    onClick={() => setShowModal(false)}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
    </div>
  );
};

export default Progress;
