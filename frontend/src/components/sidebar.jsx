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
            HydrusLearn
          </Link>

          {/* Profile */}
          {user && (
            <Link to="/profile" className="sidebar-link" onClick={() => setOpen(false)}>
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