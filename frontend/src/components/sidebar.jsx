import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { supabase } from "../supabaseClient";
import "../App.css";
import "../index.css";

const Sidebar = () => {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
    setOpen(false); // Close sidebar after logout
  };

  return (
    <>
      <button
        className="sidebar-toggle"
        aria-label="Toggle sidebar"
        onClick={() => setOpen((s) => !s)}
      >
        {open ? "✕" : "☰"}
      </button>

      <aside className={`sidebar ${open ? "open" : ""}`} aria-hidden={!open}>
        <div className="sidebar-content">
          {/* Logo/Header */}
          <Link to="/dashboard" className="sidebar-logo" onClick={() => setOpen(false)}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 50" width="240" height="52">
              <defs>
                <path id="sb-star" d="M 0 -6 L 1.5 -1.5 L 6 0 L 1.5 1.5 L 0 6 L -1.5 1.5 L -6 0 L -1.5 -1.5 Z" fill="#fff"/>
                <path id="sb-small-star" d="M 0 -4 L 1 -1 L 4 0 L 1 1 L 0 4 L -1 1 L -4 0 L -1 -1 Z" fill="#fff"/>
              </defs>
              <g transform="translate(10, -5) scale(0.55)">
                <path d="M 30 20 L 20 80 L 65 40 L 60 55 L 70 70 L 100 65" fill="none" stroke="#fff" strokeWidth="2" strokeLinejoin="round"/>
                <use href="#sb-star" x="30" y="20"/>
                <use href="#sb-star" x="20" y="80"/>
                <use href="#sb-star" x="65" y="40"/>
                <use href="#sb-small-star" x="60" y="55"/>
                <use href="#sb-small-star" x="70" y="70"/>
                <use href="#sb-star" x="100" y="65"/>
              </g>
              <text x="75" y="34" fontFamily="system-ui, -apple-system, sans-serif" fontSize="24" fontWeight="600" fill="#fff">HydrusLearn</text>
            </svg>
          </Link>

          {/* Profile */}
          {user && (
            <Link to="/Profile" className="sidebar-link" onClick={() => setOpen(false)}>
              Profile
            </Link>
          )}

          {/* Dashboard */}
          {user && (
            <Link to="/dashboard" className="sidebar-link" onClick={() => setOpen(false)}>
              Dashboard
            </Link>
          )}

          {/* Start Study Session */}
          {user && (
            <Link to="/Learningpage" className="sidebar-primary" onClick={() => setOpen(false)}>
              Start Study Session
            </Link>
          )}

          {/* History */}
          {user && (
            <Link to="/history" className="sidebar-link" onClick={() => setOpen(false)}>
              History
            </Link>
          )}

          {/* Learning playground */}
          {user && (
            <Link to="/Learningplayground" className="sidebar-link" onClick={() => setOpen(false)}>
              Learning Playground
            </Link>
          )}

          {/* Logout at bottom */}
          {user && (
            <button className="sidebar-logout" onClick={handleLogout}>
              Logout
            </button>
          )}

          {/* Login link for guests */}
          {!user && (
            <Link to="/login" className="sidebar-link" onClick={() => setOpen(false)}>
              Login
            </Link>
          )}
        </div>
      </aside>
    </>
  );
};

export default Sidebar;