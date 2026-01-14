import React, { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import History from "../components/History";
import useSession from "../utils/useSession";
import {
  EqualApproximately,
  Eye,
  PackageSearch,
  Clock,
  BarChart2,
  TrendingUp,
  TrendingDown,
  ChevronUp,
  ChevronDown,
  Pencil,
  Trash2,
} from "lucide-react";
import "bootstrap/dist/css/bootstrap.min.css";
import supabase from "../utils/supabaseClient";
import ProgressBar from "react-bootstrap/ProgressBar";
import { useNavigate } from "react-router-dom";
import { Modal, Button } from "react-bootstrap";
import RadarGraph from "../components/RadarGraph";
import FlashcardCarousel from "../components/FlashcardCarousel";

import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
  ArcElement,
} from "chart.js";

ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
  ArcElement
);

const StudyMetrics = () => {
  const {
    userId,
    isLoggedIn,
    isSidebarOpen,
    isHistoryOpen,
    toggleSidebar,
    toggleHistory,
  } = useSession();

  const navigate = useNavigate();
  const [topicsByFile, setTopicsByFile] = useState({});
  const [metrics, setMetrics] = useState({
    quizCount: 0,
    averageScore: 0,
    weakCount: 0,
    completedCount: 0,
    lastActivity: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingTopicId, setEditingTopicId] = useState(null);
  const [newTitle, setNewTitle] = useState("");
  const [expandedSummaries, setExpandedSummaries] = useState({});
  const [showGraphModal, setShowGraphModal] = useState(false);
  const [selectedFileForGraph, setSelectedFileForGraph] = useState(null);
  const [showFlashcardModal, setShowFlashcardModal] = useState(false);
  // const [flashcardTopicTitle, setFlashcardTopicTitle] = useState("");
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [flashcardData, setFlashcardData] = useState([]);
  const [isLoadingFlashcards, setIsLoadingFlashcards] = useState(false);

  const handleOpenFlashcards = async (topic) => {
    console.log("🔄 Opening flashcard modal for topic:", topic.title);
    setSelectedTopic(topic);
    setFlashcardData([]);
    setIsLoadingFlashcards(true);
    setShowFlashcardModal(true);
    const attemptId = topic.latestAttemptId;
    if (!attemptId) {
      setIsLoadingFlashcards(false);
      return;
    }

    try {
      const response = await fetch(
        "http://localhost:5000/api/generate_flashcards",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            attempt_id: attemptId,
            user_id: userId,
            topic_id: topic.topic_id,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || "Failed to generate flashcards.");
        return;
      }

      console.log("✅ Flashcards fetched:", data);
      setFlashcardData(data.flashcards || []);
    } catch (error) {
      console.error("Flashcard fetch failed:", error);
      alert("Flashcard fetch failed.");
    } finally {
      setIsLoadingFlashcards(false);
    }
  };

  const openGraphModal = (fileName) => {
    setSelectedFileForGraph(fileName);
    setShowGraphModal(true);
  };

  const closeGraphModal = () => {
    setShowGraphModal(false);
    setSelectedFileForGraph(null);
  };

  const toggleSummary = (topicId) => {
    setExpandedSummaries((prev) => ({
      ...prev,
      [topicId]: !prev[topicId],
    }));
  };

  useEffect(() => {
    const fetchStudyMetrics = async () => {
      try {
        setLoading(true);
        setError(null);

        if (!userId) {
          setLoading(false);
          return;
        }

        // ✅ Call this only if userId exists
        const response = await fetch(
          "http://localhost:5000/api/update-weak-topics",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ user_id: userId }),
          }
        );

        // ✅ Check the response from backend
        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || "Failed to update weak topics.");
        }

        // ✅ Proceed with fetching metrics only if above succeeded

        const { data: attempts, error: attemptsError } = await supabase
          .from("quiz_attempts")
          .select("attempt_id, topic_id, score, submitted_at")
          .eq("user_id", userId)
          .order("submitted_at", { ascending: false });

        if (attemptsError) throw attemptsError;

        const { data: topics, error: topicsError } = await supabase
          .from("topics")
          .select(
            "topic_id, title, file_name, created_at, topic_summary, topic_status"
          )
          .eq("user_id", userId)
          .eq("archive_status", "not_archived");

        const { data: reviewData, error: reviewError } = await supabase
          .from("user_topic_review_features")
          .select("topic_id, next_review_date")
          .eq("user_id", userId);

        if (reviewError) throw reviewError;

        const reviewMap = {};
        reviewData.forEach((row) => {
          reviewMap[row.topic_id] = row.next_review_date;
        });

        if (topicsError) throw topicsError;

        const quizCount = attempts.length;
        const totalScore = attempts.reduce(
          (sum, attempt) => sum + (attempt.score || 0),
          0
        );
        const averageScore =
          quizCount > 0 ? (totalScore / quizCount).toFixed(1) : 0;

        const topicMetrics = topics.map((topic) => {
          const topicAttempts = attempts.filter(
            (a) => a.topic_id === topic.topic_id
          );
          const latestAttempt = topicAttempts[0];
          return {
            ...topic,
            latestScore: latestAttempt?.score ?? null,
            lastAttemptDate: latestAttempt?.submitted_at ?? null,
            attemptCount: topicAttempts.length,
            latestAttemptId: latestAttempt?.attempt_id ?? null,
            nextReviewDate: reviewMap[topic.topic_id] || null,
          };
        });

        const grouped = {};
        topicMetrics.forEach((topic) => {
          const fileName = topic.file_name || "Uncategorized";
          if (!grouped[fileName]) grouped[fileName] = { weak: [], strong: [] };
          if (topic.latestScore !== null) {
            if (topic.latestScore <= 7) grouped[fileName].weak.push(topic);
            else grouped[fileName].strong.push(topic);
          }
        });

        setTopicsByFile(grouped);
        setMetrics({
          quizCount,
          averageScore,
          weakCount: Object.values(grouped).reduce(
            (sum, file) => sum + file.weak.length,
            0
          ),
          completedCount: Object.values(grouped).reduce(
            (sum, file) => sum + file.strong.length,
            0
          ),
          lastActivity: attempts[0]?.submitted_at ?? null,
        });
      } catch (err) {
        console.error("Error fetching study metrics:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchStudyMetrics();
  }, [userId]);

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
      // Update locally for UI smoothness
      setTopicsByFile((prev) => {
        const updated = { ...prev };
        for (const fileName in updated) {
          updated[fileName].weak = updated[fileName].weak.map((t) =>
            t.topic_id === topicId ? { ...t, title: newTitle } : t
          );
          updated[fileName].strong = updated[fileName].strong.map((t) =>
            t.topic_id === topicId ? { ...t, title: newTitle } : t
          );
        }
        return updated;
      });
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
      setTopicsByFile((prev) => {
        const updated = {};
        for (const fileName in prev) {
          updated[fileName] = {
            weak: prev[fileName].weak.filter((t) => t.topic_id !== topicId),
            strong: prev[fileName].strong.filter((t) => t.topic_id !== topicId),
          };
        }
        return updated;
      });
    }
  };

  const handleTakeExam = (topic) => {
    navigate("/exam", {
      state: {
        topicId: topic.topic_id,
        topicTitle: topic.title,
        fileName: topic.file_name,
      },
    });
  };

  // Helper to render topic card, for weak or strong topic
  const renderTopicCard = (topic, strength) => (
    <div className="col-sm-6 col-md-6 col-xl-4 mb-4" key={topic.topic_id}>
      <div className="card topic_card text-white">
        <div className="card-body">
          <div className="topic_status d-flex justify-content-between align-items-center mb-3">
            <span
              className={`badge ${
                strength === "Weak" ? "badge-weak" : "badge-completed"
              }`}
            >
              {strength}
            </span>
            <p className="card-text d-flex align-items-center small text-white">
              <Clock size={14} className="me-1" />
              {new Date(
                topic.lastAttemptDate || topic.created_at
              ).toLocaleDateString()}
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
                  if (e.key === "Enter") handleEditTopic(topic.topic_id);
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
                onClick={() => handleDeleteTopic(topic.topic_id)}
              />
            </div>
          </div>

          <div className="d-flex justify-content-between align-items-center mb-2">
            <span
              className={
                strength === "Weak"
                  ? "text-danger fw-bold"
                  : "text-success fw-bold"
              }
            >
              {topic.latestScore}/10
            </span>
            <span className="small">
              {topic.attemptCount} attempt{topic.attemptCount !== 1 ? "s" : ""}
            </span>
          </div>

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

          <div className="d-flex justify-content-between mt-3">
            <button
              className="btn btn-sm btn-outline-light"
              onClick={() => handleOpenFlashcards(topic)}
            >
              <Eye size={16} className="me-1" />
              Flashcards
            </button>

            {strength === "Weak" && (
              <button
                className="btn btn-sm btn-answer"
                onClick={() => handleTakeExam(topic)}
              >
                Take Exam
              </button>
            )}
          </div>

          {topic.nextReviewDate && (
            <p className="mt-4 mb-0 text-white small">
              <Clock size={14} className="me-1" />
              Next Review:{" "}
              <span className="fw-bold">
                {new Date(topic.nextReviewDate).toLocaleDateString("en-GB")}
              </span>
            </p>
          )}
        </div>
      </div>
    </div>
  );

  if (!isLoggedIn) {
    return (
      <div className="chat chat-wrapper d-flex min-vh-100">
        <Sidebar
          isOpen={isSidebarOpen}
          toggleSidebar={toggleSidebar}
          toggleHistory={toggleHistory}
          isHistoryOpen={isHistoryOpen}
          isLoggedIn={isLoggedIn}
        />
        <div className="chat-content flex-grow-1 p-4 text-white">
          <div className="container text-center mt-5">
            <h3>Please sign in to view study metrics</h3>
          </div>
        </div>
      </div>
    );
  }

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
          userId={userId}
          isHistoryOpen={isHistoryOpen}
          onClose={toggleHistory}
        />
      </div>

      <div className="chat-content flex-grow-1 p-4 text-white">
        <div className="container text-center mb-4 mt-4">
          <h2 className="grad_text">Study Metrics</h2>
        </div>

        {/* Metrics Overview */}
        <div className="container mb-5">
          <div className="row">
            <div className="col-md-6 col-lg-4 mb-3">
              <div className="metric-card bg-dark p-3 rounded h-100">
                <div className="d-flex align-items-center">
                  <BarChart2 size={24} className="me-2 text-primary" />
                  <h5 className="mb-0">Quizzes Taken</h5>
                </div>
                <h4 className="mt-2">{metrics.quizCount}</h4>
              </div>
            </div>
            <div className="col-md-6 col-lg-4 mb-3">
              <div className="metric-card bg-dark p-3 rounded h-100">
                <div className="d-flex align-items-center">
                  <TrendingUp size={24} className="me-2 text-success" />
                  <h5 className="mb-0">Average Score</h5>
                </div>
                <h4 className="mt-2">{metrics.averageScore}/10</h4>
                <ProgressBar
                  now={metrics.averageScore * 10}
                  variant="success"
                  className="mt-2"
                />
              </div>
            </div>
            <div className="col-md-6 col-lg-4 mb-3">
              <div className="metric-card bg-dark p-3 rounded h-100">
                <div className="d-flex align-items-center">
                  <Clock size={24} className="me-2 text-info" />
                  <h5 className="mb-0">Last Activity</h5>
                </div>
                <h4 className="mt-2">
                  {metrics.lastActivity
                    ? new Date(metrics.lastActivity).toLocaleDateString()
                    : "No activity yet"}
                </h4>
              </div>
            </div>
            <div className="col-md-6 col-lg-4 mb-3">
              <div className="metric-card bg-dark p-3 rounded h-100">
                <div className="d-flex align-items-center">
                  <TrendingDown size={24} className="me-2 text-danger" />
                  <h5 className="mb-0">Weak Topics</h5>
                </div>
                <h4 className="mt-2">{metrics.weakCount}</h4>
              </div>
            </div>
            <div className="col-md-6 col-lg-4 mb-3">
              <div className="metric-card bg-dark p-3 rounded h-100">
                <div className="d-flex align-items-center">
                  <TrendingUp size={24} className="me-2 text-success" />
                  <h5 className="mb-0">Strong Topics</h5>
                </div>
                <h4 className="mt-2">{metrics.completedCount}</h4>
              </div>
            </div>
          </div>
        </div>

        {/* Topics grouped by file with weak & strong */}
        <div className="container mb-5">
          {loading ? (
            <div className="text-center">
              <div className="spinner-border text-light" role="status" />
            </div>
          ) : (
            Object.entries(topicsByFile)
              .filter(
                ([, { weak, strong }]) => weak.length > 0 || strong.length > 0
              )
              .map(([fileName, { weak, strong }]) => (
                <div key={fileName} className="mb-5">
                  {/* File Header */}
                  <div className="d-flex align-items-center mb-3">
                    <div className="metrics_file d-flex align-items-center">
                      <PackageSearch size={30} className="me-2" />
                      <h4 className="text-white">{fileName}</h4>
                    </div>
                    <Button
                      className="btn btn-outline-light ms-auto btn-answer"
                      onClick={() => openGraphModal(fileName)}
                    >
                      View Graph analysis
                    </Button>
                  </div>

                  {/* Weak Section */}
                  {weak.length > 0 && (
                    <>
                      <h5 className="grad-text mb-3 d-flex align-items-center">
                        <TrendingDown className="me-2 text-danger" />
                        <span className="grad_text">Weak Areas</span>
                      </h5>
                      <div className="row">
                        {weak.map((topic) => renderTopicCard(topic, "Weak"))}
                      </div>
                    </>
                  )}

                  {/* Strong Section */}
                  {strong.length > 0 && (
                    <>
                      <h5 className="grad-text mb-3 d-flex align-items-center mt-4">
                        <TrendingUp className="me-2 text-success" />
                        <span className="grad_text">Strong Areas</span>
                      </h5>
                      <div className="row">
                        {strong.map((topic) =>
                          renderTopicCard(topic, "Strong")
                        )}
                      </div>
                    </>
                  )}
                </div>
              ))
          )}
        </div>

        {/* Graph Modal */}
        <Modal
          show={showGraphModal}
          onHide={closeGraphModal}
          size="lg"
          centered
          backdrop="static"
          dialogClassName="modal-90w"
        >
          <Modal.Header closeButton className="bg-dark text-white">
            <Modal.Title>
              Graph Analysis for{" "}
              <span className="grad_text">{selectedFileForGraph}</span>
            </Modal.Title>
          </Modal.Header>

          <Modal.Body className="bg-dark text-white">
            {selectedFileForGraph && (
              <RadarGraph
                fileName={selectedFileForGraph}
                dataObj={topicsByFile[selectedFileForGraph]}
              />
            )}
          </Modal.Body>

          <Modal.Footer className="bg-dark">
            <Button
              variant="secondary"
              className="btn btn-sm btn-answer"
              onClick={closeGraphModal}
            >
              Close
            </Button>
          </Modal.Footer>
        </Modal>

        {showFlashcardModal && selectedTopic && (
          <FlashcardCarousel
            topic={selectedTopic}
            flashcards={flashcardData}
            show={showFlashcardModal}
            isLoading={isLoadingFlashcards}
            onHide={() => {
              setShowFlashcardModal(false);
              setSelectedTopic(null);
              setFlashcardData([]);
              setIsLoadingFlashcards(false);
            }}
          />
        )}

        <EqualApproximately
          className="d-md-none position-fixed top-0 start-0 m-3"
          onClick={toggleSidebar}
          style={{ zIndex: 99 }}
        />
      </div>
    </div>
  );
};

export default StudyMetrics;
