import React, { useState, useEffect } from "react";
import { Power, Plus, Search, Pencil, Trash2, Share2 } from "lucide-react";

const History = ({
  isLoggedIn,
  isHistoryOpen = false,
  onClose,
  userId,
  onSelectConversation,
  onNewConversation,
  conversations: initialConversations, // renamed to avoid conflict with state
  currentConv,
  setCurrentConv,
  setMessages,
}) => {
  const [conversations, setConversations] = useState(
    initialConversations || []
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [newChatLoading, setNewChatLoading] = useState(false); // New state for new chat loader

  // Fetch all conversations
  useEffect(() => {
    if (isHistoryOpen && isLoggedIn && userId) {
      setLoading(true);
      fetch(`http://127.0.0.1:5000/api/conversations?user_id=${userId}`)
        .then((res) =>
          res.ok ? res.json() : []
        )
        .then((data) => setConversations(Array.isArray(data) ? data : []))
        .catch((err) => {
          console.error("Error fetching conversations:", err);
          setConversations([]);
        })
        .finally(() => setLoading(false));
    }
  }, [isHistoryOpen, isLoggedIn, userId]);

  const filtered = conversations.filter((c) =>
    (c.title || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleNew = async () => {
    setNewChatLoading(true); // Start loading
    try {
      const newId = await onNewConversation();
      if (newId) {
        onSelectConversation(newId);
        const newConversation = {
          conversation_id: newId,
          title: "New Chat",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        setConversations([newConversation, ...conversations]);
      }
    } catch (err) {
      console.error("Error creating new conversation:", err);
    } finally {
      setNewChatLoading(false); // Stop loading
    }
  };

  const handleDeleteAndStartNewChat = async (convId) => {
    try {
      // 1) delete on server
      await fetch(`http://127.0.0.1:5000/api/conversations/${convId}`, {
        method: "DELETE",
      });

      // 2) remove from local list
      setConversations((cs) => cs.filter((c) => c.conversation_id !== convId));

      // 3) if it was the open chat, start a new one
      if (convId === currentConv) {
        const newId = await onNewConversation(); // fixed: use onNewConversation instead of undefined handleNewConversation
        if (newId) {
          setCurrentConv(newId);
          setMessages([]); // clear the chat pane
        }
      }
    } catch (err) {
      console.error("Delete/start-new failed:", err);
    }
  };

  const handleRename = async (conversationId, newTitle) => {
    try {
      await fetch(`http://127.0.0.1:5000/api/conversations/${conversationId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle }),
      });
      setConversations(
        conversations.map((c) =>
          c.conversation_id === conversationId ? { ...c, title: newTitle } : c
        )
      );
    } catch (error) {
      console.error("Error renaming conversation:", error);
    }
  };

  const handleShare = (conversationId) => {
    const shareUrl = `${window.location.origin}/chat/${conversationId}`;
    navigator.clipboard
      .writeText(shareUrl)
      .then(() => alert("Link copied to clipboard!"))
      .catch((err) => console.error("Failed to copy:", err));
  };

  

  return (
    <div
      className={`history-panel bg-dark text-white p-3 ${
         isHistoryOpen ? "open" : "closed"
      }`}
    >
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5 className="m-0">Chat History</h5>
        <Power onClick={onClose} style={{ cursor: "pointer" }} />
      </div>

      {isLoggedIn ? (
        <>
          <button
            className="btn btn-sm btn-answer mb-2 w-100 d-flex align-items-center justify-content-center gap-2"
            onClick={handleNew}
            disabled={newChatLoading} // Disable button while loading
          >
            {newChatLoading ? (
              <>
                <div
                  className="spinner-border spinner-border-sm"
                  role="status"
                  style={{ width: "1rem", height: "1rem" }}
                >
                  <span className="visually-hidden">Loading...</span>
                </div>
                Creating...
              </>
            ) : (
              <>
                <Plus size={16} /> New Chat
              </>
            )}
          </button>

          <div className="input-group input-group-sm mb-3">
            <span
              className="input-group-text bg-secondary border-1"
              style={{ cursor: "pointer", transition: "background-color 0.2s" }}
              onClick={() => setSearchQuery("")}
            >
              <Search size={16} />
            </span>
            <input
              className="form-control bg-dark text-white border-1"
              placeholder="Search chats"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <ul className="list-group list-group-flush chat-list">
            {loading ? (
              <li className="list-group-item bg-dark text-white-50 border-0 text-center">
                <div
                  className="spinner-border text-light"
                  role="status"
                  style={{ width: "1.5rem", height: "1.5rem" }}
                >
                  <span className="visually-hidden">Loading...</span>
                </div>
              </li>
            ) : filtered.length > 0 ? (
              filtered.map((c) => (
                <li key={c.conversation_id} className="history_list">
                  <div className="d-flex justify-content-between align-items-center">
                    <div
                      className="flex-grow-1"
                      onClick={() => onSelectConversation(c.conversation_id)}
                      style={{ cursor: "pointer" }}
                    >
                      {editingId === c.conversation_id ? (
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          onBlur={() => {
                            handleRename(c.conversation_id, editTitle);
                            setEditingId(null);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              handleRename(c.conversation_id, editTitle);
                              setEditingId(null);
                            }
                          }}
                          autoFocus
                          className="form-control form-control-sm bg-dark text-white border-secondary"
                        />
                      ) : (
                        <span>{c.title}</span>
                      )}
                    </div>

                    <div className="d-flex gap-2 ms-2">
                      <Pencil
                        size={16}
                        style={{ cursor: "pointer" }}
                        title="Rename"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingId(c.conversation_id);
                          setEditTitle(c.title || "");
                        }}
                      />
                      <Trash2
                        size={16}
                        style={{ cursor: "pointer" }}
                        title="Delete"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm("Delete this conversation?")) {
                            handleDeleteAndStartNewChat(c.conversation_id);
                          }
                        }}
                      />
                      <Share2
                        size={16}
                        style={{ cursor: "pointer" }}
                        title="Share"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleShare(c.conversation_id);
                        }}
                      />
                    </div>
                  </div>
                </li>
              ))
            ) : (
              <li className="list-group-item bg-dark text-white-50 border-0">
                No chats found.
              </li>
            )}
          </ul>
        </>
      ) : (
        <div className="text-white-50 mt-4">
          <p>
            Please <strong>sign in</strong> to access your chat history.
          </p>
        </div>
      )}
    </div>
  );
};

export default History;