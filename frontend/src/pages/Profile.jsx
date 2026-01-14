// Profile.jsx
import React from "react";
import Sidebar from "../components/Sidebar";
import History from "../components/History";
import { EqualApproximately } from "lucide-react";
import useSession from "../utils/useSession";
import supabase from "../utils/supabaseClient";

import { useNavigate } from "react-router-dom";

const Profile = () => {
  const {
    session,
    userId,
    isLoggedIn,
    isSidebarOpen,
    isHistoryOpen,
    toggleSidebar,
    toggleHistory,
  } = useSession();
  const navigate = useNavigate();
  const signout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) console.error("Error signing out:", error.message);
    else window.location.href = "/signin";
  };

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

      <div className="chat-content flex-grow-1 p-4 text-white d-flex justify-content-center align-items-center">
        <div
          className="profile-card text-white p-4"
          style={{ minWidth: "300px", maxWidth: "600px", width: "100%" }}
        >
          <h2 className="text-center mb-2">User Profile</h2>
          <hr className="mb-4"/>
          {isLoggedIn && session ? (
            <>
              <div className="mb-3 d-flex justify-content-between">
                <strong>Email:</strong>
                <span>{session.user.email}</span>
              </div>
              <div className="mb-3 d-flex justify-content-between">
                <strong>User ID:</strong>
                <span className="text-end">{session.user.id}</span>
              </div>
              <div className="mb-3 d-flex justify-content-between">
                <strong>Display Name:</strong>
                <span>{session.user.user_metadata?.full_name || "N/A"}</span>
              </div>
              <div className="mb-3 d-flex justify-content-between">
                <strong>Created At:</strong>
                <span>
                  {new Date(session.user.created_at).toLocaleString()}
                </span>
              </div>
              <div className="d-flex justify-content-between align-items-center mt-4">
                <button onClick={() => navigate("/chat")} className="btn btn-cs me-3">Return to Chat</button>
                <button onClick={signout} className="btn btn-danger" style={{ padding: "10px 30px" }}>
                  Sign Out
                </button>
              </div>
            </>
          ) : (
            <p className="text-center">You are not logged in.</p>
          )}
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

export default Profile;
