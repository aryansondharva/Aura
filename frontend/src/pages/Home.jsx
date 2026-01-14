import React from "react";
import { Link } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";
// import aivis from "../assets/ai-assistant.png";
import RecalloVisual3D from "../components/RecalloVisual3D";
import AboutSection from "../components/AboutSection";
import recalloLogo from "../assets/recallo.png";
import recallo_banner from "../assets/recallo_banner.webp";
import cta from "../assets/recall_cta.webp"
import {
  BrainCircuit,
  ScanSearch,
  BookOpenCheck,
  LandPlot,
  ChartSpline,
  Microchip,
} from "lucide-react";

const Home = () => {
  return (
    <div className="home-container">
      <Header />
      <div className="container">
        <div className="hero banner">
          <div className="row">
            <div className="col-md-12">
              <div className="hero_content text-center">
                <div className="d-flex justify-content-center align-items-center mb-3">
                  <RecalloVisual3D />
                </div>
                {/* <img src={aivis} alt="ai_visualiser" className="img-fluid visual_img"/> */}
                <h1 className="grad_text">
                  Recallo: Your AI Study Partner for Smarter Retention
                </h1>
                <p className="pt-4 pb-4">
                  Recallo is an AI-driven learning companion that enhances
                  memory retention through personalized spaced repetition and
                  intelligent recall strategies perfect for students,
                  professionals, and lifelong learners.
                </p>
                <div className="hero_button">
                  <Link to="/chat" className="btn btn-cs me-3">
                    Go to Recallo
                  </Link>
                  <Link to="/signin" className="btn btn-cs me-3">
                    Sign Up Today
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* about section */}
      <div className="container pc" id="about">
        <div className="row align-items-center g-5">
          <div className="col-md-10 m-auto">
            <AboutSection />
          </div>
          <div className="col-md-12 col-xl-6">
            <img
              src={recalloLogo}
              alt="recallo_logo"
              className="img-fluid logo mb-4"
            />

            <h4 className="text-white ovr">
              Leveraging advanced spaced repetition and adaptive memory
              techniques, Recallo helps students and lifelong learners identify{" "}
              <span className="hl">what topics they struggle with</span> and
              provides personalized, interactive reminders whether through
              quizzes, visuals, or bite sized notes.{" "}
              <span className="hl">Say goodbye to cramming and guesswork.</span>{" "}
              Recallo makes your study sessions smarter, more focused, and less
              stressful by ensuring you{" "}
              <span className="hl">
                review the right material at the right time.
              </span>
            </h4>
          </div>
          <div className="col-md-12 col-xl-6">
            <img
              src={recallo_banner}
              alt="recallo_logo"
              className="img-fluid rbc"
            />
          </div>
        </div>
      </div>

      {/* feature */}
      <div className="container pc" id="features">
        <div className="row align-items-center">
          <div className="col-md-12 text-center about_section">
            <h3 className="grad_text"> Core Features</h3>
            <h2 className="mb-2 mt-2">
              Unlock your academic potential with tools designed to personalize,
              analyze, and optimize your learning journey.
            </h2>
          </div>
        </div>
        <div className="row g-4">
          <div className="col-md-6 col-xl-4">
            <div className="ft_box">
              <Microchip size={50} color="#fff" />
              <h4>AI-Powered Study Chat</h4>
              <p>
                Ask anything, anytime. Get instant help through your own
                personalized study assistant.
              </p>
            </div>
          </div>
          <div className="col-md-6 col-xl-4">
            <div className="ft_box">
              <ScanSearch size={50} color="#fff" />
              <h4>Smart Flashcards & Answer Review</h4>
              <p>
                Review mistakes and strengthen memory with flashcards and
                detailed answer breakdowns after each quiz.
              </p>
            </div>
          </div>
          <div className="col-md-6 col-xl-4">
            <div className="ft_box">
              <BookOpenCheck size={50} color="#fff" />
              <h4>Tailored Practice Exams</h4>
              <p>
                Take quizzes designed around your weak points to focus on what
                needs improvement most.
              </p>
            </div>
          </div>
          <div className="col-md-6 col-xl-4">
            <div className="ft_box">
              <LandPlot size={50} color="#fff" />
              <h4>StudyMetrics Dashboard</h4>
              <p>
                Track your learning journey with real-time stats, recent
                activity, and progress summaries.
              </p>
            </div>
          </div>
          <div className="col-md-6 col-xl-4">
            <div className="ft_box">
              <ChartSpline size={50} color="#fff" />
              <h4>Graph-Based Performance Insights</h4>
              <p>
                Visualize your growth and topic mastery with clean, intuitive
                charts and graphs.
              </p>
            </div>
          </div>
          <div className="col-md-6 col-xl-4">
            <div className="ft_box">
              <BrainCircuit size={50} color="#fff" />
              <h4>Spaced Repetition System</h4>
              <p>
                Master topics long-term with intelligent review scheduling based
                on your forgetting curve.
              </p>
            </div>
          </div>
          <div className="col-md-12 text-center">
            <Link to="/features" className="btn btn-cs me-3">
              See All Features
            </Link>
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

export default Home;
