import React from "react";
import { useNavigate } from "react-router-dom";
import { EqualApproximately, FileText, GraduationCap } from "lucide-react";
import Sidebar from "../components/Sidebar";
import History from "../components/History";
import useSession from "../utils/useSession";
import { javaSevenMarksSet } from "../data/javaSevenMarks";

const SevenMarksJava = () => {
  const {
    isLoggedIn,
    userId,
    isSidebarOpen,
    isHistoryOpen,
    toggleSidebar,
    toggleHistory,
  } = useSession();
  const navigate = useNavigate();

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
          <section className="java-simple-header mb-4">
            <div className="java-header-row">
              <div>
                <span className="java-hero-pill mb-2">
                  <GraduationCap size={14} />
                  GTU 7 Marks
                </span>
                <h1 className="java-hero-title">7 Marks Java Paper</h1>
                <p className="java-page-subtitle">
                  Word-paper style answers for OOP (Subject Code 3140705).
                </p>
              </div>

              <div className="java-header-actions">
                <button
                  className="btn btn-cs btn-sm"
                  onClick={() => navigate("/java-practice")}
                >
                  Ask Aura
                </button>
                <button
                  className="btn btn-outline-light btn-sm"
                  onClick={() => navigate("/java-important-pdfs")}
                >
                  PDFs
                </button>
              </div>
            </div>
          </section>

          <section className="java-paper-shell">
            <div className="java-paper-meta">
              <span>GIDC DEGREE ENGINEERING COLLEGE</span>
              <span>Object Oriented Programming (3140705)</span>
              <span>Question Bank: 7 Marks</span>
            </div>

            {javaSevenMarksSet.map((item, index) => (
              <article className="java-paper-question" key={item.id}>
                <header className="java-paper-qhead">
                  <div className="java-detail-label">
                    <FileText size={15} />
                    <span>Q.{index + 1}</span>
                  </div>
                  <span className="java-paper-marks">{item.marks} Marks</span>
                </header>

                <h3 className="java-paper-title">{item.title}</h3>

                <div className="java-paper-answer">
                  {item.body.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}

                  <ul>
                    {item.points.map((point) => (
                      <li key={point}>{point}</li>
                    ))}
                  </ul>

                  <div className="java-code-shell">
                    <div className="java-code-head">JAVA</div>
                    <pre className="java-code-pre">
                      <code>{item.code}</code>
                    </pre>
                  </div>

                  <div className="java-code-shell">
                    <div className="java-code-head">OUTPUT</div>
                    <pre className="java-code-pre">
                      <code>{item.output}</code>
                    </pre>
                  </div>
                </div>
              </article>
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

export default SevenMarksJava;
