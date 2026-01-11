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
      <Link className="nav-logo" to="/" onClick={() => setIsOpen(false)}>HydrusLearn</Link>

      <div className={`nav-links ${isOpen ? "open" : ""}`}>
        <Link className="nav-link" to="/learningpage" onClick={() => setIsOpen(false)}>Learn</Link>
        <Link className="nav-link" to="/Dashboard" onClick={() => setIsOpen(false)}>Dashboard</Link>
        <Link className="nav-link" to="/profile" onClick={() => setIsOpen(false)}>Profile</Link>
        {user ? (
          <button className="logout-btn" onClick={handleLogout}>
            Logout
          </button>
        ) : (
          <Link className="shadow__btn" to="/login" onClick={() => setIsOpen(false)}>
            Login
          </Link>
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
