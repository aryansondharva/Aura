import React, { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import History from "../components/History";
import { 
  EqualApproximately, Bell, BellOff, Phone, User, CheckCircle, 
  ShieldCheck, Mail, LogOut, ArrowLeft, Edit3, Save, X 
} from "lucide-react";
import useSession from "../utils/useSession";
import supabase from "../utils/supabaseClient";
import { useNavigate } from "react-router-dom";

const Profile = () => {
  const { session, userId, isLoggedIn, isSidebarOpen, isHistoryOpen, toggleSidebar, toggleHistory } = useSession();
  const navigate = useNavigate();

  // Mode state
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Data state
  const [profile, setProfile] = useState({ name: "", mobile: "", email_notifications: true });
  const [tempProfile, setTempProfile] = useState({}); // Stores changes before they are saved

  // OTP State
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
        const loadedProfile = {
          name: data.name || (session?.user?.user_metadata?.full_name || ""),
          mobile: data.mobile || "",
          email_notifications: data.email_notifications ?? true
        };
        setProfile(loadedProfile);
        setTempProfile(loadedProfile);
        // If mobile already exists in DB, we consider it verified for this UI demo
        if (data.mobile) setIsVerified(true);
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
        body: JSON.stringify({ userId, ...tempProfile })
      });
      
      if (response.ok) {
        await supabase.auth.updateUser({ data: { full_name: tempProfile.name } });
        setProfile(tempProfile);
        setIsEditing(false); // Switch back to View mode
      }
    } catch (err) {
      alert("Failed to update profile");
    } finally { 
      setSaving(false); 
    }
  };

  const sendOtp = async () => {
    if (!tempProfile.mobile) return alert("Please enter a mobile number first");
    setSaving(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/user/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, mobile: tempProfile.mobile })
      });
      const data = await response.json();
      if (response.ok) {
        setOtpSent(true);
        if (data.otp) alert(`Aura Security: Your code is ${data.otp}`);
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
            border: "1px solid rgba(255, 255, 255, 0.1)",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)"
          }}>
            
            {loading ? (
              <div className="text-center py-5"><div className="spinner-border text-warning" role="status" /></div>
            ) : isEditing ? (
              /** EDIT MODE **/
              <div className="edit-view animate__animated animate__fadeIn">
                <div className="d-flex justify-content-between align-items-center mb-5">
                  <h2 className="grad_text mb-0">Edit Profile</h2>
                  <button className="btn btn-link text-white-50 p-0" onClick={() => setIsEditing(false)}><X size={24}/></button>
                </div>

                <div className="mb-4">
                  <label className="small text-white-50 mb-2 d-block">Full Name</label>
                  <input type="text" className="form-control form-control-lg bg-black border-secondary text-white border-opacity-25" value={tempProfile.name} onChange={(e) => setTempProfile({...tempProfile, name: e.target.value})} />
                </div>

                <div className="mb-4">
                  <label className="small text-white-50 mb-2 d-block">Mobile Number</label>
                  <div className="position-relative">
                    <input type="text" className="form-control form-control-lg bg-black border-secondary text-white border-opacity-25" value={tempProfile.mobile} onChange={(e) => {setTempProfile({...tempProfile, mobile: e.target.value}); setIsVerified(false);}} />
                    {!isVerified && (
                      <button className="btn btn-link text-warning position-absolute top-50 end-0 translate-middle-y me-2 text-decoration-none fw-bold" onClick={sendOtp}>Verify</button>
                    )}
                  </div>
                </div>

                {otpSent && (
                  <div className="otp-box p-3 mb-4 rounded-3 border border-warning border-opacity-25 bg-warning bg-opacity-10">
                    <div className="small fw-bold mb-2">Verification Sent</div>
                    <div className="d-flex gap-2">
                       <input type="text" className="form-control bg-black text-white border-warning" placeholder="6-digit code" value={otpCode} onChange={(e) => setOtpCode(e.target.value)} />
                       <button className="btn btn-warning" onClick={verifyOtp} disabled={verifying}>Check</button>
                    </div>
                  </div>
                )}

                <div className="mb-5 d-flex justify-content-between align-items-center">
                  <div>
                    <div className="fw-bold">Email Notifications</div>
                    <div className="small text-white-50">Stay updated on your quiz progress</div>
                  </div>
                  <div className="form-check form-switch">
                    <input className="form-check-input" type="checkbox" style={{ transform: "scale(1.2)" }} checked={tempProfile.email_notifications} onChange={(e) => setTempProfile({...tempProfile, email_notifications: e.target.checked})} />
                  </div>
                </div>

                <div className="d-grid gap-2">
                  <button className="btn btn-warning btn-lg fw-bold" onClick={handleSave} disabled={saving}><Save size={18} className="me-2"/> Save Changes</button>
                  <button className="btn btn-outline-secondary" onClick={() => setIsEditing(false)}>Cancel</button>
                </div>
              </div>
            ) : (
              /** VIEW MODE **/
              <div className="view-view animate__animated animate__fadeIn">
                <div className="profile-header text-center mb-5">
                  <div className="avatar-wrap mx-auto mb-3 d-flex align-items-center justify-content-center" style={{ width: "80px", height: "80px", borderRadius: "50%", background: "linear-gradient(45deg, #edb437, #fff)", color: "#000", fontSize: "2rem", fontWeight: "bold" }}>
                    {profile.name ? profile.name[0].toUpperCase() : session?.user?.email[0].toUpperCase()}
                  </div>
                   <h2 className="grad_text mb-1">{profile.name || "Aura Member"}</h2>
                   <p className="text-white-50 small">{session?.user?.email}</p>
                </div>

                <div className="info-grid mb-5">
                  {/* Name row */}
                  <div className="d-flex justify-content-between py-3 border-bottom border-white border-opacity-10">
                    <span className="text-white-50">Full Name</span>
                    <span className="fw-medium">{profile.name || "Not set"}</span>
                  </div>
                  {/* Mobile row */}
                  <div className="d-flex justify-content-between py-3 border-bottom border-white border-opacity-10">
                    <span className="text-white-50">Mobile</span>
                    <span className="fw-medium d-flex align-items-center">
                      {profile.mobile || "Not set"}
                      {isVerified && profile.mobile && <CheckCircle size={14} className="text-success ms-2"/>}
                    </span>
                  </div>
                  {/* Notifications row */}
                  <div className="d-flex justify-content-between py-3">
                    <span className="text-white-50">Notifications</span>
                    <span className={`badge ${profile.email_notifications ? 'bg-success bg-opacity-10 text-success' : 'bg-secondary bg-opacity-10 text-white-50'} border-0`}>
                      {profile.email_notifications ? "Enabled" : "Disabled"}
                    </span>
                  </div>
                </div>

                <div className="d-grid gap-3">
                  <button className="btn btn-warning btn-lg fw-bold" onClick={() => setIsEditing(true)}>
                    <Edit3 size={18} className="me-2"/> Edit Profile
                  </button>
                  <div className="d-flex gap-2">
                    <button onClick={() => navigate("/chat")} className="btn btn-outline-secondary flex-grow-1 border-opacity-25"><ArrowLeft size={16} className="me-2"/> Back</button>
                    <button onClick={signout} className="btn btn-outline-danger border-opacity-25"><LogOut size={16}/></button>
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
