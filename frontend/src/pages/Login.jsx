
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, AlertCircle } from "lucide-react";
import { supabase } from "../supabaseClient";

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

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
      <div className="w-full max-w-md rounded-xl bg-[var(--card)] p-8 shadow-lg">
        <h1 className="mb-2 text-2xl font-bold text-[var(--foreground)]">
          Welcome back
        </h1>
        <p className="mb-6 text-[var(--muted-foreground)]">
          Log in to your account to continue.
        </p>

        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-md border border-red-300 bg-red-100 px-3 py-2 text-sm text-red-700">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">
              Email address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              placeholder="you@example.com"
              className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] disabled:opacity-50"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                placeholder="Enter your password"
                className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 pr-10 text-sm text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                disabled={loading}
                className="absolute inset-y-0 right-2 flex items-center text-[var(--muted-foreground)] transition-opacity"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center gap-2 text-[var(--muted-foreground)]">
              <input type="checkbox" className="rounded accent-[var(--primary)]" />
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
    </div>
  );
}
