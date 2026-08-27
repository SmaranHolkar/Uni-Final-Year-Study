/**
 * Security Headers Middleware
 * Enforces OWASP Recommended HTTP Response Headers
 */

export default function securityHeaders(req, res, next) {
  // Prevent MIME-sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Prevent Clickjacking / UI Redressing
  res.setHeader('X-Frame-Options', 'DENY');

  // Strict Transport Security (HSTS) - 1 Year with Subdomains and Preload
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');

  // Control Referrer Information
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Restrict Browser Hardware Features and Device Sensors
  res.setHeader(
    'Permissions-Policy',
    'camera=(), microphone=(self), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()'
  );

  // Cross-Origin Isolation & Resource Sharing Headers
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

  // Modern Content-Security-Policy (CSP)
  // Restricts unauthorized framing and script evaluation
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; frame-ancestors 'none'; object-src 'none'; base-uri 'self';"
  );

  return next();
}
