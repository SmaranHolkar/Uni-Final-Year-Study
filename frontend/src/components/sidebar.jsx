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
        <nav>
          <Link to="MultiStepForm " className="sidebar-primary" onClick={() => setOpen(false)}>
            Start Study Session
          </Link>

          

          <h1>History</h1>

        </nav>
      </div>
      </aside>
    </>
  );
};

export default Sidebar;
