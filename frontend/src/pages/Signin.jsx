import "../index.css";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import supabase from "../utils/supabaseClient";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import Header from "../components/Header";

export default function SignIn() {
  const [session, setSession] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        localStorage.setItem("userToken", session.access_token);
        localStorage.setItem("userId", session.user.id);
        navigate("/chat");
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        localStorage.setItem("userToken", session.access_token);
        localStorage.setItem("userId", session.user.id);
        navigate("/chat");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const signout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) console.error("Error signing out:", error.message);
    localStorage.removeItem("userToken");
    localStorage.removeItem("userId");
    navigate("/signin");
  };

  if (!session) {
    return (
      <div className="home-container dev-page">
        <Header />

        <section className="dev-hero">
          {/* ambient orbs */}
          <div className="dev-orb" style={{ width: 420, height: 420, top: "5%", left: "-8%", background: "radial-gradient(circle, #edb43722, transparent 70%)", animationDuration: "14s" }} />
          <div className="dev-orb" style={{ width: 300, height: 300, top: "20%", right: "-5%", background: "radial-gradient(circle, #e49c0018, transparent 70%)", animationDuration: "10s", animationDelay: "3s" }} />
          <div className="dev-orb" style={{ width: 200, height: 200, bottom: "10%", left: "40%", background: "radial-gradient(circle, #edb43712, transparent 70%)", animationDuration: "18s", animationDelay: "1s" }} />

          <div className="dev-hero-inner">
            <div className="dev-badge-pill">✦ Authentication</div>
            <h1 className="dev-hero-title">
              Welcome to <span className="grad_text">Aura</span>
            </h1>
            <p className="dev-hero-sub">
              Sign in to continue your journey and unlock AI-powered learning.
            </p>

            {/* Login card */}
            <div className="dev-card-wrapper" style={{ width: "100%", maxWidth: "420px", marginTop: "20px" }}>
              <div className="dev-card" style={{ padding: "40px 30px", display: "block" }}>
                {/* glow ring */}
                <div className="dev-card-glow" style={{ "--glow": "#edb437" }} />
                {/* top accent bar */}
                <div className="dev-card-accent" style={{ background: `linear-gradient(90deg, #edb43788, transparent)` }} />
                
                <div className="auth-card" style={{ position: "relative", zIndex: 1 }}>
                  <Auth
                    supabaseClient={supabase}
                    appearance={{ 
                      theme: ThemeSupa,
                      variables: {
                        default: {
                          colors: {
                            brand: '#edb437',
                            brandAccent: '#e49c00',
                            inputText: 'white',
                            inputBackground: 'rgba(255,255,255,0.06)',
                            inputBorder: 'rgba(255,255,255,0.1)',
                            messageText: 'white',
                            messageTextDanger: '#dc3545',
                            anchorTextColor: 'rgba(255,255,255,0.7)',
                            dividerBackground: 'rgba(255,255,255,0.1)',
                            inputLabelText: 'rgba(255,255,255,0.7)',
                            defaultButtonBackground: 'rgba(255,255,255,0.05)',
                            defaultButtonBackgroundHover: 'rgba(255,255,255,0.1)',
                            defaultButtonBorder: 'rgba(255,255,255,0.1)',
                            defaultButtonText: 'white',
                          }
                        }
                      }
                    }}
                    providers={["google", "github"]}
                    redirectTo={window.location.origin + "/signin"}
                  />
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  } else {
    return (
      <div className="home-container dev-page">
        <Header />

        <section className="dev-hero">
          {/* ambient orbs */}
          <div className="dev-orb" style={{ width: 420, height: 420, top: "5%", left: "-8%", background: "radial-gradient(circle, #edb43722, transparent 70%)", animationDuration: "14s" }} />
          <div className="dev-orb" style={{ width: 300, height: 300, top: "20%", right: "-5%", background: "radial-gradient(circle, #e49c0018, transparent 70%)", animationDuration: "10s", animationDelay: "3s" }} />

          <div className="dev-hero-inner">
            <div className="dev-badge-pill">✦ Welcome Back</div>
            <h1 className="dev-hero-title">
              Already <span className="grad_text">Logged In</span>
            </h1>

            {/* Profile card instead of generic auth card */}
            <div className="dev-card-wrapper" style={{ width: "100%", maxWidth: "420px", marginTop: "20px" }}>
              <div className="dev-card" style={{ padding: "40px", display: "block", textAlign: "center" }}>
                <div className="dev-card-glow" style={{ "--glow": "#edb437" }} />
                <div className="dev-card-accent" style={{ background: `linear-gradient(90deg, #edb43788, transparent)` }} />
                
                <div style={{ position: "relative", zIndex: 1 }}>
                  <p style={{ color: "rgba(255,255,255,0.8)", marginBottom: "20px", fontSize: "1.05rem" }}>
                    You are logged in as <strong style={{ color: "#edb437" }}>{session.user.email}</strong>.
                    Explore features and continue your learning journey.
                  </p>
                  <button onClick={signout} className="auth-button" style={{ 
                    width: '100%', 
                    padding: '10px 15px', 
                    borderRadius: '5px',
                    backgroundColor: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: 'white',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    marginTop: '10px'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)';
                  }}>
                    Sign Out
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  }
}
