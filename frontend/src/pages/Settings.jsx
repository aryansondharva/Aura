import React, { useState, useEffect } from 'react';
import Sidebar from "../components/Sidebar";
import History from "../components/History";
import useSession from "../utils/useSession";
import "bootstrap/dist/css/bootstrap.min.css";

const Settings = () => {
  const [settings, setSettings] = useState({
    global_settings: {
      email_notifications_enabled: true,
      daily_reminders_enabled: true,
    },
    topic_settings: {},
  });
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const {
    user,
    userId,
    isLoggedIn,
    isSidebarOpen,
    isHistoryOpen,
    toggleSidebar,
    toggleHistory,
  } = useSession();

  useEffect(() => {
    fetchSettings();
    fetchTopics();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch(`http://127.0.0.1:5000/api/notification-settings/${userId}`);
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      } else {
        console.error("Failed to fetch settings");
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
    }
  };

  const fetchTopics = async () => {
    try {
      const response = await fetch(`http://127.0.0.1:5000/api/topics/${userId}`);
      if (response.ok) {
        const data = await response.json();
        setTopics(data);
      } else {
        console.error("Failed to fetch topics");
      }
    } catch (error) {
      console.error("Error fetching topics:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleGlobalSettingChange = (setting, value) => {
    setSettings((prev) => ({
      ...prev,
      global_settings: {
        ...prev.global_settings,
        [setting]: value,
      },
    }));
  };

  const handleTopicSettingChange = (topicId, enabled) => {
    setSettings((prev) => ({
      ...prev,
      topic_settings: {
        ...prev.topic_settings,
        [topicId]: enabled,
      },
    }));
  };

  const saveSettings = async () => {
    setSaving(true);
    setMessage("");

    try {
      const response = await fetch(`http://127.0.0.1:5000/api/notification-settings/${userId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        setMessage("Settings saved successfully!");
        setTimeout(() => setMessage(""), 3000);
      } else {
        setMessage("Failed to save settings. Please try again.");
      }
    } catch (error) {
      console.error("Error saving settings:", error);
      setMessage("Error saving settings. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="chat chat-wrapper d-flex min-vh-100">
      <div className={`sidebar-area ${isSidebarOpen ? "open" : "collapsed"}`}>
        <Sidebar isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} toggleHistory={toggleHistory} isHistoryOpen={isHistoryOpen} isLoggedIn={isLoggedIn} />
        <History isLoggedIn={isLoggedIn} userId={user?.id} isHistoryOpen={isHistoryOpen} onClose={toggleHistory} />
      </div>

      <div className="chat-content flex-grow-1 p-4 text-white">
        <div className="container text-center mb-4 mt-4">
          <h2 className="grad_text">Notification Settings</h2>
        </div>

        {loading ? (
          <div className="d-flex justify-content-center align-items-center" style={{ height: "150px" }}>
            <div className="spinner-border text-primary" role="status" />
          </div>
        ) : (
          <div className="container">
            <div className="mb-5">
              <h4 className="text-white mb-3">🌐 Global Settings</h4>
              <div className="card p-3 mb-3 bg-dark text-white">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <h5>Email Notifications</h5>
                    <p>Receive email notifications for quiz results</p>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={settings.global_settings.email_notifications_enabled}
                      onChange={(e) => handleGlobalSettingChange("email_notifications_enabled", e.target.checked)}
                    />
                    <span className="slider"></span>
                  </label>
                </div>
              </div>

              <div className="card p-3 bg-dark text-white">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <h5>Daily Reminders</h5>
                    <p>Get daily reminders for topics where you scored below 8/10</p>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={settings.global_settings.daily_reminders_enabled}
                      onChange={(e) => handleGlobalSettingChange("daily_reminders_enabled", e.target.checked)}
                    />
                    <span className="slider"></span>
                  </label>
                </div>
              </div>
            </div>

            <div className="mb-3">
              <h4 className="text-white mb-3">📚 Topic-Specific Settings</h4>
              <p className="text-white mb-5">Control notifications for individual topics. Disabled topics won't send any reminders.</p>

              {topics.length === 0 ? (
                <div className="text-center text-warning">
                  No topics found. Upload some documents to see topic-specific settings.
                </div>
              ) : (
                <div className="row">
                  {topics.map((topic) => {
                    const isEnabled = settings.topic_settings[topic.topic_id] !== false;
                    return (
                      <div key={topic.topic_id} className="col-md-6 col-xl-4 mb-3">
                        <div className="card p-3 bg-dark text-white">
                          <div className="d-flex justify-content-between align-items-center">
                            <div>
                              <h5>{topic.title}</h5>
                              <p className="mb-0">
                                Status: <span className={`status ${topic.topic_status?.toLowerCase()}`}>{topic.topic_status || 'Not attempted'}</span>
                              </p>
                            </div>
                            <label className="toggle-switch">
                              <input
                                type="checkbox"
                                checked={isEnabled}
                                onChange={(e) => handleTopicSettingChange(topic.topic_id, e.target.checked)}
                              />
                              <span className="slider"></span>
                            </label>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="text-center">
              <button className="btn btn-answer" onClick={saveSettings} disabled={saving}>
                {saving ? "💾 Saving..." : "💾 Save Settings"}
              </button>
              {message && (
                <div className={`mt-3 ${message.includes("successfully") ? "text-success" : "text-danger"}`}>{message}</div>
              )}
            </div>

            
          </div>
        )}
      </div>
    </div>
  );
};

export default Settings;
