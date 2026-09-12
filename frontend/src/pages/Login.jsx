// Implements the email/password login form with Supabase auth.

import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Eye, EyeOff, AlertCircle } from "lucide-react";
import { supabase } from "../supabaseClient";
import { useSEO } from "../hooks/useSEO";
import { Skeleton } from "../components/Skeleton.jsx";

// Presents the login form and manages sign-in state.
export default function Login() {
  useSEO({
    title: "Log In | HydrusLearn",
    description: "Log in to your HydrusLearn account to access your documents, quizzes, and study history.",
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
    <div className="w-full max-w-md card-standard" aria-hidden>
      <Skeleton style={{ height: '1.45rem', width: '9rem' }} />
      <Skeleton className="mt-2" style={{ height: '0.85rem', width: '14rem' }} />

      <div className="mt-6 space-y-4">
        <div>
          <Skeleton style={{ height: '0.75rem', width: '5.8rem' }} />
          <Skeleton className="mt-2" rounded="10px" style={{ height: '2.5rem', width: '100%' }} />
        </div>
        <div>
          <Skeleton style={{ height: '0.75rem', width: '4.8rem' }} />
          <Skeleton className="mt-2" rounded="10px" style={{ height: '2.5rem', width: '100%' }} />
        </div>
        <div className="flex items-center justify-between">
          <Skeleton style={{ height: '0.7rem', width: '7.8rem' }} />
          <Skeleton style={{ height: '0.7rem', width: '6.2rem' }} />
        </div>
        <Skeleton rounded="10px" style={{ height: '2.6rem', width: '100%' }} />
      </div>
    </div>
  );

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
    <div className="min-h-[90vh] flex items-center justify-center px-4 py-12">
      {loading && renderLoadingSkeleton()}

      {!loading && (
        <div className="w-full max-w-md card-standard">
          <h1 className="mb-2 text-2xl font-normal text-[#f0f0ee] tracking-tight">
            Welcome back
          </h1>
          <p className="mb-6 text-sm text-[#a1a1a6]">
            Log in to continue your study sessions.
          </p>

          {error && (
            <div
              id="login-form-error"
              role="alert"
              aria-live="assertive"
              aria-atomic="true"
              className="mb-5 flex items-center gap-2 rounded-[10px] border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-xs text-red-300"
            >
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="login-email" className="mb-1.5 block text-xs font-medium text-[#f0f0ee]">
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
                placeholder="you@university.edu"
                className="input-standard"
              />
            </div>

            <div>
              <label htmlFor="login-password" className="mb-1.5 block text-xs font-medium text-[#f0f0ee]">
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

            <div className="flex items-center justify-between text-xs pt-1">
              <label htmlFor="remember-me" className="flex items-center gap-2 text-[#a1a1a6] cursor-pointer">
                <input
                  id="remember-me"
                  type="checkbox"
                  className="rounded border-[#2e2e33] bg-[#131519] accent-[#f0f0ee]"
                />
                <span>Remember me</span>
              </label>
              <Link
                to="/forgot-password"
                className="text-[#a1a1a6] hover:text-[#f0f0ee] transition-colors"
              >
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full mt-2"
            >
              {loading ? "Logging in..." : "Log in"}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-[#a1a1a6]">
            Don&apos;t have an account?{" "}
            <Link
              to="/signup"
              className="text-[#f0f0ee] font-medium hover:underline ml-1"
            >
              Sign up free
            </Link>
          </p>
        </div>
      )}
    </div>
  );
}
