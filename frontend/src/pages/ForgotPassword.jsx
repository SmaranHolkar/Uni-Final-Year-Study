// Provides the password reset request form and feedback states.
import { useState } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, CheckCircle, ArrowLeft } from "lucide-react";
import { supabase } from "../supabaseClient";
import { Skeleton } from "../components/Skeleton.jsx";

// Shows the forgot-password form and handles reset-link flow.
export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const renderLoadingSkeleton = () => (
    <div className="w-full max-w-md rounded-xl bg-[var(--card)] p-8 shadow-lg" aria-hidden>
      <Skeleton style={{ height: '0.75rem', width: '7rem' }} />
      <Skeleton className="mt-6" style={{ height: '1.45rem', width: '10rem' }} />
      <Skeleton className="mt-2" style={{ height: '0.85rem', width: '14rem' }} />
      <Skeleton className="mt-6" style={{ height: '0.75rem', width: '6rem' }} />
      <Skeleton className="mt-2" rounded="0.4rem" style={{ height: '2.45rem', width: '100%' }} />
      <Skeleton className="mt-4" rounded="0.4rem" style={{ height: '2.5rem', width: '100%' }} />
    </div>
  )

  // Sends a password reset email through Supabase.
  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (!email.trim()) {
      return setError("Please enter your email address");
    }

    setLoading(true);

    try {
      const frontendUrl = import.meta.env.VITE_FRONTEND_URL || window.location.origin;
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email,
        {
          redirectTo: `${frontendUrl}/reset-password`,
        }
      );

      if (resetError) {
        console.error("Password reset error:", resetError);
        return setError("Unable to send reset link. Please try again");
      }

      setSuccess(true);
      setEmail("");
    } catch (err) {
      console.error("Password reset error:", err);
      setError("An error occurred. Please try again");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      {loading && renderLoadingSkeleton()}

      {!loading && (
      <div className="w-full max-w-md rounded-xl bg-[var(--card)] p-8 shadow-lg">
        <Link
          to="/login"
          className="mb-6 inline-flex items-center gap-2 text-sm text-[var(--muted-foreground)] transition-opacity hover:opacity-80"
        >
          <ArrowLeft size={16} />
          Back to login
        </Link>

        <h1 className="mb-2 text-2xl font-bold text-[var(--foreground)]">
          Forgot password?
        </h1>
        <p className="mb-6 text-[var(--muted-foreground)]">
          Enter your email address and we'll send you a link to reset your
          password.
        </p>

        {error && (
          <div id="forgot-password-error" role="alert" aria-live="assertive" aria-atomic="true" className="mb-4 flex items-center gap-2 rounded-md border border-red-300 bg-red-100 px-3 py-2 text-sm text-red-700">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div role="status" aria-live="polite" aria-atomic="true" className="mb-4 flex items-center gap-2 rounded-md border border-green-300 bg-green-100 px-3 py-2 text-sm text-green-700">
            <CheckCircle size={18} />
            <span>
              Password reset link sent! Check your email inbox.
            </span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="forgot-password-email" className="mb-1 block text-sm font-medium text-[var(--foreground)]">
              Email address
            </label>
            <input
              id="forgot-password-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? "forgot-password-error" : undefined}
              placeholder="you@example.com"
              className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] disabled:opacity-50"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-[var(--primary)] py-2 font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Sending..." : "Send reset link"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-[var(--muted-foreground)]">
          Remember your password?{" "}
          <Link to="/login" className="text-[var(--primary)] no-underline transition-opacity hover:opacity-80">
            Log in
          </Link>
        </p>
      </div>
      )}
    </div>
  );
}
