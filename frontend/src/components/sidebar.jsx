import React, { useEffect, useRef, useState } from "react";
import { NavLink, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { supabase } from "../supabaseClient";
import "../App.css";
import "../index.css";
import { 
  LayoutDashboard, 
  PlayCircle, 
  History, 
  Lightbulb, 
  ShoppingCart, 
  LogOut,
  BookOpen,
  User as UserIcon
} from "lucide-react";

// Handles Sidebar logic.
const Sidebar = () => {
  const [open, setOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(max-width: 768px)").matches;
  });
  const { user } = useAuth();
  const navigate = useNavigate();
  const toggleButtonRef = useRef(null);
  const sidebarRef = useRef(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mediaQuery = window.matchMedia("(max-width: 768px)");
    const updateMobileState = (event) => {
      setIsMobile(event.matches);
    };

    setIsMobile(mediaQuery.matches);
    mediaQuery.addEventListener("change", updateMobileState);

    return () => {
      mediaQuery.removeEventListener("change", updateMobileState);
    };
  }, []);

  const closeSidebar = () => {
    const activeElement = document.activeElement;
    if (sidebarRef.current?.contains(activeElement)) {
      toggleButtonRef.current?.focus();
    }
    setOpen(false);
  };

  const sidebarVisible = !isMobile || open;

  // Handles handleLogout logic.
  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
    closeSidebar(); // Close sidebar after logout
  };

  return (
    <>
      <button
        ref={toggleButtonRef}
        className={`sidebar-toggle ${open ? "open" : ""}`}
        aria-label="Toggle sidebar"
        aria-expanded={sidebarVisible}
        aria-controls="app-sidebar"
        onClick={() => {
          if (open) {
            closeSidebar();
            return;
          }
          setOpen(true);
        }}
      >
        {open ? "✕" : "☰"}
      </button>

      <aside
        id="app-sidebar"
        ref={sidebarRef}
        className={`sidebar ${open ? "open" : ""}`}
        aria-hidden={!sidebarVisible}
        inert={isMobile && !open ? true : undefined}
      >
        <div className="sidebar-content">
          {/* Logo/Header */}
          <Link to="/dashboard" className="sidebar-logo" onClick={closeSidebar}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 50" width="180" height="40">
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
            <NavLink to="/Profile" className="sidebar-link" onClick={closeSidebar}>
              <UserIcon size={18} /> Profile
            </NavLink>
          )}

          {/* Dashboard */}
          {user && (
            <NavLink to="/dashboard" className="sidebar-link" onClick={closeSidebar}>
              <LayoutDashboard size={18} /> Dashboard
            </NavLink>
          )}

          {/* Grounded Studio */}
          {user && (
            <NavLink to="/grounded-studio" className="sidebar-link" onClick={closeSidebar}>
              <BookOpen size={18} /> Grounded Studio
            </NavLink>
          )}

          {/* Start Study Session */}
          {user && (
            <NavLink to="/Learningpage" className="sidebar-primary" onClick={closeSidebar}>
              <PlayCircle size={18} /> Start Session
            </NavLink>
          )}

          {/* History */}
          {user && (
            <NavLink to="/history" className="sidebar-link" onClick={closeSidebar}>
              <History size={18} /> History
            </NavLink>
          )}

          {/* Learning playground */}
          {user && (
            <NavLink to="/Learningplayground" className="sidebar-link" onClick={closeSidebar}>
              <Lightbulb size={18} /> Playground
            </NavLink>
          )}


          {/* Marketplace */}
          {user && (
            <NavLink to="/marketplace" className="sidebar-link" onClick={closeSidebar}>
              <ShoppingCart size={18} /> Marketplace
            </NavLink>
          )}

          {/* Logout at bottom */}
          {user && (
            <button className="sidebar-logout" onClick={handleLogout}>
              <LogOut size={18} /> Logout
            </button>
          )}

          {/* Login link for guests */}
          {!user && (
            <Link to="/login" className="sidebar-link" onClick={closeSidebar}>
              Login
            </Link>
          )}
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
