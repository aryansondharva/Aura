import React, { useEffect, useRef, useState } from "react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import cta from "../assets/recall_cta.webp";
import aryan from "../assets/aryan.webp";
import faruq from "../assets/faruq.webp";

/* ─── team data ─────────────────────────────────────────── */
const TEAM = [
  {
    name: "Hetvi Lad",
    role: "UI / UX Designer",
    email: "hlad.2317@gmail.com",
    specialty: "Crafting beautiful, intuitive experiences",
    img: faruq,
    color: "#edb437",
    initials: "HL",
    github: "#",
    linkedin: "#",
  },
  {
    name: "Aryan Sondharva",
    role: "Full-Stack Engineer",
    email: "aryansondharva25@gmail.com",
    specialty: "Building scalable, AI-powered systems",
    img: aryan,
    color: "#e49c00",
    initials: "AS",
    github: "https://github.com/aryansondharva",
    linkedin: "#",
  },
  {
    name: "Manthan Rajpurohit",
    role: "Backend Engineer",
    email: "rajpurohitmanthan5@gmail.com",
    specialty: "Designing robust APIs & databases",
    img: faruq,
    color: "#c87d00",
    initials: "MR",
    github: "#",
    linkedin: "#",
  },
  {
    name: "Dhara Patel",
    role: "AI / ML Engineer",
    email: "developer4@gmail.com",
    specialty: "Integrating intelligence into products",
    img: faruq,
    color: "#f5c346",
    initials: "DP",
    github: "#",
    linkedin: "#",
  },
];

/* ─── floating orb component ────────────────────────────── */
const FloatingOrb = ({ style }) => (
  <div className="dev-orb" style={style} />
);

/* ─── stat counter ───────────────────────────────────────── */
const StatItem = ({ value, label, delay }) => {
  const [count, setCount] = useState(0);
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        let start = 0;
        const end = value;
        const step = Math.ceil(end / 40);
        const timer = setInterval(() => {
          start += step;
          if (start >= end) { setCount(end); clearInterval(timer); }
          else setCount(start);
        }, 40);
        observer.disconnect();
      }
    }, { threshold: 0.3 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [value]);

  return (
    <div ref={ref} className="dev-stat" style={{ animationDelay: `${delay}ms` }}>
      <span className="dev-stat-value">{count}+</span>
      <span className="dev-stat-label">{label}</span>
    </div>
  );
};

/* ─── developer card ─────────────────────────────────────── */
const DevCard = ({ dev, idx }) => {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="dev-card-wrapper"
      style={{ animationDelay: `${idx * 120}ms` }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className={`dev-card ${hovered ? "dev-card--hovered" : ""}`}>
        {/* glow ring */}
        <div className="dev-card-glow" style={{ "--glow": dev.color }} />

        {/* top accent bar */}
        <div className="dev-card-accent" style={{ background: `linear-gradient(90deg, ${dev.color}88, transparent)` }} />

        {/* avatar */}
        <div className="dev-avatar-wrap">
          <img
            src={dev.img}
            alt={dev.name}
            className="dev-avatar"
            onError={e => { e.target.style.display = "none"; e.target.nextSibling.style.display = "flex"; }}
          />
          <div className="dev-avatar-fallback" style={{ background: `linear-gradient(135deg, ${dev.color}, #1a1a1a)` }}>
            <span>{dev.initials}</span>
          </div>
          <div className="dev-avatar-ring" style={{ borderColor: dev.color }} />
        </div>

        {/* info */}
        <div className="dev-info">
          <span className="dev-role-badge" style={{ borderColor: `${dev.color}66`, color: dev.color }}>
            {dev.role}
          </span>
          <h3 className="dev-name">{dev.name}</h3>
          <p className="dev-specialty">{dev.specialty}</p>
        </div>

        {/* reveal section */}
        <div className={`dev-reveal ${hovered ? "dev-reveal--show" : ""}`}>
          <a href={`mailto:${dev.email}`} className="dev-email-link">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
            {dev.email}
          </a>
          <div className="dev-socials">
            <a href={dev.github} className="dev-social-btn" target="_blank" rel="noreferrer" aria-label="GitHub">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z" />
              </svg>
            </a>
            <a href={dev.linkedin} className="dev-social-btn" target="_blank" rel="noreferrer" aria-label="LinkedIn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ─── page component ─────────────────────────────────────── */
const Developers = () => (
  <div className="home-container dev-page">
    <Header />

    {/* ── HERO ── */}
    <section className="dev-hero">
      {/* ambient orbs */}
      <FloatingOrb style={{ width: 420, height: 420, top: "5%", left: "-8%", background: "radial-gradient(circle, #edb43722, transparent 70%)", animationDuration: "14s" }} />
      <FloatingOrb style={{ width: 300, height: 300, top: "20%", right: "-5%", background: "radial-gradient(circle, #e49c0018, transparent 70%)", animationDuration: "10s", animationDelay: "3s" }} />
      <FloatingOrb style={{ width: 200, height: 200, bottom: "10%", left: "40%", background: "radial-gradient(circle, #edb43712, transparent 70%)", animationDuration: "18s", animationDelay: "1s" }} />

      <div className="dev-hero-inner">
        <div className="dev-badge-pill">✦ TechAssasin Studio</div>
        <h1 className="dev-hero-title">
          Meet the <span className="grad_text">Minds</span> Behind Aura
        </h1>
        <p className="dev-hero-sub">
          Four engineers obsessed with building tools that make learning feel effortless — powered by AI, crafted with care.
        </p>

        {/* stats row */}
        <div className="dev-stats-row">
          <StatItem value={4}   label="Team Members"    delay={0}   />
          <StatItem value={12}  label="Features Built"  delay={150} />
          <StatItem value={1}   label="AI Platform"     delay={300} />
          <StatItem value={500} label="Lines of Code K" delay={450} />
        </div>
      </div>
    </section>

    {/* ── CARDS ── */}
    <section className="dev-cards-section">
      <div className="dev-section-label">
        <span className="dev-section-line" />
        <span>The Team</span>
        <span className="dev-section-line" />
      </div>
      <div className="dev-cards-grid">
        {TEAM.map((dev, i) => (
          <DevCard key={dev.email} dev={dev} idx={i} />
        ))}
      </div>
    </section>

    {/* ── CTA BANNER ── */}
    <div className="container pc" id="cta">
      <div className="row text-center">
        <img src={cta} alt="aura_cta" className="img-fluid rbc rbc2 rbc3" />
      </div>
    </div>

    <Footer />
  </div>
);

export default Developers;
