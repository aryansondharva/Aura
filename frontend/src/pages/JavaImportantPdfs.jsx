import React from "react";
import { useNavigate } from "react-router-dom";
import { Download, EqualApproximately, FileText, LibraryBig } from "lucide-react";
import Sidebar from "../components/Sidebar";
import History from "../components/History";
import useSession from "../utils/useSession";
import { javaResourcePack } from "../data/javaPractice";

const JavaImportantPdfs = () => {
  const {
    isLoggedIn,
    userId,
    isSidebarOpen,
    isHistoryOpen,
    toggleSidebar,
    toggleHistory,
  } = useSession();
  const navigate = useNavigate();

  const getDownloadUrl = (fileName) =>
    `${import.meta.env.VITE_BACKEND_URL}/api/java-practice/download/${encodeURIComponent(fileName)}`;

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
                  <LibraryBig size={14} />
                  Java Library
                </span>
                <h1 className="java-hero-title">Important PDFs</h1>
                <p className="java-page-subtitle">
                  Core notes and GTU paper for fast revision.
                </p>
              </div>
              <div className="java-header-actions">
                <button
                  className="btn btn-outline-light btn-sm"
                  onClick={() => navigate("/java-practice")}
                >
                  JAVA
                </button>
                <button
                  className="btn btn-cs btn-sm"
                  onClick={() => navigate("/java-assignments")}
                >
                  Assignments
                </button>
              </div>
            </div>
          </section>

          <section className="java-plan-card">
            <div className="row g-3 java-library-grid">
              {javaResourcePack.map((item) => (
                <div className="col-md-6 col-xl-4" key={item.fileName}>
                  <article className="java-doc-card">
                    <div className="java-doc-top">
                      <span className="java-doc-type">{item.type}</span>
                    </div>
                    <div className="java-detail-label">
                      <FileText size={16} />
                      Important material
                    </div>
                    <h3>{item.title}</h3>
                    <p>{item.use}</p>
                    <div className="java-file-tag">{item.fileName}</div>
                    <a
                      className="btn btn-cs btn-sm java-download-btn"
                      href={getDownloadUrl(item.fileName)}
                      download
                    >
                      <Download size={14} /> Download PDF
                    </a>
                  </article>
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

export default JavaImportantPdfs;
