import React from "react";
// import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Link } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";
import RecalloVisual3D from "../components/RecalloVisual3D";
import AboutSection from "../components/AboutSection";
import cta from "../assets/recall_cta.webp";
import galib from "../assets/galib.webp";
import ziad from "../assets/ziad.webp";
import faruq from "../assets/faruq.webp";

const Developers = () => {
  // const [expanded, setExpanded] = useState({
  //   ziad: false,
  //   galib: false,
  //   omor: false,
  // });

  // const toggleExpand = (key) => {
  //   setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  // };
  return (
    <div className="home-container">
      <Header />
      <div className="container">
        <div className="hero">
          <div className="row">
            <div className="col-md-12">
              <div className="hero_content text-center">
                <div className="d-flex justify-content-center align-items-center mb-3">
                  <RecalloVisual3D />
                </div>
                {/* <img src={aivis} alt="ai_visualiser" className="img-fluid visual_img"/> */}
                <h1 className="grad_text">Meet the Team</h1>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* developer */}
      <div className="container pc">
        <div className="row align-items-center g-5 pb-5">
          <div className="col-md-12 text-center about_section p-0">
            <h3 className="grad_text"> Developers</h3>
            <h2 className="mb-2 mt-2">Group Name: Teapot 410</h2>
          </div>
        </div>
        <div className="row g-4">
          {/* ZIAD */}
          <div className="col-md-4">
            <div className="ft_box dev_box">
              <img src={ziad} alt="recallo_logo" className="img-fluid rbc" />
              <h4>Wahidul Islam Ziad</h4>
              <p>
                Email:{" "}
                <a href="mailto:wahidul.islam.ziad@gmail.com">
                  <span className="grad_text">
                    wahidul.islam.ziad@gmail.com
                  </span>
                </a>
              </p>
              {/* <p>ID: 2231985642</p> */}
              {/* <button
                className="btn btn-sm btn-outline w-100 p-0 d-flex justify-content-between align-items-center text-white mt-2"
                onClick={() => toggleExpand("ziad")}
              >
                More Info{" "}
                {expanded.ziad ? (
                  <ChevronUp size={16} />
                ) : (
                  <ChevronDown size={16} />
                )}
              </button>
              {expanded.ziad && (
                <ul className="list-group dev_cont">
                  <li>Upload PDF Backend Logic</li>
                  <li>
                    Ask Route: Summary Generation, Practice Question Generation,
                    Answer Questions from PDF
                  </li>
                  <li>Topic Generation Backend Logic: Chunking + Clustering</li>
                  <li>Question Generation + Matching Answer Backend Logic</li>
                  <li>Spaced Repetition Model Training</li>
                  <li>Spaced Repetition Date Generation</li>
                  <li>
                    Automatic Weak Topic Update Based on Spaced Repetition Dates
                  </li>
                  <li>Flashcard Generation Backend Logic</li>
                  <li>Instant Email Notification After Exam</li>
                </ul>
              )} */}
            </div>
          </div>

          {/* GALIB */}
          <div className="col-md-4">
            <div className="ft_box dev_box">
              <img src={galib} alt="recallo_logo" className="img-fluid rbc" />
              <h4>Abdur Rahman Galib</h4>
              <p>
                Email:{" "}
                <a href="mailto:abdur.galib@northsouth.edu">
                  <span className="grad_text">abdur.galib@northsouth.edu</span>
                </a>
              </p>
              {/* <p>ID: 2231208642</p> */}
              {/* <button
                className="btn btn-sm btn-outline w-100 p-0 d-flex justify-content-between align-items-center text-white mt-2"
                onClick={() => toggleExpand("galib")}
              >
                More Info{" "}
                {expanded.galib ? (
                  <ChevronUp size={16} />
                ) : (
                  <ChevronDown size={16} />
                )}
              </button>
              {expanded.galib && (
                <ul className="list-group dev_cont">
                  <li>Notification Scheduler</li>
                  <li>Settings</li>
                  <li>Progress Page with Mark History</li>
                  <li>Chat History Feature</li>
                  <li>User-Based Profile</li>
                  <li>Responsiveness</li>
                  <li>Authentication System</li>
                  <li>Sign-Up System</li>
                  <li>Initial Database</li>
                </ul>
              )} */}
            </div>
          </div>

          {/* OMOR */}
          <div className="col-md-4">
            <div className="ft_box dev_box">
              <img src={faruq} alt="recallo_logo" className="img-fluid rbc" />
              <h4>Omor Faruq</h4>
              <p>
                Email:{" "}
                <a href="mailto:mohammed.faruq@northsouth.edu">
                  <span className="grad_text">
                    mohammed.faruq@northsouth.edu
                  </span>
                </a>
              </p>
              {/* <p>ID: 2231568642</p> */}
              {/* <button
                className="btn btn-sm btn-outline w-100 p-0 d-flex justify-content-between align-items-center text-white mt-2"
                onClick={() => toggleExpand("omor")}
              >
                More Info{" "}
                {expanded.omor ? (
                  <ChevronUp size={16} />
                ) : (
                  <ChevronDown size={16} />
                )}
              </button>
              {expanded.omor && (
                <ul className="list-group dev_cont">
                  <li>Overall Design and Page Structure for Recallo</li>
                  <li>Chat Interface Integration</li>
                  <li>Buffer Memory System for Persistent AI Context</li>
                  <li>Trello-Style To-Do List for Study Management</li>
                  <li>Topic Page Implementation with Dynamic Rendering</li>
                  <li>Topic Summary Generation and Display</li>
                  <li>Exam Page with Questions Fetched from the Database</li>
                  <li>Submit Answer Functionality and Result Handling</li>
                  <li>Study Metrics with Key Performance Features</li>
                  <li>Graphical Analysis for Study Metrics and Progress</li>
                  <li>Progress Page with Detailed Answer Analysis</li>
                </ul>
              )} */}
            </div>
          </div>
        </div>
      </div>

      {/* cta */}
      <div className="container pc" id="cta">
        <div className="row text-center">
          <img
            src={cta}
            alt="recallo_logo"
            className="img-fluid rbc rbc2 rbc3"
          />
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Developers;
