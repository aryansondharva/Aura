import React from "react";
import { Link } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";
// import aivis from "../assets/ai-assistant.png";
import AuraVisual3D from "../components/AuraVisual3D";
import AboutSection from "../components/AboutSection";
import auraLogo from "../assets/recallo.png";
import cta from "../assets/recall_cta.webp";
import chatbox from "../assets/chatbox.webp";
import documentmode from "../assets/document_mode.webp";
import history from "../assets/history.webp";
import todolist from "../assets/todolist.webp";
import topic from "../assets/topic.webp";
import studymetrics from "../assets/studymetrics.webp";
import exams from "../assets/exams.webp";
import progress from "../assets/progress.webp";
import mail from "../assets/mail.webp";
import { Link2 } from "lucide-react";

const Features = () => {
  return (
    <div className="home-container">
      <Header />
      <div className="container">
        <div className="hero">
          <div className="row">
            <div className="col-md-12">
              <div className="hero_content text-center">
                <div className="d-flex justify-content-center align-items-center mb-3">
                  <AuraVisual3D />
                </div>
                {/* <img src={aivis} alt="ai_visualiser" className="img-fluid visual_img"/> */}
                <h1 className="grad_text">Explore Our Features</h1>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* feature section */}
      <div className="container pc">
        <div className="row align-items-center g-5 pb-5">
          <div className="col-md-6">
            <div className="feature-box">
              <img
                src={auraLogo}
                alt="aura_logo"
                className="img-fluid logo logo2 mb-4"
              />
              <h4 className="grad_text mb-3"> Smart Concept Chat</h4>
              <h4 className="text-white ovr">
                Get instant, clear answers to your study questions. Aura
                understands your academic needs and responds with simple,
                educational explanations. Whether you're stuck on a topic or
                curious to learn more, just ask and let Aura guide you.
              </h4>
            </div>
          </div>
          <div className="col-md-6">
            <img
              src={chatbox}
              alt="aura_logo"
              className="img-fluid rbc rbc2"
            />
          </div>
        </div>
        <div className="row align-items-center g-5 pb-5">
          <div className="col-md-6 order-1 order-md-2">
            <div className="feature-box">
              <img
                src={auraLogo}
                alt="aura_logo"
                className="img-fluid logo logo2 mb-4"
              />
              <h4 className="grad_text mb-3">Predictive Exam Readiness AI</h4>
              <h4 className="text-white ovr">
                Upload previous exam papers, set your syllabus, and let Aura
                calculate a real-time Exam Readiness Score. Get weak-topic
                pattern analysis, AI-generated model answers, and clear pass-risk
                signals so you know exactly what to improve before exam day.
              </h4>
              <Link to="/exam-readiness" className="btn btn-cs mt-3">
                <Link2 size={16} className="me-2" />
                Open Exam Readiness AI
              </Link>
            </div>
          </div>
          <div className="col-md-6 order-2 order-md-1">
            <img
              src={exams}
              alt="exam readiness ai"
              className="img-fluid rbc rbc2"
            />
          </div>
        </div>
        <div className="row align-items-center g-5 pb-5">
          <div className="col-md-6 order-1 order-md-2">
            <div className="feature-box">
              <img
                src={auraLogo}
                alt="aura_logo"
                className="img-fluid logo logo2 mb-4"
              />
              <h4 className="grad_text mb-3"> Document Mode</h4>
              <h4 className="text-white ovr">
                Upload your study materials and let Aura handle the rest.
                From summarizing long PDFs to answering your questions based on
                uploaded files, it’s like having a personal study assistant. You
                can even upload multiple documents, Aura keeps them all in
                mind as you learn.
              </h4>
            </div>
          </div>
          <div className="col-md-6 order-2 order-md-1">
            <img
              src={documentmode}
              alt="aura_logo"
              className="img-fluid rbc rbc2"
            />
          </div>
        </div>
        <div className="row align-items-center g-5 pb-5">
          <div className="col-md-6">
            <div className="feature-box">
              <img
                src={auraLogo}
                alt="aura_logo"
                className="img-fluid logo logo2 mb-4"
              />
              <h4 className="grad_text mb-3"> Smart History Management</h4>
              <h4 className="text-white ovr">
                Stay organized with powerful chat history tools. Start fresh
                with a new chat, search through past conversations, rename,
                delete, or even continue exactly where you left off. You can
                also share insightful chats with others. Your learning, your
                way.
              </h4>
            </div>
          </div>
          <div className="col-md-6">
            <img
              src={history}
              alt="aura_logo"
              className="img-fluid rbc rbc2"
            />
          </div>
        </div>
        <div className="row align-items-center g-5 pb-5">
          <div className="col-md-6 order-1 order-md-2">
            <div className="feature-box">
              <img
                src={auraLogo}
                alt="aura_logo"
                className="img-fluid logo logo2 mb-4"
              />
              <h4 className="grad_text mb-3">
                Taskboard with Drag & Drop Simplicity
              </h4>
              <h4 className="text-white ovr">
                Organize your study goals with a Trello style taskboard. Easily
                drag and drop tasks, set descriptions, and assign date & time to
                each task. Once completed, tasks can be marked done or deleted
                making progress feel smooth and satisfying.
              </h4>
            </div>
          </div>
          <div className="col-md-6 order-2 order-md-1">
            <img
              src={todolist}
              alt="aura_logo"
              className="img-fluid rbc rbc2"
            />
          </div>
        </div>
        <div className="row align-items-center g-5 pb-5">
          <div className="col-md-6">
            <div className="feature-box">
              <img
                src={auraLogo}
                alt="aura_logo"
                className="img-fluid logo logo2 mb-4"
              />
              <h4 className="grad_text mb-3">
                {" "}
                Smart Topic Generation from Documents
              </h4>
              <h4 className="text-white ovr">
                Upload your study materials, and Aura will automatically
                extract and generate key topics. Each topic includes a summary
                for quick understanding, a "Take Exam" button to test your
                knowledge, and an "Archive" option once you've completed it.
                Stay organized and focus only on what matters most.
              </h4>
            </div>
          </div>
          <div className="col-md-6">
            <img
              src={topic}
              alt="aura_logo"
              className="img-fluid rbc rbc2"
            />
          </div>
        </div>
        <div className="row align-items-center g-5 pb-5">
          <div className="col-md-6 order-1 order-md-2">
            <div className="feature-box">
              <img
                src={auraLogo}
                alt="aura_logo"
                className="img-fluid logo logo2 mb-4"
              />
              <h4 className="grad_text mb-3">Study Metrics</h4>
              <h4 className="text-white ovr">
                Track your learning with detailed insights view total quizzes
                taken, your strong and weak topics, and detailed performance per
                topic. Access flashcards for revision, concept clarification,
                and take follow-up exams directly. Visual graph analysis helps
                pinpoint areas that need attention. Thanks to spaced repetition,
                Aura also schedules your next review date automatically to
                keep your memory fresh and focused.
              </h4>
            </div>
          </div>
          <div className="col-md-6 order-2 order-md-1">
            <img
              src={studymetrics}
              alt="aura_logo"
              className="img-fluid rbc rbc2"
            />
          </div>
        </div>
        <div className="row align-items-center g-5 pb-5">
          <div className="col-md-6">
            <div className="feature-box">
              <img
                src={auraLogo}
                alt="aura_logo"
                className="img-fluid logo logo2 mb-4"
              />
              <h4 className="grad_text mb-3">Smart Exams & Mastery Tracking</h4>
              <h4 className="text-white ovr">
                Aura generates personalized exams with 10 MCQs in 10 minutes,
                based on each topic and your skill level. You can take unlimited
                exams to improve your score and reach the mastery threshold.
                Once mastered, you'll unlock practice exams to retain your
                knowledge. With Spaced Repetition, Aura reminds you exactly
                when to retake exams helping you reinforce memory and never
                forget what you've learned.
              </h4>
            </div>
          </div>
          <div className="col-md-6">
            <img
              src={exams}
              alt="aura_logo"
              className="img-fluid rbc rbc2"
            />
          </div>
        </div>
        <div className="row align-items-center g-5 pb-5">
          <div className="col-md-6 order-1 order-md-2">
            <div className="feature-box">
              <img
                src={auraLogo}
                alt="aura_logo"
                className="img-fluid logo logo2 mb-4"
              />
              <h4 className="grad_text mb-3">
                Progress & Performance Insights
              </h4>
              <h4 className="text-white ovr">
                After each exam, Aura shows your score, detailed answer
                analysis with explanations, and visual graph insights of your
                exam attempts. Track how many times you've attempted a topic,
                understand your mistakes, and monitor your progress over time
                all in one place.
              </h4>
            </div>
          </div>
          <div className="col-md-6 order-2 order-md-1">
            <img
              src={progress}
              alt="aura_logo"
              className="img-fluid rbc rbc2"
            />
          </div>
        </div>
        <div className="row align-items-center g-5 pb-5">
          <div className="col-md-6">
            <div className="feature-box">
              <img
                src={auraLogo}
                alt="aura_logo"
                className="img-fluid logo logo2 mb-4"
              />
              <h4 className="grad_text mb-3">Smart Email Notifications</h4>
              <h4 className="text-white ovr">
                Stay on track with Aura's intelligent email system. After
                each quiz, you’ll receive an email with your score, status
                update, and the next review date. Our spaced repetition
                scheduler also sends timely reminders to help you revisit topics
                and take exams on the right day so forgetting becomes a thing of
                the past.
              </h4>
            </div>
          </div>
          <div className="col-md-6">
            <img src={mail} alt="aura_logo" className="img-fluid rbc rbc2" />
          </div>
        </div>
      </div>

      {/* cta */}
      <div className="container pc" id="cta">
        <div className="row text-center">
          <img
            src={cta}
            alt="aura_logo"
            className="img-fluid rbc rbc2 rbc3"
          />
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Features;
