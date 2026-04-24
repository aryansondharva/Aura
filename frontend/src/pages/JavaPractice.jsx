import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BookOpenCheck,
  Code2,
  EqualApproximately,
  Filter,
  GraduationCap,
  LoaderCircle,
  MessageSquareQuote,
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
  javaPracticeUnits,
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

  const [selectedUnit, setSelectedUnit] = useState("All");
  const [selectedDifficulty, setSelectedDifficulty] = useState("All");
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const [javaAnswer, setJavaAnswer] = useState("");
  const [answerSources, setAnswerSources] = useState([]);
  const [askError, setAskError] = useState("");

  const filteredUnits = useMemo(() => {
    return javaPracticeUnits.filter((unit) => {
      const matchesUnit = selectedUnit === "All" || unit.unit === selectedUnit;
      const matchesDifficulty =
        selectedDifficulty === "All" ||
        unit.difficulty === selectedDifficulty;

      return matchesUnit && matchesDifficulty;
    });
  }, [selectedDifficulty, selectedUnit]);

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
                Practice Java the way GTU students actually revise
              </h1>
              <p className="java-hero-text">
                Unit-wise drills, viva prompts, code snippets, and a simple
                weekly plan so Aura becomes more useful for semester practice,
                not just uploaded PDFs.
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
                <button
                  className="btn btn-outline-light"
                  onClick={() => navigate("/chat")}
                >
                  Ask Aura for Help
                </button>
              </div>
            </div>

            <div className="java-hero-panel">
              <div className="java-panel-card">
                <div className="java-panel-top">
                  <Sparkles size={18} />
                  <span>Current Focus</span>
                </div>
                <h3>Java Programming - `3140705`</h3>
                <p>Semester 4 friendly practice flow with theory + coding balance.</p>
              </div>
              <div className="java-panel-card subtle">
                <div className="java-panel-top">
                  <BookOpenCheck size={18} />
                  <span>Recommended Today</span>
                </div>
                <p>
                  Revise Unit 3 and answer one thread-synchronization question
                  before attempting a mock test.
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

          <section className="java-filter-bar mb-4">
            <div className="java-filter-title">
              <Filter size={18} />
              <span>Filter practice tracks</span>
            </div>
            <div className="java-filter-controls">
              <select
                className="form-select"
                value={selectedUnit}
                onChange={(e) => setSelectedUnit(e.target.value)}
              >
                <option value="All">All Units</option>
                <option value="Unit 1">Unit 1</option>
                <option value="Unit 2">Unit 2</option>
                <option value="Unit 3">Unit 3</option>
                <option value="Unit 4">Unit 4</option>
                <option value="Unit 5">Unit 5</option>
              </select>
              <select
                className="form-select"
                value={selectedDifficulty}
                onChange={(e) => setSelectedDifficulty(e.target.value)}
              >
                <option value="All">All Levels</option>
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
              </select>
            </div>
          </section>

          <section className="row g-4 mb-5">
            {filteredUnits.map((unit) => (
              <div className="col-12" key={unit.id}>
                <article className="java-unit-card">
                  <div className="java-unit-head">
                    <div>
                      <span className="java-unit-chip">{unit.unit}</span>
                      <h2>{unit.title}</h2>
                      <p>{unit.whyItMatters}</p>
                    </div>
                    <div className="java-unit-meta">
                      <span>{unit.semester}</span>
                      <span>{unit.subjectCode}</span>
                      <span>{unit.difficulty}</span>
                      <span>{unit.examWeight} weight</span>
                    </div>
                  </div>

                  <div className="row g-3">
                    <div className="col-lg-4">
                      <div className="java-detail-card">
                        <div className="java-detail-label">
                          <BookOpenCheck size={16} />
                          Key Concepts
                        </div>
                        <ul>
                          {unit.concepts.map((concept) => (
                            <li key={concept}>{concept}</li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="col-lg-4">
                      <div className="java-detail-card">
                        <div className="java-detail-label">
                          <Code2 size={16} />
                          Practice Prompts
                        </div>
                        <ul>
                          {unit.practice.map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="col-lg-4">
                      <div className="java-detail-card">
                        <div className="java-detail-label">
                          <MessageSquareQuote size={16} />
                          Viva Ready
                        </div>
                        <ul>
                          {unit.viva.map((question) => (
                            <li key={question}>{question}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div className="java-code-block mt-3">
                    <div className="java-code-head">Reference Snippet</div>
                    <pre>{unit.snippet}</pre>
                  </div>
                </article>
              </div>
            ))}
          </section>

          <section className="java-plan-card mb-5">
            <div className="java-plan-head">
              <h2>Your OOP Study Pack</h2>
              <p>
                These cards are based on the `OBJECT ORIENTED PROGRAMMING`
                folder you added in the project workspace.
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
              <h2>5-Day Quick Revision Plan</h2>
              <p>
                Use this before internals, viva, or a GTU mock to keep practice
                structured.
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
              <h2>Assignments and Exam Practice</h2>
              <p>
                This is the practical part of the folder. It can later be wired
                into quizzes, mock tests, and assignment-based trackers.
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
