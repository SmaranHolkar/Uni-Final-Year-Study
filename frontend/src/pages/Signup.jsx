import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Eye, EyeOff, AlertCircle, CheckCircle } from "lucide-react";
import { supabase } from "../supabaseClient";
import { Skeleton } from "../components/Skeleton.jsx";
import { useSEO } from "../hooks/useSEO";

// Signup page with standardized Obsidian Dark design
export default function Signup() {
  useSEO({
    title: "Sign Up | HydrusLearn — Smart AI Study Workspace",
    description: "Create your free HydrusLearn account. Upload lecture notes, generate practice quizzes, and master tough concepts.",
    path: "/signup",
  });
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

  const renderLoadingSkeleton = () => (
    <div className="w-full max-w-md card-standard" aria-hidden>
      <Skeleton style={{ height: '1.45rem', width: '10rem' }} />
      <Skeleton className="mt-2" style={{ height: '0.85rem', width: '15rem' }} />

      <div className="mt-6 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Skeleton style={{ height: '0.75rem', width: '5rem' }} />
            <Skeleton className="mt-2" rounded="10px" style={{ height: '2.5rem', width: '100%' }} />
          </div>
          <div>
            <Skeleton style={{ height: '0.75rem', width: '5rem' }} />
            <Skeleton className="mt-2" rounded="10px" style={{ height: '2.5rem', width: '100%' }} />
          </div>
        </div>
        <div>
          <Skeleton style={{ height: '0.75rem', width: '6rem' }} />
          <Skeleton className="mt-2" rounded="10px" style={{ height: '2.5rem', width: '100%' }} />
        </div>
        <div>
          <Skeleton style={{ height: '0.75rem', width: '5.2rem' }} />
          <Skeleton className="mt-2" rounded="10px" style={{ height: '2.5rem', width: '100%' }} />
        </div>
        <Skeleton style={{ height: '0.75rem', width: '13rem' }} />
        <Skeleton rounded="10px" style={{ height: '2.6rem', width: '100%' }} />
      </div>
    </div>
  );

  async function handleSignup(e) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!firstName.trim() || !lastName.trim()) return setError("Please enter your full name.");
    if (!email.trim()) return setError("Please enter your email address.");
    if (password.length < 6) return setError("Password must be at least 6 characters.");
    if (!agreedToTerms) return setError("Please agree to the Terms & Conditions.");
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;
    if (!passwordRegex.test(password))
      return setError("Password must include uppercase, lowercase, a digit, and a symbol (minimum 8 characters).");

    setLoading(true);
    try {
      const { data, error: signupError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { first_name: firstName, last_name: lastName } },
      });

      if (signupError) throw signupError;

      if (data.user) {
        setSuccess("Account created! Check your email to confirm.");
        setTimeout(() => navigate("/login"), 3000);
      }
    } catch (err) {
      console.error("Signup error:", err);
      setError("Unable to create account. Please try again");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[90vh] flex items-center justify-center px-4 py-12">
      {loading && renderLoadingSkeleton()}

      {!loading && (
        <div className="w-full max-w-md card-standard">
          <h1 className="mb-2 text-2xl font-normal text-[#f0f0ee] tracking-tight">
            Create your account
          </h1>
          <p className="mb-6 text-sm text-[#a1a1a6]">
            Start testing your knowledge and acing your exams today.
          </p>

          {error && (
            <div
              id="signup-form-error"
              role="alert"
              aria-live="assertive"
              aria-atomic="true"
              className="mb-5 flex items-center gap-2 rounded-[10px] border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-xs text-red-300"
            >
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div
              role="status"
              aria-live="polite"
              aria-atomic="true"
              className="mb-5 flex items-center gap-2 rounded-[10px] border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2.5 text-xs text-emerald-300"
            >
              <CheckCircle size={16} />
              <span>{success}</span>
            </div>
          )}

          <form onSubmit={handleSignup} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="signup-first-name" className="mb-1.5 block text-xs font-medium text-[#f0f0ee]">
                  First name
                </label>
                <input
                  id="signup-first-name"
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  disabled={loading}
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? "signup-form-error" : undefined}
                  placeholder="Jane"
                  className="input-standard"
                />
              </div>
              <div>
                <label htmlFor="signup-last-name" className="mb-1.5 block text-xs font-medium text-[#f0f0ee]">
                  Last name
                </label>
                <input
                  id="signup-last-name"
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  disabled={loading}
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? "signup-form-error" : undefined}
                  placeholder="Doe"
                  className="input-standard"
                />
              </div>
            </div>

            <div>
              <label htmlFor="signup-email" className="mb-1.5 block text-xs font-medium text-[#f0f0ee]">
                Email address
              </label>
              <input
                id="signup-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? "signup-form-error" : undefined}
                placeholder="you@university.edu"
                className="input-standard"
              />
            </div>

            <div>
              <label htmlFor="signup-password" className="mb-1.5 block text-xs font-medium text-[#f0f0ee]">
                Password
              </label>
              <div className="relative">
                <input
                  id="signup-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? "signup-form-error" : undefined}
                  placeholder="At least 8 characters (mixed case, digit, symbol)"
                  className="input-standard pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                  className="absolute inset-y-0 right-3 flex items-center text-[#a1a1a6] hover:text-[#f0f0ee] transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <label htmlFor="signup-terms" className="flex cursor-pointer items-start gap-2.5 text-xs text-[#a1a1a6] pt-1">
              <input
                id="signup-terms"
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="rounded border-[#2e2e33] bg-[#131519] accent-[#f0f0ee] mt-0.5"
              />
              <span>
                I agree to the{" "}
                <Link
                  to="/terms"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#f0f0ee] hover:underline"
                >
                  Terms &amp; Conditions
                </Link>{" "}
                and{" "}
                <Link
                  to="/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#f0f0ee] hover:underline"
                >
                  Privacy Policy
                </Link>
              </span>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full mt-2"
            >
              {loading ? "Creating account..." : "Create free account"}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-[#a1a1a6]">
            Already have an account?{" "}
            <Link to="/login" className="text-[#f0f0ee] font-medium hover:underline ml-1">
              Log in here
            </Link>
          </p>
        </div>
      )}
    </div>
  );
}
