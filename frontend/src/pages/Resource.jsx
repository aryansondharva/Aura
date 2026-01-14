import React, { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import History from "../components/History";
import useSession from "../utils/useSession";
import { Pencil, Trash2 } from "lucide-react";
import supabase from "../utils/supabaseClient";

const Resource = () => {
  const {
    userId,
    isLoggedIn,
    isSidebarOpen,
    isHistoryOpen,
    toggleSidebar,
    toggleHistory,
  } = useSession();

  const [documents, setDocuments] = useState([]);
  const [editingDocId, setEditingDocId] = useState(null);
  const [newName, setNewName] = useState("");

  const fetchDocuments = async () => {
    if (!userId) return;

    const { data, error } = await supabase
      .from("resources")
      .select("*")
      .eq("user_id", userId)
      .order("uploaded_at", { ascending: false });

    if (error) {
      console.error("Error fetching documents:", error);
      return;
    }

    // Get public URLs for all documents
    const enriched = await Promise.all(
      data.map(async (doc) => {
        const { data: urlData, error: urlError } = supabase.storage
          .from("user-resources")
          .getPublicUrl(doc.file_name);

        return {
          ...doc,
          publicUrl: urlError ? "#" : urlData.publicUrl,
        };
      })
    );

    setDocuments(enriched);
  };

  const handleRename = async (docId) => {
    if (!newName.trim()) return;
    const { error } = await supabase
      .from("resources")
      .update({ file_name: newName })
      .eq("id", docId);

    if (error) {
      console.error("Rename failed:", error);
      alert("Failed to rename file.");
    } else {
      setEditingDocId(null);
      setNewName("");
      fetchDocuments();
    }
  };

  const handleDelete = async (docId) => {
    if (!confirm("Are you sure you want to delete this file?")) return;

    const { error } = await supabase.from("resources").delete().eq("id", docId);

    if (error) {
      console.error("Delete failed:", error);
      alert("Failed to delete file.");
    } else {
      fetchDocuments();
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [userId]);

  return (
    <div className="chat chat-wrapper d-flex min-vh-100">
      <div className={`sidebar-area ${isSidebarOpen ? "open" : "collapsed"}`}>
        <Sidebar
          {...{
            isOpen: isSidebarOpen,
            toggleSidebar,
            toggleHistory,
            isHistoryOpen,
            isLoggedIn,
          }}
        />
        <History
          {...{
            isLoggedIn,
            userId,
            isHistoryOpen,
            onClose: toggleHistory,
          }}
        />
      </div>

      <div className="chat-content flex-grow-1 p-4 text-white d-flex flex-column">
        <div className="container text-center mb-4 mt-4">
          <h2 className="grad_text">Your Uploaded Documents</h2>
        </div>

        <div className="container">
          <div className="row">
            {documents.length > 0 ? (
              documents.map((doc, idx) => (
                <div className="col-xl-4 col-md-6 mb-4" key={idx}>
                  <div className="card topic_card text-white">
                    <div className="card-body">
                      {editingDocId === doc.id ? (
                        <input
                          type="text"
                          className="form-control form-control-sm mb-2"
                          value={newName}
                          onChange={(e) => setNewName(e.target.value)}
                          onBlur={() => handleRename(doc.id)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleRename(doc.id);
                            if (e.key === "Escape") {
                              setEditingDocId(null);
                              setNewName("");
                            }
                          }}
                          autoFocus
                        />
                      ) : (
                        <h5 className="card-title d-flex justify-content-between align-items-center">
                          <a
                            href={doc.publicUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              color: "inherit",
                              textDecoration: "underline",
                              flexGrow: 1,
                            }}
                            title={`Open ${doc.original_name} in new tab`}
                          >
                            {doc.file_name}
                          </a>
                          <span className="d-flex gap-2 ms-3">
                            <Pencil
                              className="edit-icon"
                              size={18}
                              style={{ cursor: "pointer" }}
                              onClick={() => {
                                setEditingDocId(doc.id);
                                setNewName(doc.file_name);
                              }}
                            />
                            <Trash2
                              className="edit-icon"
                              size={18}
                              style={{ cursor: "pointer" }}
                              onClick={() => handleDelete(doc.id)}
                            />
                          </span>
                        </h5>
                      )}
                      <p className="small text-muted mt-2">
                        Uploaded on:{" "}
                        {new Date(doc.uploaded_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-muted">
                <p>No documents found.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Resource;
