// Provides the password reset request form and feedback states.
import { useState } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, CheckCircle, ArrowLeft } from "lucide-react";
import { supabase } from "../supabaseClient";
import { Skeleton } from "../components/Skeleton.jsx";
import { useSEO } from "../hooks/useSEO";

// Shows the forgot-password form and handles reset-link flow.
export default function ForgotPassword() {
  useSEO({
    title: "Forgot Password | HydrusLearn",
    description: "Request a password reset link for your HydrusLearn account.",
    path: "/forgot-password",
    noIndex: true,
  });
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const renderLoadingSkeleton = () => (
    <div className="w-full max-w-md card-standard" aria-hidden>
      <Skeleton style={{ height: '0.75rem', width: '7rem' }} />
      <Skeleton className="mt-6" style={{ height: '1.45rem', width: '10rem' }} />
      <Skeleton className="mt-2" style={{ height: '0.85rem', width: '14rem' }} />
      <Skeleton className="mt-6" style={{ height: '0.75rem', width: '6rem' }} />
      <Skeleton className="mt-2" rounded="10px" style={{ height: '2.5rem', width: '100%' }} />
      <Skeleton className="mt-4" rounded="10px" style={{ height: '2.6rem', width: '100%' }} />
    </div>
  );

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
    <div className="min-h-[90vh] flex items-center justify-center px-4 py-12">
      {loading && renderLoadingSkeleton()}

      {!loading && (
        <div className="w-full max-w-md card-standard">
          <Link
            to="/login"
            className="mb-6 inline-flex items-center gap-1.5 text-xs text-[#a1a1a6] hover:text-[#f0f0ee] transition-colors"
          >
            <ArrowLeft size={14} />
            <span>Back to login</span>
          </Link>

          <h1 className="mb-2 text-2xl font-normal text-[#f0f0ee] tracking-tight">
            Forgot password?
          </h1>
          <p className="mb-6 text-sm text-[#a1a1a6]">
            Enter your email address and we'll send you a link to reset your password.
          </p>

          {error && (
            <div
              id="forgot-password-error"
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
              <span>Password reset link sent! Check your inbox.</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="forgot-email" className="mb-1.5 block text-xs font-medium text-[#f0f0ee]">
                Email address
              </label>
              <input
                id="forgot-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? "forgot-password-error" : undefined}
                placeholder="you@university.edu"
                className="input-standard"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full mt-2"
            >
              {loading ? "Sending link..." : "Send reset link"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
