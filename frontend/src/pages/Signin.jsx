import "../index.css";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import supabase from "../utils/supabaseClient";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import Header from "../components/Header";
import axios from "axios";

const API_URL = "http://localhost:5000/api";

export default function SignIn() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authMode, setAuthMode] = useState("signin"); // 'signin' or 'signup'
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [step, setStep] = useState("mobile"); // 'mobile' or 'otp'
  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [verifyingLoader, setVerifyingLoader] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        checkVerification(session.user.id, session.access_token);
      } else {
        setLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        checkVerification(session.user.id, session.access_token);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const checkVerification = async (userId, token) => {
    try {
      localStorage.setItem("userToken", token);
      localStorage.setItem("userId", userId);
      
      const response = await axios.get(`${API_URL}/user/${userId}`);
      if (response.data && response.data.mobile) {
        navigate("/chat");
      } else {
        setIsVerifying(true);
      }
    } catch (err) {
      console.error("Verification check failed:", err);
      setIsVerifying(true);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setVerifyingLoader(true);
    setError("");
    try {
      if (authMode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        // Sign Up
        const { data, error } = await supabase.auth.signUp({ 
          email, 
          password
        });
        if (error) throw error;
        
        // Immediately send OTP using the email
        try {
          const userId = data.user?.id;
          if (userId) {
            localStorage.setItem("userId", userId);
            
            await axios.post(`${API_URL}/user/send-email-otp`, {
              userId: userId,
              email: email
            });
            
            setIsVerifying(true);
            setStep("otp");
          }
        } catch (otpErr) {
          console.error("Auto-OTP failed:", otpErr);
          setError("Account created, but failed to send verification email. Please check your inbox or try 'Log In'.");
        }
      }
    } catch (err) {
      setError(err.message || "Authentication failed");
    } finally {
      setVerifyingLoader(false);
    }
  };

  const handleOAuth = async (provider) => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: window.location.origin + "/signin" }
      });
      if (error) throw error;
    } catch (err) {
      setError(`Failed to connect with ${provider}`);
    }
  };

  const handleSendOtp = async (e, isResend = false) => {
    if (e) e.preventDefault();
    setVerifyingLoader(true);
    setError("");
    try {
      // Use email OTP route if we don't have a mobile number yet (SignUp flow)
      if (email && !mobile) {
        await axios.post(`${API_URL}/user/send-email-otp`, {
          userId: session?.user?.id || localStorage.getItem("userId"),
          email: email
        });
      } else {
        await axios.post(`${API_URL}/user/send-otp`, {
          userId: session?.user?.id || localStorage.getItem("userId"),
          mobile
        });
      }
      setStep("otp");
      if (isResend) alert("Verification code resent!");
    } catch (err) {
      setError(err.response?.data?.error || "Failed to send OTP. Please try again.");
    } finally {
      setVerifyingLoader(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setVerifyingLoader(true);
    setError("");
    try {
      await axios.post(`${API_URL}/user/verify-otp`, {
        userId: session?.user?.id || localStorage.getItem("userId"),
        otp
      });
      navigate("/chat");
    } catch (err) {
      setError(err.response?.data?.error || "Invalid OTP. Please try again.");
    } finally {
      setVerifyingLoader(false);
    }
  };

  const signout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) console.error("Error signing out:", error.message);
    localStorage.removeItem("userToken");
    localStorage.removeItem("userId");
    setSession(null);
    setIsVerifying(false);
    setStep("mobile");
    navigate("/signin");
  };

  if (loading) {
    return (
      <div className="home-container dev-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="home-container dev-page">
        <Header />

        <section className="dev-hero">
          <div className="dev-orb" style={{ width: 420, height: 420, top: "5%", left: "-8%", background: "radial-gradient(circle, #edb43722, transparent 70%)", animationDuration: "14s" }} />
          <div className="dev-orb" style={{ width: 300, height: 300, top: "20%", right: "-5%", background: "radial-gradient(circle, #e49c0018, transparent 70%)", animationDuration: "10s", animationDelay: "3s" }} />

          <div className="dev-hero-inner">
            <div className="dev-badge-pill">✦ Authentication</div>
            <h1 className="dev-hero-title">
              Welcome to <span className="grad_text">Aura</span>
            </h1>
            <p className="dev-hero-sub">
              Sign in to continue your journey and unlock AI-powered learning.
            </p>

            <div className="dev-card-wrapper" style={{ width: "100%", maxWidth: "420px", marginTop: "20px" }}>
              <div className="dev-card" style={{ padding: "40px 30px", display: "block" }}>
                <div className="dev-card-glow" style={{ "--glow": "#edb437" }} />
                <div className="dev-card-accent" style={{ background: `linear-gradient(90deg, #edb43788, transparent)` }} />
                
                <div style={{ position: "relative", zIndex: 1 }}>
                  {/* Tabs */}
                  <div style={{ display: "flex", gap: "20px", marginBottom: "30px", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                    <button 
                      onClick={() => setAuthMode("signin")}
                      style={{ 
                        background: "none", border: "none", color: authMode === "signin" ? "#edb437" : "rgba(255,255,255,0.5)",
                        padding: "10px 5px", borderBottom: authMode === "signin" ? "2px solid #edb437" : "none", cursor: "pointer", fontWeight: "600"
                      }}
                    >
                      Login
                    </button>
                    <button 
                      onClick={() => setAuthMode("signup")}
                      style={{ 
                        background: "none", border: "none", color: authMode === "signup" ? "#edb437" : "rgba(255,255,255,0.5)",
                        padding: "10px 5px", borderBottom: authMode === "signup" ? "2px solid #edb437" : "none", cursor: "pointer", fontWeight: "600"
                      }}
                    >
                      Join Aura
                    </button>
                  </div>

                  {error && <div style={{ color: error.includes("created") ? "#28a745" : "#dc3545", marginBottom: "15px", fontSize: "14px", textAlign: "center" }}>{error}</div>}

                  <form onSubmit={handleEmailAuth}>
                    <div style={{ marginBottom: "15px" }}>
                      <label style={{ display: "block", color: "rgba(255,255,255,0.7)", fontSize: "12px", marginBottom: "5px" }}>Email Address</label>
                      <input 
                        type="email" 
                        value={email} 
                        onChange={(e) => setEmail(e.target.value)} 
                        required 
                        style={{ width: "100%", padding: "12px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", color: "white" }} 
                      />
                    </div>

                    <div style={{ marginBottom: "25px" }}>
                      <label style={{ display: "block", color: "rgba(255,255,255,0.7)", fontSize: "12px", marginBottom: "5px" }}>Password</label>
                      <input 
                        type="password" 
                        value={password} 
                        onChange={(e) => setPassword(e.target.value)} 
                        required 
                        style={{ width: "100%", padding: "12px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", color: "white" }} 
                      />
                    </div>
                    
                    <button type="submit" disabled={verifyingLoader} className="btn-cs" style={{ width: "100%", padding: "14px" }}>
                      {verifyingLoader ? <span className="spinner"></span> : (authMode === "signin" ? "Log In" : "Sign Up & Verify")}
                    </button>
                  </form>

                  <div style={{ display: "flex", alignItems: "center", margin: "25px 0", color: "rgba(255,255,255,0.2)" }}>
                    <div style={{ flex: 1, height: "1px", background: "currentColor" }} />
                    <span style={{ margin: "0 10px", fontSize: "12px" }}>OR CONTINUE WITH</span>
                    <div style={{ flex: 1, height: "1px", background: "currentColor" }} />
                  </div>

                  <div style={{ display: "flex", gap: "10px" }}>
                    <button onClick={() => handleOAuth("github")} style={{ flex: 1, padding: "10px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", color: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z"/></svg>
                      GitHub
                    </button>
                    <button onClick={() => handleOAuth("google")} style={{ flex: 1, padding: "10px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", color: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M7 11v2.4h3.9c-.8 2.3-2.8 3.9-5.4 3.9-3.3 0-6-2.7-6-6s2.7-6 6-6c1.6 0 3.1.6 4.2 1.7L11.4 5c-1.2-1.2-3-2-4.9-2-4.4 0-8 3.6-8 8s3.6 8 8 8c4.6 0 7.7-3.2 7.7-7.8 0-.6-.1-1.1-.2-1.6H7z"/></svg>
                      Google
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  }

  if (isVerifying) {
    return (
      <div className="home-container dev-page">
        <Header />
        <section className="dev-hero">
          <div className="dev-orb" style={{ width: 420, height: 420, top: "5%", left: "-8%", background: "radial-gradient(circle, #edb43722, transparent 70%)", animationDuration: "14s" }} />
          
          <div className="dev-hero-inner">
            <div className="dev-badge-pill">✦ Security Check</div>
            <h1 className="dev-hero-title">
              Verify your <span className="grad_text">Identity</span>
            </h1>
            <p className="dev-hero-sub">
              Enter the 6-digit code we've sent to your email to complete your account setup.
            </p>

            <div className="dev-card-wrapper" style={{ width: "100%", maxWidth: "400px", marginTop: "20px" }}>
              <div className="dev-card" style={{ padding: "40px", display: "block" }}>
                <div className="dev-card-glow" style={{ "--glow": "#edb437" }} />
                <div className="dev-card-accent" style={{ background: `linear-gradient(90deg, #edb43788, transparent)` }} />
                
                <div style={{ position: "relative", zIndex: 1 }}>
                  {error && <div style={{ color: error.includes("resent") || error.includes("sent") ? "#28a745" : "#dc3545", marginBottom: '20px', textAlign: 'center', fontSize: '14px' }}>{error}</div>}
                  
                  <form onSubmit={handleVerifyOtp}>
                    <input 
                      type="text" 
                      placeholder="000000" 
                      maxLength={6}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      required
                      style={{ 
                        width: '100%', padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '10px', color: 'white', marginBottom: '20px', textAlign: 'center', fontSize: '24px', letterSpacing: '8px', outline: 'none'
                      }}
                    />
                    <button type="submit" disabled={verifyingLoader} className="btn-cs" style={{ width: '100%' }}>
                      {verifyingLoader ? <span className="spinner"></span> : "Verify & Complete Signup"}
                    </button>
                    <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                      <button type="button" onClick={() => handleSendOtp(null, true)} style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '8px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px' }}>
                        Resend Code
                      </button>
                    </div>
                  </form>
                  
                  <button onClick={signout} style={{ background: 'none', border: 'none', color: '#edb437', marginTop: '20px', width: '100%', cursor: 'pointer', fontSize: '14px' }}>
                    Cancel & Sign Out
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return null; // Should be handled by useEffect redirect
}

