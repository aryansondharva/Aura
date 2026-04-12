import React, { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import History from "../components/History";
import { EqualApproximately, Bell, BellOff, Phone, User, CheckCircle, ShieldCheck, Mail, LogOut, ArrowLeft } from "lucide-react";
import useSession from "../utils/useSession";
import supabase from "../utils/supabaseClient";
import { useNavigate } from "react-router-dom";

const Profile = () => {
  const { session, userId, isLoggedIn, isSidebarOpen, isHistoryOpen, toggleSidebar, toggleHistory } = useSession();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState({ name: "", mobile: "", email_notifications: true });
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [isVerified, setIsVerified] = useState(false);

  useEffect(() => {
    if (userId) fetchProfile();
  }, [userId]);

  const fetchProfile = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/user/${userId}`);
      if (response.ok) {
        const data = await response.json();
        setProfile({
          name: data.name || "",
          mobile: data.mobile || "",
          email_notifications: data.email_notifications ?? true
        });
      }
    } catch (err) {
      console.error("Fetch profile error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/user/update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, ...profile })
      });
      
      if (response.ok) {
        // Sync with Supabase Auth so sidebar/header updates name immediately
        await supabase.auth.updateUser({
          data: { full_name: profile.name }
        });
        
        alert("✨ Profile updated successfully!");
        fetchProfile(); // Refresh data
      }
    } catch (err) {
      alert("Failed to update profile");
    } finally { 
      setSaving(false); 
    }
  };

  const sendOtp = async () => {
    if (!profile.mobile) return alert("Please enter a mobile number first");
    setSaving(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/user/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, mobile: profile.mobile })
      });
      const data = await response.json();
      if (response.ok) {
        setOtpSent(true);
        if (data.otp) alert(`Aura Security: Verification code is ${data.otp}`);
      }
    } finally { setSaving(false); }
  };

  const verifyOtp = async () => {
    setVerifying(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/user/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, otp: otpCode })
      });
      if (response.ok) { setIsVerified(true); setOtpSent(false); } 
      else alert("Invalid OTP code");
    } finally { setVerifying(false); }
  };

  const signout = async () => { await supabase.auth.signOut(); window.location.href = "/signin"; };

  return (
    <div className="chat chat-wrapper d-flex min-vh-100" style={{ background: "radial-gradient(circle at top right, #332100 0%, #060606 100%)" }}>
      <div className={`sidebar-area ${isSidebarOpen ? "open" : "collapsed"}`}>
        <Sidebar isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} toggleHistory={toggleHistory} isHistoryOpen={isHistoryOpen} isLoggedIn={isLoggedIn} />
        <History isLoggedIn={isLoggedIn} userId={userId} isHistoryOpen={isHistoryOpen} onClose={toggleHistory} />
      </div>

      <div className="chat-content flex-grow-1 p-4 text-white d-flex justify-content-center align-items-center">
        <div className="profile-container position-relative" style={{ width: "100%", maxWidth: "550px" }}>
          
          <div className="profile-card p-5" style={{ 
            background: "rgba(25, 25, 25, 0.7)", 
            backdropFilter: "blur(20px)",
            borderRadius: "32px",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)"
          }}>
            <div className="text-center mb-5">
              <h2 className="display-6 fw-bold grad_text mb-1">Aura Settings</h2>
              <p className="text-white-50 small">Manage your identity and notifications</p>
            </div>

            {loading ? (
              <div className="text-center py-5"><div className="spinner-border text-warning" role="status" /></div>
            ) : (
              <div className="profile-form">
                
                {/* Account Settings Section */}
                <div className="section-label text-warning small fw-bold text-uppercase mb-3 tracking-widest" style={{ letterSpacing: "1px" }}>Identity</div>
                
                <div className="mb-4">
                  <div className="d-flex align-items-center mb-2 px-1">
                    <User size={14} className="text-warning me-2" />
                    <label className="small text-white-50 fw-medium">Full Name</label>
                  </div>
                  <input type="text" className="form-control form-control-lg bg-black border-secondary text-white border-opacity-25" value={profile.name} onChange={(e) => setProfile({...profile, name: e.target.value})} style={{ borderRadius: "12px", fontSize: "1rem" }} />
                </div>

                <div className="mb-4">
                  <div className="d-flex align-items-center mb-2 px-1">
                    <Phone size={14} className="text-warning me-2" />
                    <label className="small text-white-50 fw-medium">Mobile Number</label>
                  </div>
                  <div className="position-relative">
                    <input type="text" className="form-control form-control-lg bg-black border-secondary text-white border-opacity-25 pe-5" value={profile.mobile} onChange={(e) => setProfile({...profile, mobile: e.target.value})} disabled={isVerified} style={{ borderRadius: "12px" }} />
                    <div className="position-absolute top-50 end-0 translate-middle-y me-2">
                       {!isVerified ? (
                        <button className="btn btn-link text-warning text-decoration-none small fw-bold" onClick={sendOtp}>{otpSent ? "Resend" : "Verify"}</button>
                       ) : (
                        <CheckCircle size={20} className="text-success me-2" />
                       )}
                    </div>
                  </div>
                </div>

                {/* OTP Entry */}
                {otpSent && !isVerified && (
                  <div className="otp-entry p-4 mb-4 rounded-4" style={{ background: "rgba(237, 180, 55, 0.05)", border: "1px solid rgba(237, 180, 55, 0.2)" }}>
                    <div className="d-flex align-items-center mb-3">
                      <ShieldCheck size={18} className="text-warning me-2" />
                      <span className="small fw-bold">Security Verification</span>
                    </div>
                    <div className="d-flex gap-2">
                      <input type="text" className="form-control form-control-lg text-center bg-black border-warning border-opacity-50 text-white tracking-widest" placeholder="6-DIGIT CODE" maxLength="6" value={otpCode} onChange={(e) => setOtpCode(e.target.value)} />
                      <button className="btn btn-warning px-4 fw-bold" onClick={verifyOtp} disabled={verifying}>Confirm</button>
                    </div>
                  </div>
                )}

                <hr className="my-5 opacity-10" />

                <div className="section-label text-warning small fw-bold text-uppercase mb-3 tracking-widest" style={{ letterSpacing: "1px" }}>Preferences</div>
                
                <div className="notification-toggle d-flex justify-content-between align-items-center p-3 rounded-4 mb-5" style={{ background: "rgba(255, 255, 255, 0.03)", border: "1px solid rgba(255, 255, 255, 0.05)" }}>
                  <div className="d-flex align-items-center">
                    <div className="icon-wrap p-2 rounded-3 me-3" style={{ background: profile.email_notifications ? "rgba(237, 180, 55, 0.1)" : "rgba(255,255,255,0.05)" }}>
                      {profile.email_notifications ? <Bell size={18} className="text-warning"/> : <BellOff size={18} className="text-white-50"/>}
                    </div>
                    <div>
                      <div className="fw-bold small">Email Notifications</div>
                      <div className="text-white-50" style={{ fontSize: "0.75rem" }}>Weekly updates and quiz reminders</div>
                    </div>
                  </div>
                  <div className="form-check form-switch custom-switch">
                    <input className="form-check-input" type="checkbox" style={{ transform: "scale(1.3)", cursor: "pointer" }} checked={profile.email_notifications} onChange={(e) => setProfile({...profile, email_notifications: e.target.checked})} />
                  </div>
                </div>

                <div className="actions d-grid gap-3">
                  <button className="btn btn-warning btn-lg fw-bold py-3 shadow-sm hover-lift" onClick={handleSave} disabled={saving} style={{ borderRadius: "14px" }}>
                    {saving ? "Processing..." : "Save All Changes"}
                  </button>
                  <div className="d-flex gap-2">
                    <button onClick={() => navigate("/chat")} className="btn btn-outline-secondary w-100 py-3 border-opacity-25" style={{ borderRadius: "14px" }}>
                      <ArrowLeft size={16} className="me-2"/> Back
                    </button>
                    <button onClick={signout} className="btn btn-outline-danger px-4 border-opacity-25 flex-shrink-0" style={{ borderRadius: "14px" }}>
                      <LogOut size={18} />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <span className="navbar-toggler-menu">
          <EqualApproximately className="d-md-none position-fixed top-0 start-0 m-3" onClick={toggleSidebar} style={{ zIndex: 99 }} />
        </span>
      </div>
    </div>
  );
};

export default Profile;
