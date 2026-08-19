import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, AlertCircle, CheckCircle } from "lucide-react";
import { supabase } from "../supabaseClient";
import { Skeleton } from "../components/Skeleton.jsx";

// Handles ResetPassword logic.
export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const renderLoadingSkeleton = () => (
    <div className="w-full max-w-md rounded-xl bg-[var(--card)] p-8 shadow-lg" aria-hidden>
      <Skeleton style={{ height: '1.45rem', width: '12rem' }} />
      <Skeleton className="mt-2" style={{ height: '0.85rem', width: '11rem' }} />

      <div className="mt-6 space-y-4">
        <div>
          <Skeleton style={{ height: '0.75rem', width: '6rem' }} />
          <Skeleton className="mt-2" rounded="0.4rem" style={{ height: '2.45rem', width: '100%' }} />
        </div>
        <div>
          <Skeleton style={{ height: '0.75rem', width: '7rem' }} />
          <Skeleton className="mt-2" rounded="0.4rem" style={{ height: '2.45rem', width: '100%' }} />
        </div>
        <Skeleton rounded="0.4rem" style={{ height: '2.5rem', width: '100%' }} />
      </div>
    </div>
  )

  // Handles handleSubmit logic.
  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (!password) {
      return setError("Please enter a new password");
    }

    if (password.length < 6) {
      return setError("Password must be at least 6 characters long");
    }

    if (password !== confirmPassword) {
      return setError("Passwords do not match");
    }

    setLoading(true);

    try {
      // If PKCE code exists in URL, try exchanging it before password update.
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      if (code) {
        await supabase.auth.exchangeCodeForSession(code);
      }

      // Validate that a recovery session exists at submit time.
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setError("Something went wrong. Please try again.");
        setLoading(false);
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateError) {
        console.error("Password update error:", updateError);
        setError("Something went wrong. Please try again.");
        setLoading(false);
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        navigate("/login");
      }, 2000);
    } catch (err) {
      console.error("Password update error:", err);
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      {loading && renderLoadingSkeleton()}

      {!loading && (
      <div className="w-full max-w-md rounded-xl bg-[var(--card)] p-8 shadow-lg">
        <h1 className="mb-2 text-2xl font-bold text-[var(--foreground)]">
          Reset your password
        </h1>
        <p className="mb-6 text-[var(--muted-foreground)]">
          Enter your new password below.
        </p>

        {error && (
          <div id="reset-password-error" role="alert" aria-live="assertive" aria-atomic="true" className="mb-4 flex items-center gap-2 rounded-md border border-red-300 bg-red-100 px-3 py-2 text-sm text-red-700">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div role="status" aria-live="polite" aria-atomic="true" className="mb-4 flex items-center gap-2 rounded-md border border-green-300 bg-green-100 px-3 py-2 text-sm text-green-700">
            <CheckCircle size={18} />
            <span>
              Password reset successful! Redirecting to login...
            </span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="reset-new-password" className="mb-1 block text-sm font-medium text-[var(--foreground)]">
              New password
            </label>
            <div className="relative">
              <input
                id="reset-new-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading || success}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? "reset-password-error" : undefined}
                placeholder="Enter new password"
                className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 pr-10 text-sm text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                disabled={loading || success}
                aria-label={showPassword ? "Hide new password" : "Show new password"}
                aria-pressed={showPassword}
                className="absolute inset-y-0 right-2 flex items-center text-[var(--muted-foreground)] transition-opacity"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="reset-confirm-password" className="mb-1 block text-sm font-medium text-[var(--foreground)]">
              Confirm password
            </label>
            <div className="relative">
              <input
                id="reset-confirm-password"
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading || success}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? "reset-password-error" : undefined}
                placeholder="Confirm new password"
                className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 pr-10 text-sm text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                disabled={loading || success}
                aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                aria-pressed={showConfirmPassword}
                className="absolute inset-y-0 right-2 flex items-center text-[var(--muted-foreground)] transition-opacity"
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || success}
            className="w-full rounded-md bg-[var(--primary)] py-2 font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Resetting..." : "Reset password"}
          </button>
        </form>
      </div>
      )}
    </div>
  );
}
