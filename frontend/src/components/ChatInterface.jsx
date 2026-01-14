import React, { useState, useEffect, useRef } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPenToSquare,
  faStop,
  faSpinner,
} from "@fortawesome/free-solid-svg-icons";
import aivis from "../assets/ai-assistant.png";
import Typewriter from "./Typewriter";
import ChatInput from "./ChatInput";
import supabase from "../utils/supabaseClient";
import RecalloVisual3D from "../components/RecalloVisual3D";
import History from "./History";

const ChatInterface = () => {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [controller, setController] = useState(null);
  const [userId, setUserId] = useState(null);
  const [user, setUser] = useState(null);
  const [useDocumentMode, setUseDocumentMode] = useState(false);
  const chatContainerRef = useRef(null);

  const [isHistoryOpen, setIsHistoryOpen] = useState(true);
  const [currentConv, setCurrentConv] = useState(null);
  const [conversations, setConversations] = useState([]);
  
  useEffect(() => {
    const fetchUser = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (!error && data?.user) {
        setUser(data.user);
      }
    };
    fetchUser();
  }, []);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    const fetchSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        setUserId(session.user.id);
        fetchConversations(session.user.id);
      }else {
        setUserId(null);      
        setConversations([]);  
      }
    };
    fetchSession();
  }, []);

  const fetchConversations = async (userId) => {
    try {
      const response = await fetch(`http://127.0.0.1:5000/api/conversations?user_id=${userId}`);
      if (response.ok) {
        const data = await response.json();
        setConversations(data);
      }
    } catch (error) {
      console.error("Error fetching conversations:", error);
    }
  };

  const handleNewConversation = async () => {
    if (!userId) return null;
    
    try {
      const response = await fetch("http://127.0.0.1:5000/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId }),
      });
      if (response.ok) {
        const newConversation = await response.json();
        const newConvId = newConversation.conversation_id;
        setCurrentConv(newConvId);
        setMessages([]);
        setConversations(prev => [newConversation, ...prev]);
        return newConvId;
      } else {
        console.error("Failed to create new conversation");
        return null;
      }
    } catch (error) {
      console.error("Error creating new conversation:", error);
      return null;
    }
  };

  const handleDeleteAndStartNewChat = async (conversationId) => {
    try {
      await fetch(`http://127.0.0.1:5000/api/conversations/${conversationId}`, {
        method: "DELETE",
      });
      setConversations(prev => prev.filter(c => c.conversation_id !== conversationId));
      if (conversationId === currentConv) {
        const newId = await handleNewConversation();
        if (newId) {
          setCurrentConv(newId);
          setMessages([]);
        }
      }
    } catch (err) {
      console.error("Error deleting conversation:", err);
    }
  };

  const handleSelectConversation = async (convId) => {
    setCurrentConv(convId);
    try {
      const response = await fetch(`http://127.0.0.1:5000/api/conversations/${convId}/logs`);
      if (response.ok) {
        const logs = await response.json();
        const convertedMessages = logs.flatMap((log, i) => [
          { id: log.message_id ?? `u-${i}`, type: "user", text: log.user_message },
          { id: log.message_id != null ? `a-${log.message_id}` : `a-${i}`, type: "ai", text: log.response_message }
        ]);
        setMessages(convertedMessages);
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
      setMessages([]);
    }
  };

  const handleSend = async () => {
    if (input.trim() === "") return;

    if (controller) controller.abort();
    const abortController = new AbortController();
    setController(abortController);

    const userMsg = {
      id: Date.now(),
      type: "user",
      text: input,
    };

    const processingMsg = {
      id: "loading-spinner",
      type: "ai",
      text: "Recallo is processing...",
      isProcessing: true,
    };

    setMessages((prev) => [...prev, userMsg, processingMsg]);
    setInput("");
    setLoading(true);

    try {
      const requestBody = { message: input, user_id: userId };
      if (currentConv) requestBody.conversation_id = currentConv;

      const response = await fetch(`http://127.0.0.1:5000/api/${useDocumentMode ? "ask" : "chat"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
        signal: abortController.signal,
      });

      const data = await response.json();

      if (data.conversation_id) {
        const wasNew = !currentConv;
        setCurrentConv(data.conversation_id);

        if (wasNew) {
          // Add placeholder conversation immediately
          setConversations(prev => [{
            conversation_id: data.conversation_id,
            title: "New Chat",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }, ...prev]);

          // Fetch fresh conversations from backend after a delay
          setTimeout(() => {
            fetch(`http://127.0.0.1:5000/api/conversations?user_id=${userId}`)
              .then(res => res.ok ? res.json() : Promise.reject("Failed to fetch"))
              .then(fresh => setConversations(fresh))
              .catch(console.error);
          }, 1500); // gives time for backend to generate smart title
        }
      }


      const aiReply = {
        id: Date.now() + 1,
        type: "ai",
        text: data.response || "Sorry, I couldn't generate a response.",
      };

      setMessages((prev) =>
        prev.map((msg) => (msg.id === "loading-spinner" ? aiReply : msg))
      );
    } catch (error) {
      console.error("Error:", error);
      const errorReply = {
        id: Date.now() + 2,
        type: "ai",
        text:
          error.name === "AbortError"
            ? "⚠️ Response stopped by user."
            : "⚠️ Something went wrong. Please try again.",
      };
      setMessages((prev) =>
        prev.map((msg) => (msg.id === "loading-spinner" ? errorReply : msg))
      );
    } finally {
      setLoading(false);
      setController(null);
    }
  };

  const handleFileSelect = (file) => {
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now(),
        type: "user",
        text: `📎 Uploaded: ${file.name}`,
      },
    ]);
  };

  const handleEdit = (id) => {
    const toEdit = messages.find((msg) => msg.id === id);
    if (toEdit) {
      setInput(toEdit.text);
      setMessages(messages.filter((msg) => msg.id !== id));
    }
  };

  const handleStop = () => {
    if (controller) {
      controller.abort();
      setController(null);
    }
    setLoading(false);
  };

  const isLastAiMessage = (index, msg) =>
    msg.type === "ai" && index === messages.length - 1;

  // Don't render if user is not authenticated
  if (!user) {
    return (
      <div className="chatinterface d-flex justify-content-center align-items-center" style={{ height: "100vh" }}>
        <div className="text-center">
          <h3>Please sign in to access the chat</h3>
          <button 
            className="btn btn-primary mt-3"
            onClick={() => window.location.href = '/signin'}
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="chatinterface" style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      <History
        isLoggedIn={!!user}
        isHistoryOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        userId={userId}
        onSelectConversation={handleSelectConversation}
        onNewConversation={handleNewConversation}
        conversations={conversations}
        onDeleteAndStartNewChat={handleDeleteAndStartNewChat}
        currentConv={currentConv}
        setCurrentConv={setCurrentConv}
        setMessages={setMessages}
      />

      <div className="chat-response-section" ref={chatContainerRef} style={{ flexGrow: 1, overflowY: "auto", padding: "10px", marginBottom: "50px" }}>
        <div className="chat-header text-center mb-4">
          <RecalloVisual3D />
          <h2 className="grad_text mt-2">
            Hello{user?.user_metadata?.full_name ? `, ${user.user_metadata.full_name}` : ""}! Ask Recallo
          </h2>
        </div>

        {messages.map((msg, index) => (
          <div key={msg.id} className={`chat-response ${msg.type}`}>
            {msg.type === "user" ? (
              <>
                <p style={{ whiteSpace: "pre-wrap", marginBottom: 0 }}>
                  <strong style={{ display: "block", marginBottom: "10px" }}>You:</strong>
                  {msg.text}
                </p>
                <div className="message-actions d-flex mt-3">
                  <button className="btn chat_ic me-2" onClick={() => handleEdit(msg.id)}>
                    <FontAwesomeIcon icon={faPenToSquare} style={{ color: "#ffffff" }} />
                  </button>
                  <button className="btn chat_ic" onClick={handleStop}>
                    <FontAwesomeIcon icon={faStop} style={{ color: "#ffffff" }} />
                  </button>
                </div>
              </>
            ) : (
              <div>
                <strong className="d-flex align-items-center mb-3 ai_response">
                  <img src={aivis} alt="ai_visualiser" className="img-fluid visual_img rec_img" />
                  Recallo:
                </strong>
                {msg.isProcessing ? (
                  <div className="processing-spinner">
                    <FontAwesomeIcon icon={faSpinner} spin /> Recallo is processing...
                  </div>
                ) : (
                  <Typewriter key={msg.id} text={msg.text} shouldAnimate={isLastAiMessage(index, msg)} />
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <ChatInput
        input={input}
        setInput={setInput}
        handleSend={handleSend}
        handleStop={handleStop}
        loading={loading}
        useDocumentMode={useDocumentMode}
        setUseDocumentMode={setUseDocumentMode}
        handleFileSelect={handleFileSelect}
      />
    </div>
  );
};

export default ChatInterface;