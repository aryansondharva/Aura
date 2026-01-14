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
      <div className="home-container">
        <Header />
        <div className="container hero">
          <div className="row">
            <div className="col-md-4">
              <div className="p-4 shadow rounded bg-white auth-card">
                <Auth
                  supabaseClient={supabase}
                  appearance={{ theme: ThemeSupa }}
                  providers={["google", "github"]}
                  redirectTo={window.location.origin + "/signin"}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  } else {
    return (
      <div className="home-container">
        <div className="container hero">
          <div className="row">
            <div className="col-md-4">
              <div className="p-4 shadow rounded bg-white">
                <p style={{ color: "#000" }}>
                  You are successfully logged in as {session.user.email}.
                  Explore the features and start your learning journey.
                </p>
                <button onClick={signout} className="btn btn-cs">
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
