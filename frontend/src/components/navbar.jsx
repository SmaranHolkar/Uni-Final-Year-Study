// Displays the top navigation bar with auth-aware actions and standardized Obsidian Dark design.
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { supabase } from "../supabaseClient";
import { Menu, X } from "lucide-react";

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
    <header className="sticky top-0 z-50 w-full bg-[#121214]/85 backdrop-blur-md border-b border-[#2e2e33]">
      <div className="max-w-[1400px] mx-auto px-6 sm:px-12 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link className="flex items-center gap-2" to="/" onClick={() => setIsOpen(false)}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 260 50" width="160" height="34">
            <defs>
              <path id="nav-star" d="M 0 -6 L 1.5 -1.5 L 6 0 L 1.5 1.5 L 0 6 L -1.5 1.5 L -6 0 L -1.5 -1.5 Z" fill="#fff" />
              <path id="nav-small-star" d="M 0 -4 L 1 -1 L 4 0 L 1 1 L 0 4 L -1 1 L -4 0 L -1 -1 Z" fill="#fff" />
            </defs>
            <g transform="translate(10, -5) scale(0.55)">
              <path d="M 30 20 L 20 80 L 65 40 L 60 55 L 70 70 L 100 65" fill="none" stroke="#fff" strokeWidth="2" strokeLinejoin="round" />
              <use href="#nav-star" x="30" y="20" />
              <use href="#nav-star" x="20" y="80" />
              <use href="#nav-star" x="65" y="40" />
              <use href="#nav-small-star" x="60" y="55" />
              <use href="#nav-small-star" x="70" y="70" />
              <use href="#nav-star" x="100" y="65" />
            </g>
            <text x="75" y="34" fontFamily="system-ui, -apple-system, sans-serif" fontSize="22" fontWeight="700" letterSpacing="-0.3" fill="#f0f0ee">
              HydrusLearn
            </text>
          </svg>
        </Link>

        {/* Desktop Nav Links & Actions */}
        <div className="hidden md:flex items-center gap-6 text-sm text-[#a1a1a6]">
          <a href="/#capabilities" className="hover:text-[#f0f0ee] transition-colors">
            Study Tools
          </a>
          <a href="/#compare-editions" className="hover:text-[#f0f0ee] transition-colors">
            Plans
          </a>
          <a href="/#faq" className="hover:text-[#f0f0ee] transition-colors">
            FAQ
          </a>

          <div className="flex items-center gap-2 pl-4 border-l border-[#2e2e33]">
            {user ? (
              <div className="flex items-center gap-3">
                <Link to="/dashboard" className="btn-secondary py-1.5 px-3.5 text-xs">
                  Dashboard
                </Link>
                <button onClick={handleLogout} className="btn-ghost py-1.5 px-3 text-xs">
                  Logout
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/login" className="btn-ghost py-1.5 px-3.5 text-xs">
                  Log in
                </Link>
                <Link
                  to="/signup"
                  className="btn-primary py-1.5 px-3.5 text-xs"
                >
                  Start free →
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Hamburger Button */}
        <button
          className="md:hidden p-2 text-[#a1a1aa] hover:text-[#f0f0ee]"
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Toggle navigation"
        >
          {isOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {isOpen && (
        <div className="md:hidden border-b border-[#2e2e33] bg-[#18181b] px-6 py-4 space-y-3">
          <a
            href="/#capabilities"
            className="block text-sm text-[#a1a1aa] hover:text-[#f0f0ee] py-1"
            onClick={() => setIsOpen(false)}
          >
            Study Tools
          </a>
          <a
            href="/#compare-editions"
            className="block text-sm text-[#a1a1aa] hover:text-[#f0f0ee] py-1"
            onClick={() => setIsOpen(false)}
          >
            Plans
          </a>
          <a
            href="/#faq"
            className="block text-sm text-[#a1a1aa] hover:text-[#f0f0ee] py-1"
            onClick={() => setIsOpen(false)}
          >
            FAQ
          </a>
          <div className="pt-3 border-t border-[#2e2e33] flex flex-col gap-2">
            {user ? (
              <>
                <Link
                  to="/dashboard"
                  className="btn-primary text-center"
                  onClick={() => setIsOpen(false)}
                >
                  Go to Dashboard
                </Link>
                <button onClick={handleLogout} className="btn-secondary">
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="btn-secondary text-center"
                  onClick={() => setIsOpen(false)}
                >
                  Log in
                </Link>
                <Link
                  to="/signup"
                  className="btn-primary text-center"
                  onClick={() => setIsOpen(false)}
                >
                  Start free →
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
