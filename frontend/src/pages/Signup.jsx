import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Eye, EyeOff, AlertCircle, CheckCircle } from "lucide-react";
import { supabase } from "../supabaseClient";
import { Skeleton } from "../components/Skeleton.jsx";
import { useSEO } from "../hooks/useSEO";

// Signup page with form validation and error handling
export default function Signup() {
  useSEO({
    title: "Sign Up Free | HydrusLearn — AI Study Tool",
    description: "Create your free HydrusLearn account. Upload your notes and start generating quizzes, flashcards, and deep study insights in seconds. No credit card required.",
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
    <div className="w-full max-w-md rounded-xl bg-[var(--card)] p-8 shadow-lg" aria-hidden>
      <Skeleton style={{ height: '1.45rem', width: '10rem' }} />
      <Skeleton className="mt-2" style={{ height: '0.85rem', width: '15rem' }} />

      <div className="mt-6 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Skeleton style={{ height: '0.75rem', width: '5rem' }} />
            <Skeleton className="mt-2" rounded="0.4rem" style={{ height: '2.4rem', width: '100%' }} />
          </div>
          <div>
            <Skeleton style={{ height: '0.75rem', width: '5rem' }} />
            <Skeleton className="mt-2" rounded="0.4rem" style={{ height: '2.4rem', width: '100%' }} />
          </div>
        </div>
        <div>
          <Skeleton style={{ height: '0.75rem', width: '6rem' }} />
          <Skeleton className="mt-2" rounded="0.4rem" style={{ height: '2.4rem', width: '100%' }} />
        </div>
        <div>
          <Skeleton style={{ height: '0.75rem', width: '5.2rem' }} />
          <Skeleton className="mt-2" rounded="0.4rem" style={{ height: '2.4rem', width: '100%' }} />
        </div>
        <Skeleton style={{ height: '0.75rem', width: '13rem' }} />
        <Skeleton rounded="0.4rem" style={{ height: '2.5rem', width: '100%' }} />
      </div>
    </div>
  )

  // Handles handleSignup logic.
  async function handleSignup(e) {
    e.preventDefault();
    setError(""); setSuccess("");

    if (!firstName.trim() || !lastName.trim()) return setError("Please enter your full name.");
    if (!email.trim()) return setError("Please enter your email.");
    if (password.length < 6) return setError("Password must be at least 6 characters.");
    if (!agreedToTerms) return setError("You must agree to the Terms & Conditions.");
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;
    if (!passwordRegex.test(password)) return setError("Password must include uppercase, lowercase, a digit, and a symbol.");



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
    } finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      {loading && renderLoadingSkeleton()}

      {!loading && (
      <div className="w-full max-w-md rounded-xl bg-[var(--card)] p-8 shadow-lg">
        <h1 className="mb-2 text-2xl font-bold text-[var(--foreground)]">
          Create an account
        </h1>
        <p className="mb-6 text-[var(--muted-foreground)]">
          Start your AI-powered learning journey.
        </p>

        {error && (
          <div id="signup-form-error" role="alert" aria-live="assertive" aria-atomic="true" className="mb-4 flex items-center gap-2 rounded-md border border-red-300 bg-red-100 px-3 py-2 text-sm text-red-700">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div role="status" aria-live="polite" aria-atomic="true" className="mb-4 flex items-center gap-2 rounded-md border border-green-300 bg-green-100 px-3 py-2 text-sm text-green-700">
            <CheckCircle size={18} />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSignup} className="space-y-4">
          <div className="flex gap-3">
            <div className="flex-1">
              <label htmlFor="signup-first-name" className="mb-1 block text-sm font-medium text-[var(--foreground)]">
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
                className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] disabled:opacity-50"
              />
            </div>
            <div className="flex-1">
              <label htmlFor="signup-last-name" className="mb-1 block text-sm font-medium text-[var(--foreground)]">
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
                className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] disabled:opacity-50"
              />
            </div>
          </div>

          <div>
            <label htmlFor="signup-email" className="mb-1 block text-sm font-medium text-[var(--foreground)]">
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
              placeholder="you@example.com"
              className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] disabled:opacity-50"
            />
          </div>

          <div>
            <label htmlFor="signup-password" className="mb-1 block text-sm font-medium text-[var(--foreground)]">
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
                placeholder="At least 6 characters"
                className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 pr-10 text-sm text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                disabled={loading}
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
                className="absolute inset-y-0 right-2 flex items-center text-[var(--muted-foreground)] transition-opacity"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <label htmlFor="signup-terms" className="flex cursor-pointer items-center gap-2 text-sm text-[var(--muted-foreground)]">
            <input
              id="signup-terms"
              type="checkbox"
              checked={agreedToTerms}
              onChange={(e) => setAgreedToTerms(e.target.checked)}
              className="rounded accent-[var(--primary)]"
            />
            I agree to the{" "}
            <Link
              to="/terms"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--primary)] font-medium transition-opacity hover:opacity-80"
            >
              Terms &amp; Conditions
            </Link>
          </label>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-[var(--primary)] py-2 font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Creating account..." : "Create account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-[var(--muted-foreground)]">
          Already have an account?{" "}
          <Link to="/login" className="text-[var(--primary)] no-underline transition-opacity hover:opacity-80">
            Log in here
          </Link>
        </p>
      </div>
      )}
    </div>
  );
}
