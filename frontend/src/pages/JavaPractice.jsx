import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  EqualApproximately,
  Lock,
  LoaderCircle,
  MessageSquareQuote,
  Search,
} from "lucide-react";
import Sidebar from "../components/Sidebar";
import History from "../components/History";
import useSession from "../utils/useSession";
import { javaPracticeStats } from "../data/javaPractice";

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
        <div className="container java-practice-shell java-native-wrap">
          <section className="java-native-header mb-4">
            <div className="java-native-titlebox">
              <span className="java-native-lock">
                <Lock size={14} />
                PDF Locked
              </span>
              <h1 className="java-native-title">Ask from OOP PDFs</h1>
            </div>
            <div className="java-header-actions">
              <button
                className="btn btn-cs btn-sm java-native-navbtn"
                onClick={() => navigate("/java-important-pdfs")}
              >
                JAVA
              </button>
              <button
                className="btn btn-outline-light btn-sm java-native-navbtn"
                onClick={() => navigate("/java-assignments")}
              >
                Assignments
              </button>
            </div>
          </section>

          <section className="java-native-ask mb-4">
            <div className="java-native-label">
              <Search size={18} />
              <span>PDF only answer</span>
            </div>

            <div className="java-native-inputrow">
              <textarea
                className="form-control java-ask-textarea java-native-input"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Ask your Java question"
                rows={3}
              />
              <button
                className="btn btn-cs java-native-askbtn"
                onClick={() => handleAskPdfOnly()}
                disabled={asking}
              >
                {asking ? <LoaderCircle className="java-spin" size={18} /> : "Ask"}
              </button>
            </div>

            <div className="java-native-prompts">
              {[
                "What is polymorphism?",
                "Explain exception handling.",
                "What is ArrayList?",
              ].map((item) => (
                <button
                  key={item}
                  className="btn btn-outline-light btn-sm java-native-chip"
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
              <div className="java-answer-card java-native-answer">
                <div className="java-detail-label">
                  <MessageSquareQuote size={16} />
                  Answer
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
          </section>

          <section className="row g-3 mb-4">
            {javaPracticeStats.map((item) => (
              <div className="col-6 col-lg-3" key={item.label}>
                <div className="java-stat-card java-native-stat">
                  <p className="java-stat-value">{item.value}</p>
                  <span>{item.label}</span>
                </div>
              </div>
            ))}
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
