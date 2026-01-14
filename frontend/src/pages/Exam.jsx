import React, { useState, useEffect, useCallback } from "react";
import Sidebar from "../components/Sidebar";
import History from "../components/History";
import useSession from "../utils/useSession";
import { EqualApproximately } from "lucide-react";
import "bootstrap/dist/css/bootstrap.min.css";
import { useLocation, useNavigate } from "react-router-dom";

const Exam = () => {
  // Session & UI state from your custom hook
  const {
    user,
    userId,
    email,
    isLoggedIn,
    isSidebarOpen,
    isHistoryOpen,
    toggleSidebar,
    toggleHistory,
  } = useSession();

  const location = useLocation();
  const navigate = useNavigate();

  const {
    topicTitle = "Sample Topic",
    fileName = "SampleFile.pdf",
    topicId = null,
  } = location.state || {};
  const isTopicMissing = !topicId;

  // Exam states
  const [examStarted, setExamStarted] = useState(false);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes in seconds
  const [questions, setQuestions] = useState([]); // Holds fetched questions
  const [answers, setAnswers] = useState([]); // User answers for each question
  const [submitting, setSubmitting] = useState(false);

  // Function to fetch questions from backend on "Start Exam"
  const startExam = async () => {
    if (!topicId) {
      alert("Topic ID not specified. Cannot start exam.");
      return;
    }
    setLoadingQuestions(true);
    try {
      const res = await fetch("http://localhost:5000/api/generate-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic_id: topicId,
          difficulty_mode: "hard",
          user_id: userId,
        }),
      });
      const data = await res.json();

      if (res.ok && data.questions && data.questions.length > 0) {
        setQuestions(data.questions);

        setAnswers(Array(data.questions.length).fill(null)); // Initialize answers array
        setExamStarted(true);
        setTimeLeft(600); // Reset timer on start
        console.log("📋 Loaded Questions:");
        data.questions.forEach((q, index) => {
          console.log(
            `Question ${index + 1} | ID: ${q.question_id || q.id} | Text: ${
              q.question_text
            }`
          );
        });
      } else {
        alert(
          "Failed to generate questions: " +
            (data.error || "No questions received")
        );
      }
    } catch (err) {
      alert("Error fetching questions: " + err.message);
    } finally {
      setLoadingQuestions(false);
    }
  };

  // Memoized submit handler to satisfy useEffect deps and prevent re-creation
  const handleSubmit = useCallback(
    async (isTimeUp = false) => {
      const answeredCount = answers.filter((a) => a !== null).length;

      if (!isTimeUp && answeredCount !== questions.length) {
        alert("Please answer all questions before submitting!");
        return;
      }

      if (isTimeUp) {
        alert("⏰ Time's up! Submitting your exam...");
      } else {
        alert(
          `Exam complete. You answered ${answeredCount}/${questions.length} questions. Redirecting to progress page.`
        );
      }

      setSubmitting(true);

      try {
        const formattedAnswers = questions.map((q, index) => {
          const qid = q.question_id || q.id;
          const selected = answers[index];
          const optionLetter =
            selected !== null
              ? String.fromCharCode(65 + selected) // 65 = 'A'
              : null;
          if (!qid) {
            console.warn(
              `⚠️ Missing question_id for question ${index + 1}:`,
              q
            );
          }

          if (selected === null || selected === undefined) {
            console.warn(`⚠️ No answer selected for question ${index + 1}`);
          }

          return {
            question_id: qid,
            selected_answer: optionLetter,
          };
        });

        console.log("🧪 Formatted Answers Payload:", formattedAnswers);
        console.log("🔍 Full Submission Body:", {
          user_id: userId,
          topic_id: topicId,
          email: email,
          submitted_answers: formattedAnswers,
        });

        const response = await fetch("http://localhost:5000/api/submit-answers", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            user_id: userId,
            topic_id: topicId,
            email: email,
            submitted_answers: formattedAnswers,
          }),
        });

        const result = await response.json();

        if (response.ok) {
          console.log("✅ Submitted successfully:", result);
          navigate("/progress");
        } else {
          console.error("❌ Submission failed:", result);
          alert(
            `Failed to submit your answers:\n${result.error || "Unknown error"}`
          );
        }
      } catch (error) {
        console.error("💥 Error submitting exam:", error);
        alert("An unexpected error occurred during submission.");
      } finally {
        setSubmitting(false);
      }
    },
    [answers, questions, navigate, userId, topicId, email]
  );

  // Timer effect: countdown when exam started
  useEffect(() => {
    if (examStarted && timeLeft > 0) {
      const timerId = setInterval(() => setTimeLeft((t) => t - 1), 1000);
      return () => clearInterval(timerId);
    } else if (timeLeft === 0 && examStarted) {
      handleSubmit(true); // Auto-submit on timeout
    }
  }, [examStarted, timeLeft, handleSubmit]);

  // Warn if user tries to close tab or navigate away mid-exam
  useEffect(() => {
    const handleTabClose = (e) => {
      if (examStarted) {
        e.preventDefault();
        handleSubmit();
        e.returnValue =
          "Are you sure you want to leave? Your exam progress will be lost.";
      }
    };

    window.addEventListener("beforeunload", handleTabClose);
    return () => window.removeEventListener("beforeunload", handleTabClose);
  }, [examStarted, handleSubmit]);

  // Format seconds to mm:ss
  const formatTime = (seconds) => {
    const m = String(Math.floor(seconds / 60)).padStart(2, "0");
    const s = String(seconds % 60).padStart(2, "0");
    return `${m}:${s}`;
  };

  // Handle option selection for a question
  const handleOptionChange = (qIndex, optionIndex) => {
    const updatedAnswers = [...answers];
    updatedAnswers[qIndex] = optionIndex;
    setAnswers(updatedAnswers);
  };

  // Check if all questions are answered
  const allAnswered =
    answers.length === questions.length && answers.every((a) => a !== null);

  if (isTopicMissing) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100 text-white flex-column text-center bg-dark">
        <h2 className="mb-3">Oops! No Topic Selected</h2>
        <p className="mb-4">
          Please choose a topic from the <strong>Topics</strong> page or upload
          a file to generate one.
        </p>
        <button className="btn btn-cs" onClick={() => navigate("/topics")}>
          Go to Topics
        </button>
      </div>
    );
  }
  return (
    <div className="chat chat-wrapper chat_scroll d-flex min-vh-100 p-0">
      {submitting && (
        <div className="exam-loader-overlay">
          <div className="spinner-border text-light" role="status">
            <span className="visually-hidden">Submitting...</span>
          </div>
          <p className="mt-3">Submitting Exam...</p>
        </div>
      )}
      {/* Sidebar and History */}
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

      {/* Main Exam Content */}
      <div className="chat-content flex-grow-1 p-4 text-white d-flex flex-column chat_scroll">
        <div className="container">
          <div className="row">
            <div className="col-md-12 text-center">
              <h2 className="grad_text">Gear Up! It’s Exam Time!</h2>
            </div>
          </div>
        </div>

        {!examStarted ? (
          // Before exam start: show exam rules and Start Exam button
          <div className="container d-flex flex-column justify-content-center align-items-center text-center flex-grow-1">
            <div className="row">
              <div className="col-md-12">
                <div className="profile_card exam_rules">
                  <h2 className="mb-2">File: {fileName}</h2>
                  <h3 className="mb-2">Topic: {topicTitle}</h3>

                  <h5 className="mt-5 mb-2 text-start">Exam Rules:</h5>
                  <ul className="text-start">
                    <li>⏰ Total Time: 10 Minutes</li>
                    <li>📚 10 Questions – All Are Mandatory</li>
                    <li>🚫 No Tab-Hopping or Closing the Browser</li>
                    <li>
                      ⚠️ Closing the browser will end your exam instantly –
                      poof, gone!
                    </li>
                  </ul>

                  <h4 className="text-danger mt-3 timer-exam">
                    {formatTime(timeLeft)}
                  </h4>

                  <button
                    className="btn btn-cs mt-4"
                    onClick={startExam}
                    disabled={loadingQuestions}
                  >
                    {loadingQuestions && <span className="spinner" />}
                    {loadingQuestions ? "Loading Questions..." : "Start Exam"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          // Exam started: show timer, submit button, and questions split in two columns
          <div className="container">
            {/* Timer and Submit Button */}
            <div className="row mb-5 mt-5 align-items-center exam_time_header top-0">
              <div className="col-md-6">
                <h5 className="exam-timer">
                  {formatTime(timeLeft)} minutes left
                </h5>
              </div>
              <div className="col-md-6 text-end">
                <button
                  className="btn btn-danger"
                  onClick={() => handleSubmit(false)}
                  disabled={!allAnswered}
                >
                  Submit
                </button>
              </div>
            </div>

            {/* Questions */}
            <div className="row questions">
              {(() => {
                // Split questions evenly into two columns
                const total = questions.length;
                const mid = Math.ceil(total / 2);
                const left = questions.slice(0, mid);
                const right = questions.slice(mid);

                return (
                  <>
                    <div className="col-md-6">
                      {left.map((q, i) => (
                        <div key={i} className="mb-4 mcq">
                          <h6 className="mb-3">
                            {i + 1}. {q.question_text}
                          </h6>
                          {q.options.map((opt, j) => (
                            <div className="form-check" key={j}>
                              <input
                                className="form-check-input"
                                type="radio"
                                name={`question-${i}`}
                                id={`q${i}-opt${j}`}
                                checked={answers[i] === j}
                                onChange={() => handleOptionChange(i, j)}
                              />
                              <label
                                className="form-check-label"
                                htmlFor={`q${i}-opt${j}`}
                              >
                                {opt}
                              </label>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>

                    <div className="col-md-6">
                      {right.map((q, i) => (
                        <div key={i + mid} className="mb-4 mcq">
                          <h6 className="mb-3">
                            {i + mid + 1}. {q.question_text}
                          </h6>
                          {q.options.map((opt, j) => (
                            <div className="form-check" key={j}>
                              <input
                                className="form-check-input"
                                type="radio"
                                name={`question-${i + mid}`}
                                id={`q${i + mid}-opt${j}`}
                                checked={answers[i + mid] === j}
                                onChange={() => handleOptionChange(i + mid, j)}
                              />
                              <label
                                className="form-check-label"
                                htmlFor={`q${i + mid}-opt${j}`}
                              >
                                {opt}
                              </label>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        )}

        {/* Sidebar toggle icon for small screens */}
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

export default Exam;
