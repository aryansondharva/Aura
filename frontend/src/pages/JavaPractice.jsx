import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BookOpenCheck,
  EqualApproximately,
  GraduationCap,
  LoaderCircle,
  MessageSquareQuote,
  NotebookPen,
  Search,
  Sparkles,
} from "lucide-react";
import Sidebar from "../components/Sidebar";
import History from "../components/History";
import useSession from "../utils/useSession";
import {
  javaPracticeStats,
  javaPracticeAssets,
  javaResourcePack,
  javaWeeklyPlan,
} from "../data/javaPractice";

const JavaPractice = () => {
  const {
    isLoggedIn,
    userId,
    isSidebarOpen,
    isHistoryOpen,
    toggleSidebar,
    toggleHistory,
  } = useSession();
  const navigate = useNavigate();

  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const [javaAnswer, setJavaAnswer] = useState("");
  const [answerSources, setAnswerSources] = useState([]);
  const [askError, setAskError] = useState("");

  const handleAskPdfOnly = async (prefillQuestion) => {
    const nextQuestion = (prefillQuestion ?? question).trim();
    if (!nextQuestion) return;

    setQuestion(nextQuestion);
    setAsking(true);
    setAskError("");

    try {
      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/api/java-practice/ask`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question: nextQuestion }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to get answer from PDFs.");
      }

      setJavaAnswer(data.answer || "");
      setAnswerSources(data.sources || []);
    } catch (error) {
      console.error("Java practice ask failed:", error);
      setAskError(error.message || "Something went wrong.");
      setJavaAnswer("");
      setAnswerSources([]);
    } finally {
      setAsking(false);
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
          userId={userId}
          isHistoryOpen={isHistoryOpen}
          onClose={toggleHistory}
        />
      </div>

      <div className="chat-content flex-grow-1 p-4 text-white d-flex flex-column">
        <div className="container java-practice-shell">
          <section className="java-hero mb-4">
            <div className="java-hero-copy">
              <span className="java-hero-pill">
                <GraduationCap size={16} />
                GTU Java Practice Hub
              </span>
              <h1 className="java-hero-title">
                Simple OOP help for GTU students
              </h1>
              <p className="java-hero-text">
                Ask questions and get answers from your OOP PDFs only. Use the
                notes, assignments, practical list, and GTU paper in one simple
                place.
              </p>
              <div className="java-ask-panel">
                <div className="java-panel-top">
                  <Search size={18} />
                  <span>Ask from OOP PDFs only</span>
                </div>
                <p className="java-ask-note">
                  This box is restricted to the `OBJECT ORIENTED PROGRAMMING`
                  PDF folder. If the answer is not in those PDFs, Aura should
                  say so instead of guessing.
                </p>
                <div className="java-ask-input-row">
                  <textarea
                    className="form-control java-ask-textarea"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder="Example: Explain inheritance with example from the notes"
                    rows={4}
                  />
                  <button
                    className="btn btn-cs"
                    onClick={() => handleAskPdfOnly()}
                    disabled={asking}
                  >
                    {asking ? <LoaderCircle className="java-spin" size={18} /> : "Ask PDFs"}
                  </button>
                </div>
                <div className="java-quick-prompts">
                  {[
                    "What is polymorphism in Java?",
                    "Explain exception handling with try-catch-finally.",
                    "Difference between ArrayList and LinkedList.",
                  ].map((item) => (
                    <button
                      key={item}
                      className="btn btn-outline-light btn-sm"
                      onClick={() => handleAskPdfOnly(item)}
                      disabled={asking}
                    >
                      {item}
                    </button>
                  ))}
                </div>
                {askError ? (
                  <div className="java-answer-card java-answer-error">{askError}</div>
                ) : null}
                {javaAnswer ? (
                  <div className="java-answer-card">
                    <div className="java-detail-label">
                      <MessageSquareQuote size={16} />
                      PDF-Based Answer
                    </div>
                    <p style={{ whiteSpace: "pre-wrap" }}>{javaAnswer}</p>
                    {answerSources.length > 0 ? (
                      <div className="java-source-list">
                        {answerSources.map((source) => (
                          <span key={source} className="java-source-chip">
                            {source}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
              <div className="java-hero-actions">
                <button
                  className="btn btn-cs"
                  onClick={() => navigate("/topics")}
                >
                  Add Your Notes
                </button>
              </div>
            </div>

            <div className="java-hero-panel">
              <div className="java-panel-card">
                <div className="java-panel-top">
                  <Sparkles size={18} />
                  <span>Subject</span>
                </div>
                <h3>Object Oriented Programming</h3>
                <p>Semester practice support built around your own OOP material.</p>
              </div>
              <div className="java-panel-card subtle">
                <div className="java-panel-top">
                  <BookOpenCheck size={18} />
                  <span>Best Use</span>
                </div>
                <p>
                  Ask theory questions here, then revise from assignments and
                  the GTU paper.
                </p>
              </div>
            </div>
          </section>

          <section className="row g-3 mb-4">
            {javaPracticeStats.map((item) => (
              <div className="col-6 col-lg-3" key={item.label}>
                <div className="java-stat-card">
                  <p className="java-stat-value">{item.value}</p>
                  <span>{item.label}</span>
                </div>
              </div>
            ))}
          </section>

          <section className="java-plan-card mb-5">
            <div className="java-plan-head">
              <h2>Important Study Material</h2>
              <p>
                Start from these files when you want fast revision.
              </p>
            </div>

            <div className="row g-3">
              {javaResourcePack.map((item) => (
                <div className="col-md-6 col-xl-4" key={item.fileName}>
                  <div className="java-day-card">
                    <span className="java-day-badge">{item.type}</span>
                    <h3>{item.title}</h3>
                    <p>{item.use}</p>
                    <div className="java-file-tag">{item.fileName}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="java-plan-card">
            <div className="java-plan-head">
              <h2>Simple 5-Day Revision Plan</h2>
              <p>
                Follow this when exams or viva are near.
              </p>
            </div>

            <div className="row g-3">
              {javaWeeklyPlan.map((item) => (
                <div className="col-md-6 col-xl-4" key={item.day}>
                  <div className="java-day-card">
                    <span className="java-day-badge">{item.day}</span>
                    <h3>{item.focus}</h3>
                    <p>{item.action}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="java-plan-card mt-4">
            <div className="java-plan-head">
              <h2>Assignments and Practical Help</h2>
              <p>
                Use these files for coding practice, practical work, and exam
                preparation.
              </p>
            </div>

            <div className="row g-3">
              {javaPracticeAssets.map((item) => (
                <div className="col-md-6 col-xl-3" key={item.fileName}>
                  <div className="java-asset-card">
                    <span className="java-asset-badge">{item.badge}</span>
                    <h3>{item.title}</h3>
                    <p>{item.note}</p>
                    <div className="java-file-tag">{item.fileName}</div>
                  </div>
                </div>
                ))}
              </div>
            </section>

          <section className="java-plan-card mt-4">
            <div className="java-plan-head">
              <h2>How Students Should Use This</h2>
              <p>Keep the flow simple and practical.</p>
            </div>
            <div className="row g-3">
              {[
                "Ask one theory question in the PDF box.",
                "Open the related notes or assignment.",
                "Write the answer in your own words.",
                "Revise again from the GTU paper before exam.",
              ].map((item, index) => (
                <div className="col-md-6" key={item}>
                  <div className="java-day-card">
                    <div className="java-detail-label">
                      <NotebookPen size={16} />
                      Step {index + 1}
                    </div>
                    <p>{item}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

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

export default JavaPractice;
