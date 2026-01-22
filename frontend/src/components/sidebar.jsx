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

  if (!user) return null;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
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

      <aside className={`sidebar ${open ? "open" : ""}`}>
        <div className="sidebar-content">
          {/* Logo */}
          <Link
            to="/dashboard"
            className="sidebar-logo"
            onClick={() => setOpen(false)}
          >
            HydrusLearn
          </Link>

          {/* Navigation Links */}
          <nav className="sidebar-nav">
            <Link
              to="/profile"
              className="sidebar-link"
              onClick={() => setOpen(false)}
            >
              Profile
            </Link>

            <Link
              to="/dashboard"
              className="sidebar-link"
              onClick={() => setOpen(false)}
            >
              Dashboard
            </Link>
          </nav>

          {/* Primary Action */}
          <Link
            to="/learningpage"
            className="sidebar-primary"
            onClick={() => setOpen(false)}
          >
            Start Study Session
          </Link>

          {/* History Section (only heading removed, no links) */}
          <h4 className="sidebar-section">History</h4>
          {/* "Past Sessions" link removed per request */}

          {/* Logout Button */}
          <button className="sidebar-logout" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;