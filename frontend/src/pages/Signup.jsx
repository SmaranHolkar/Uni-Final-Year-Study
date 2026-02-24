import React, { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Eye, EyeOff, AlertCircle, CheckCircle, ArrowRight } from "lucide-react";
import { supabase } from "../supabaseClient";

// --- Reusing the Constellation Background for consistency ---
const ConstellationCanvas = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let animationFrameId;
    let particles = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    class Particle {
      constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.vx = (Math.random() - 0.5) * 0.5;
        this.vy = (Math.random() - 0.5) * 0.5;
        this.size = Math.random() * 2 + 1;
      }
      update() {
        this.x += this.vx;
        this.y += this.vy;
        if (this.x < 0 || this.x > canvas.width) this.vx *= -1;
        if (this.y < 0 || this.y > canvas.height) this.vy *= -1;
      }
      draw() {
        ctx.fillStyle = "rgba(99, 102, 241, 0.5)";
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    const init = () => {
      particles = [];
      const numberOfParticles = Math.floor((canvas.width * canvas.height) / 15000);
      for (let i = 0; i < numberOfParticles; i++) particles.push(new Particle());
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p, index) => {
        p.update();
        p.draw();
        for (let j = index + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance < 100) {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(99, 102, 241, ${1 - distance / 100})`;
            ctx.lineWidth = 0.5;
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }
      });
      animationFrameId = requestAnimationFrame(animate);
    };

    window.addEventListener("resize", () => { resize(); init(); });
    resize(); init(); animate();
    return () => { window.removeEventListener("resize", resize); cancelAnimationFrame(animationFrameId); };
  }, []);

  return (
    <canvas ref={canvasRef} style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", zIndex: 0, opacity: 0.6, pointerEvents: "none" }} />
  );
};

export default function Signup() {
  const [showPassword, setShowPassword] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const navigate = useNavigate();

  // Shared Input Styles
  const inputStyle = {
    width: "100%",
    padding: "0.75rem 1rem",
    borderRadius: "0.5rem",
    background: "rgba(15, 23, 42, 0.6)", // Dark input bg
    border: "1px solid rgba(148, 163, 184, 0.2)",
    color: "#fff",
    outline: "none",
    fontSize: "0.95rem",
    transition: "border-color 0.2s, box-shadow 0.2s"
  };

  const handleFocus = (e) => {
    e.target.style.borderColor = "#6366f1";
    e.target.style.boxShadow = "0 0 0 3px rgba(99, 102, 241, 0.2)";
  };

  const handleBlur = (e) => {
    e.target.style.borderColor = "rgba(148, 163, 184, 0.2)";
    e.target.style.boxShadow = "none";
  };

  async function handleSignup(e) {
    e.preventDefault();
    setError(""); setSuccess("");

    if (!firstName.trim() || !lastName.trim()) return setError("Please enter your full name.");
    if (!email.trim()) return setError("Please enter your email.");
    if (password.length < 6) return setError("Password must be at least 6 characters.");
    if (!agreedToTerms) return setError("You must agree to the Terms & Conditions.");

    setLoading(true);
    try {
      const { data, error: signupError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { first_name: firstName, last_name: lastName } },
      });

      if (signupError) throw signupError;

      if (data.user) {
        setSuccess("Account created! check your email to confirm.");
        setTimeout(() => navigate("/login"), 3000);
      }
    } catch (err) {
      setError(err.message || "Signup failed");
    } finally { setLoading(false); }
  }

  return (
    <div style={{ 
      minHeight: "100vh", 
      display: "flex", 
      alignItems: "center", 
      justifyContent: "center", 
      background: 'radial-gradient(circle at 50% 50%, #1e1b4b 0%, #0f172a 100%)', // Match Hero
      position: 'relative',
      fontFamily: "'Inter', sans-serif",
      padding: '1rem'
    }}>
      
      <ConstellationCanvas />

      <div style={{ 
        width: "100%", 
        maxWidth: "480px", 
        padding: "2.5rem", 
        borderRadius: "1.5rem", 
        background: 'rgba(255, 255, 255, 0.03)', 
        backdropFilter: 'blur(16px)', 
        border: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        position: 'relative',
        zIndex: 10
      }}>
        
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ fontSize: "2rem", fontWeight: 700, color: "#fff", marginBottom: "0.5rem" }}>
            Join HydrusLearn
          </h1>
          <p style={{ color: "#94a3b8", fontSize: "1rem" }}>
            Start your AI-powered learning journey.
          </p>
        </div>

        {error && (
          <div style={{ 
            display: "flex", alignItems: "center", gap: "0.5rem", 
            padding: "0.75rem", borderRadius: "0.5rem", marginBottom: "1.5rem", 
            background: "rgba(239, 68, 68, 0.1)", color: "#fca5a5", border: "1px solid rgba(239, 68, 68, 0.2)", fontSize: "0.9rem"
          }}>
            <AlertCircle size={18} /> {error}
          </div>
        )}

        {success && (
          <div style={{ 
            display: "flex", alignItems: "center", gap: "0.5rem",
            padding: "0.75rem", borderRadius: "0.5rem", marginBottom: "1.5rem", 
            background: "rgba(34, 197, 94, 0.1)", color: "#86efac", border: "1px solid rgba(34, 197, 94, 0.2)", fontSize: "0.9rem"
          }}>
            <CheckCircle size={18} /> {success}
          </div>
        )}

        <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          <div style={{ display: 'flex', gap: '1rem' }}>
            <input
              style={inputStyle}
              placeholder="First name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              onFocus={handleFocus}
              onBlur={handleBlur}
            />
            <input
              style={inputStyle}
              placeholder="Last name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              onFocus={handleFocus}
              onBlur={handleBlur}
            />
          </div>

          <input
            style={inputStyle}
            placeholder="Email address"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onFocus={handleFocus}
            onBlur={handleBlur}
          />

          <div style={{ position: "relative" }}>
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Create a password"
              style={inputStyle}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onFocus={handleFocus}
              onBlur={handleBlur}
            />
            <button
              type="button"
              style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#94a3b8", cursor: "pointer" }}
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          <label style={{ display: "flex", alignItems: "center", gap: "0.75rem", cursor: "pointer", color: "#cbd5e1", fontSize: "0.9rem" }}>
            <input
              type="checkbox"
              checked={agreedToTerms}
              onChange={(e) => setAgreedToTerms(e.target.checked)}
              style={{ accentColor: "#6366f1", width: "16px", height: "16px" }}
            />
            <span>I agree to the <b>Terms & Conditions</b></span>
          </label>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "0.85rem",
              borderRadius: "2rem", // Rounded button match
              background: loading ? "#475569" : "linear-gradient(90deg, #6366f1, #3b82f6)",
              color: "#fff",
              fontWeight: 600,
              border: "none",
              cursor: loading ? "not-allowed" : "pointer",
              fontSize: "1rem",
              marginTop: "0.5rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
              transition: "transform 0.2s, box-shadow 0.2s",
              boxShadow: "0 4px 15px rgba(99, 102, 241, 0.3)"
            }}
            onMouseEnter={(e) => !loading && (e.target.style.transform = "translateY(-2px)")}
            onMouseLeave={(e) => !loading && (e.target.style.transform = "translateY(0)")}
          >
            {loading ? "Creating Account..." : <>Get Started <ArrowRight size={18} /></>}
          </button>
        </form>

        <p style={{ textAlign: "center", marginTop: "2rem", fontSize: "0.95rem", color: "#94a3b8" }}>
          Already have an account?{" "}
          <Link to="/login" style={{ color: "#818cf8", fontWeight: 600, textDecoration: "none" }}>
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}