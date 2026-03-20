import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { supabase } from "../supabaseClient";
import "../App.css";
import "../index.css";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
    setIsOpen(false);
  };

  return (
    <nav className="navbar">
      <Link className="nav-logo" to="/" onClick={() => setIsOpen(false)}>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 50" width="200" height="42">
          <defs>
            <path id="star" d="M 0 -6 L 1.5 -1.5 L 6 0 L 1.5 1.5 L 0 6 L -1.5 1.5 L -6 0 L -1.5 -1.5 Z" fill="#fff"/>
            <path id="small-star" d="M 0 -4 L 1 -1 L 4 0 L 1 1 L 0 4 L -1 1 L -4 0 L -1 -1 Z" fill="#fff"/>
          </defs>
          <g transform="translate(10, -5) scale(0.55)">
            <path d="M 30 20 L 20 80 L 65 40 L 60 55 L 70 70 L 100 65" fill="none" stroke="#fff" strokeWidth="2" strokeLinejoin="round"/>
            <use href="#star" x="30" y="20"/>
            <use href="#star" x="20" y="80"/>
            <use href="#star" x="65" y="40"/>
            <use href="#small-star" x="60" y="55"/>
            <use href="#small-star" x="70" y="70"/>
            <use href="#star" x="100" y="65"/>
          </g>
          <text x="75" y="34" fontFamily="system-ui, -apple-system, sans-serif" fontSize="24" fontWeight="600" fill="#fff">HydrusLearn</text>
        </svg>
      </Link>

      <div className={`nav-links ${isOpen ? "open" : ""}`}>
        <a className="nav-link" href="/#how-it-works" onClick={() => setIsOpen(false)}>How it works</a>
        <a className="nav-link" href="/#faq" onClick={() => setIsOpen(false)}>FAQ</a>
        {user ? (
          <button className="logout-btn" onClick={handleLogout}>
            Logout
          </button>
        ) : (
          <div style={{ display: "flex", gap: "0.6rem" }}>
            <Link className="shadow__btn shadow__btn--ghost" to="/login" onClick={() => setIsOpen(false)}>
              Login
            </Link>
            <Link to="/signup" className="shadow__btn" onClick={() => setIsOpen(false)}>
              Sign up
            </Link>
          </div>
        )}
      </div>

      <button
        className="hamburger"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle navigation"
      >
        ☰
      </button>
    </nav>
  );
};

export default Navbar;
