// Implements the email/password login form with Supabase auth.

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, AlertCircle } from "lucide-react";
import { supabase } from "../supabaseClient";
import { useSEO } from "../hooks/useSEO";
import { Skeleton } from "../components/Skeleton.jsx";

// Presents the login form and manages sign-in state.
export default function Login() {
  useSEO({
    title: "Log In | HydrusLearn",
    description: "Log in to your HydrusLearn account to access your quizzes, study tools, and learning playground.",
    path: "/login",
    noIndex: true,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const renderLoadingSkeleton = () => (
    <div className="w-full max-w-md rounded-xl bg-[var(--card)] p-8 shadow-lg" aria-hidden>
      <Skeleton style={{ height: '1.45rem', width: '9rem' }} />
      <Skeleton className="mt-2" style={{ height: '0.85rem', width: '14rem' }} />

      <div className="mt-6 space-y-4">
        <div>
          <Skeleton style={{ height: '0.75rem', width: '5.8rem' }} />
          <Skeleton className="mt-2" rounded="0.4rem" style={{ height: '2.45rem', width: '100%' }} />
        </div>
        <div>
          <Skeleton style={{ height: '0.75rem', width: '4.8rem' }} />
          <Skeleton className="mt-2" rounded="0.4rem" style={{ height: '2.45rem', width: '100%' }} />
        </div>
        <div className="flex items-center justify-between">
          <Skeleton style={{ height: '0.7rem', width: '7.8rem' }} />
          <Skeleton style={{ height: '0.7rem', width: '6.2rem' }} />
        </div>
        <Skeleton rounded="0.4rem" style={{ height: '2.5rem', width: '100%' }} />
      </div>
    </div>
  )

  // Authenticates with Supabase using email and password.
  async function handleLogin(e) {
    e.preventDefault();
    setError("");

    if (!email.trim()) return setError("Please enter your email");
    if (!password) return setError("Please enter your password");

    setLoading(true);

    try {
      const { data, error: loginError } =
        await supabase.auth.signInWithPassword({ email, password });

      if (loginError) {
        console.error("Login error:", loginError);
        return setError("Invalid email or password");
      }

      if (data.user) navigate("/dashboard");
    } catch (err) {
      console.error("Login error:", err);
      setError("Unable to sign in. Please try again");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      {loading && renderLoadingSkeleton()}

      {!loading && (
      <div className="w-full max-w-md rounded-xl bg-[var(--card)] p-8 shadow-lg">
        <h1 className="mb-2 text-2xl font-bold text-[var(--foreground)]">
          Welcome back
        </h1>
        <p className="mb-6 text-[var(--muted-foreground)]">
          Log in to your account to continue.
        </p>

        {error && (
          <div id="login-form-error" role="alert" aria-live="assertive" aria-atomic="true" className="mb-4 flex items-center gap-2 rounded-md border border-red-300 bg-red-100 px-3 py-2 text-sm text-red-700">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label htmlFor="login-email" className="mb-1 block text-sm font-medium text-[var(--foreground)]">
              Email address
            </label>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? "login-form-error" : undefined}
              placeholder="you@example.com"
              className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] disabled:opacity-50"
            />
          </div>

          <div>
            <label htmlFor="login-password" className="mb-1 block text-sm font-medium text-[var(--foreground)]">
              Password
            </label>
            <div className="relative">
              <input
                id="login-password"
                minLength={6}
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? "login-form-error" : undefined}
                placeholder="Enter your password"
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

          <div className="flex items-center justify-between text-sm">
            <label htmlFor="remember-me" className="flex items-center gap-2 text-[var(--muted-foreground)]">
              <input id="remember-me" type="checkbox" className="rounded accent-[var(--primary)]" />
              Remember me
            </label>
            <a
              href="/forgot-password"
              className="text-[var(--primary)] transition-opacity hover:opacity-80"
            >
              Forgot password?
            </a>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-[var(--primary)] py-2 font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Logging in..." : "Log in"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-[var(--muted-foreground)]">
          Don&apos;t have an account?{" "}
          <a
            href="/signup"
            className="text-[var(--primary)] no-underline transition-opacity hover:opacity-80"
          >
            Sign up here
          </a>
        </p>
      </div>
      )}
    </div>
  );
}
