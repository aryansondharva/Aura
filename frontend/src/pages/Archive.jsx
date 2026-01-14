import React, { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import History from "../components/History";
import useSession from "../utils/useSession";
import { EqualApproximately, BookMarked } from "lucide-react";
import "bootstrap/dist/css/bootstrap.min.css";
import supabase from "../utils/supabaseClient";
import { PackageOpen } from "lucide-react";
import { Trash } from "lucide-react";
import { PackageSearch } from 'lucide-react';

const Archive = () => {
  const {
    userId,
    isLoggedIn,
    isSidebarOpen,
    isHistoryOpen,
    toggleSidebar,
    toggleHistory,
  } = useSession();

  const [archivedTopics, setArchivedTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchArchivedTopics = async () => {
      try {
        setLoading(true);
        setError(null);

        if (!userId) {
          setLoading(false);
          return;
        }

        const { data, error: fetchError } = await supabase
          .from("topics")
          .select(
            `
            topic_id,
            title,
            created_at,
            file_name,
            archive_status
          `
          )
          .eq("user_id", userId)
          .eq("archive_status", "archived")
          .order("created_at", { ascending: false });

        if (fetchError) throw fetchError;

        setArchivedTopics(data || []);
      } catch (err) {
        console.error("Error fetching archived topics:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchArchivedTopics();
  }, [userId]); // Only depend on userId from useSession

  const handleUnarchive = async (topicId) => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from("topics")
        .update({ archive_status: "not_archived" })
        .eq("topic_id", topicId);

      if (error) throw error;

      setArchivedTopics((prev) =>
        prev.filter((topic) => topic.topic_id !== topicId)
      );
    } catch (err) {
      console.error("Error unarchiving topic:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Group topics by file_name
  const groupedTopics = archivedTopics.reduce((acc, topic) => {
    const fileName = topic.file_name || "Uncategorized";
    if (!acc[fileName]) acc[fileName] = [];
    acc[fileName].push(topic);
    return acc;
  }, {});

  if (!isLoggedIn) {
    return (
      <div className="chat chat-wrapper d-flex min-vh-100">
        <Sidebar
          isOpen={isSidebarOpen}
          toggleSidebar={toggleSidebar}
          toggleHistory={toggleHistory}
          isHistoryOpen={isHistoryOpen}
          isLoggedIn={isLoggedIn}
        />
        <div className="chat-content flex-grow-1 p-4 text-white">
          <div className="container text-center mt-5">
            <h3>Please sign in to view archived topics</h3>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="chat chat-wrapper chat_scroll d-flex min-vh-100">
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

      <div className="chat-content flex-grow-1 p-4 text-white">
        <div className="container text-center mb-4 mt-4">
          <h2 className="grad_text">Archived Topics</h2>
        </div>

        <div className="container">
          {loading ? (
            <div className="row justify-content-center mt-5">
              <div className="col-md-6 text-center">
                <div className="spinner-border text-light" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
              </div>
            </div>
          ) : error ? (
            <div className="row justify-content-center mt-5">
              <div className="col-md-6 alert alert-danger">
                Error loading topics: {error}
              </div>
            </div>
          ) : Object.keys(groupedTopics).length === 0 ? (
            <div className="row no_archive mt-5">
              <div className="col-md-12">
                <BookMarked
                  size={100}
                  strokeWidth={0.5}
                  className="no_arcicon mb-3"
                />
                <h3 className="text-white">No archived topics found.</h3>
              </div>
            </div>
          ) : (
            Object.entries(groupedTopics).map(([fileName, topics]) => (
              <div key={fileName} className="mb-5">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <div>
                    <h4 className="text-white mb-0"><PackageSearch className="me-2" /> {fileName}</h4>
                    <div className="text-white small mt-2">
                      Archived on:{" "}
                      {new Date(topics[0]?.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="arch_grp">
                    <button
                      className="btn btn-sm btn-answer"
                      onClick={async () => {
                        setLoading(true);
                        try {
                          const { error } = await supabase
                            .from("topics")
                            .update({ archive_status: "not_archived" })
                            .eq("file_name", fileName)
                            .eq("user_id", userId);

                          if (error) throw error;

                          setArchivedTopics((prev) =>
                            prev.filter((topic) => topic.file_name !== fileName)
                          );
                        } catch (err) {
                          console.error(
                            "Error unarchiving all topics in file:",
                            err
                          );
                          setError(err.message);
                        } finally {
                          setLoading(false);
                        }
                      }}
                      disabled={loading}
                    >
                      <div className="arch_indbtn">
                        <PackageOpen /> Unarchive
                      </div>
                    </button>

                    <button
                      className="btn btn-sm btn-answer2"
                      onClick={async () => {
                        setLoading(true);
                        try {
                          const { error } = await supabase
                            .from("topics")
                            .delete()
                            .eq("file_name", fileName)
                            .eq("user_id", userId)
                            .eq("archive_status", "archived");

                          if (error) throw error;

                          setArchivedTopics((prev) =>
                            prev.filter((topic) => topic.file_name !== fileName)
                          );
                        } catch (err) {
                          console.error("Error deleting topics:", err);
                          setError(err.message);
                        } finally {
                          setLoading(false);
                        }
                      }}
                      disabled={loading}
                    >
                      <div className="arch_indbtn">
                        <Trash /> Delete
                      </div>
                    </button>
                  </div>
                </div>

                <div className="row">
                  <div className="col-md-12">
                    <ul className="list-group">
                      {topics.map((topic) => (
                        <li
                          key={topic.topic_id}
                          className="d-flex justify-content-between align-items-center flex-column archieve_topic"
                        >
                          <div className="w-100 d-flex justify-content-between align-items-center">
                            <p>{topic.title}</p>
                            <button
                              className="btn btn-sm btn-answer"
                              onClick={() => handleUnarchive(topic.topic_id)}
                              disabled={loading}
                            >
                              <div className="arch_indbtn">
                                <PackageOpen /> Unarchive
                              </div>
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <EqualApproximately
          className="d-md-none position-fixed top-0 start-0 m-3"
          onClick={toggleSidebar}
          style={{ zIndex: 99 }}
        />
      </div>
    </div>
  );
};

export default Archive;
