import React from "react";
import { ListTodo, FileSliders, ListTree, Notebook, ChartPie, BookOpenCheck, FolderArchive, History, User, Cog  } from 'lucide-react';
import recalloLogo from "../assets/recallo.png";
import { Link, useLocation } from "react-router-dom";
import { EqualApproximately } from "lucide-react";
import { MessageCircle } from "lucide-react";

const menuItems = [
  { icon: <ListTodo />, label: "To-Do List", path: "/todo" },
  // { icon: <FileSliders />, label: "Your Resources", path: "/resource" },
  { icon: <ListTree />, label: "Create Topics", path: "/topics" },
  { icon: <Notebook />, label: "Study Metrics", path: "/studymetrics" },
  { icon: <ChartPie />, label: "Progress", path: "/progress" },
  { icon: <BookOpenCheck />, label: "Exams", path: "/exam" },
  { icon:  <FolderArchive />, label: "Archive Topics", path: "/archive" },
  { icon:  <Cog />, label: "Settings", path: "/settings" },
];

const Sidebar = ({
  isOpen,
  toggleSidebar,
  toggleHistory,
  isHistoryOpen,
  isLoggedIn,
}) => {
  const location = useLocation(); // 👈 Current route

  const handleSidebarToggle = () => {
    toggleSidebar();
    if (isHistoryOpen) toggleHistory();
  };

  return (
    <div className={`sidebar ${isOpen ? "open" : "collapsed"}`}>
      <div className="sidebar-header d-flex align-items-center justify-content-between p-3">
        {isOpen && (
          <a href="/">
            <img
              src={recalloLogo}
              alt="Recallo Logo"
              className="img-fluid logo"
              style={{ maxWidth: "120px" }}
            />
          </a>
        )}
        <EqualApproximately
          onClick={handleSidebarToggle}
          className="toggle-icon sidebar-toggler"
          style={{ color: "#ffffff", cursor: "pointer", fontSize: "1.5rem" }}
        />
      </div>

      {isLoggedIn ? (
        <>
          <ul className="sidebar-menu">
            {menuItems.map((item, index) => {
              const isActive = location.pathname === item.path;
              return (
                <li
                  key={index}
                  className="menu-item"
                  style={{
                    backgroundColor: isActive
                      ? "var(--cs-border)"
                      : "transparent",
                    borderRadius: "8px",
                  }}
                >
                  <Link
                    to={item.path}
                    className="d-flex align-items-center text-white text-decoration-none w-100"
                  >
                    <span className="icon me-2">{item.icon}</span>
                    {isOpen && <span className="label">{item.label}</span>}
                  </Link>
                </li>
              );
            })}

            <li
              onClick={toggleHistory}
              className="d-flex align-items-center mb-3 text-white"
              style={{
                cursor: "pointer",
                backgroundColor: isHistoryOpen
                  ? "var(--cs-border)"
                  : "transparent",
                borderRadius: "8px",
              }}
            >
              <span className="icon ">
                <History />
              </span>
              {isOpen && <span className="label">History</span>}
            </li>
          </ul>

          <div className="profile_section">
            <li
              className="menu-item"
              style={{
                backgroundColor:
                  location.pathname === "/profile"
                    ? "var(--cs-border)"
                    : "transparent",
                borderRadius: "8px",
              }}
            >
              <Link
                to="/profile"
                className="d-flex align-items-center text-white text-decoration-none w-100"
              >
                <span className="icon me-2">
                  <User />
                </span>
                {isOpen && <span className="label">Profile</span>}
              </Link>
            </li>
            {/* Return to Chat */}
            {location.pathname !== "/chat" && (
              <li
                className="menu-item chat_return"
                style={{
                  backgroundColor:
                    location.pathname === "/chat"
                      ? "var(--cs-border)"
                      : "transparent",
                  borderRadius: "8px",
                }}
              >
                <Link
                  to="/chat"
                  className="d-flex align-items-center text-white text-decoration-none w-100"
                >
                  <span className="icon me-2 cicon">
                    <MessageCircle />
                  </span>
                  {isOpen && <span className="label chat_label">Return to Chat</span>}
                </Link>
              </li>
            )}
          </div>
        </>
      ) : (
        isOpen && (
          <div className="sidebar-login-message text-center mt-4">
            <p className="mb-4 text-start">
              Recallo is much more than that. <br />
              <strong>Sign in to start your study journey!</strong>
            </p>
            <div className="d-flex flex-column gap-2">
              <Link to="/signin" className="btn btn-cs">
                Log In
              </Link>
              <Link to="/signin" className="btn btn-cs">
                Sign Up
              </Link>
            </div>
          </div>
        )
      )}
    </div>
  );
};

export default Sidebar;
