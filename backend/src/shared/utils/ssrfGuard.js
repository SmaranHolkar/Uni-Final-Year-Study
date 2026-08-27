/**
 * Server-Side Request Forgery (SSRF) Guard & URL Validator
 * Rejects loopback, private RFC 1918 subnets, cloud metadata endpoints, and non-HTTP protocols.
 */

import { URL } from 'url';

// Cloud metadata and loopback addresses that must NEVER be accessed by the backend
const FORBIDDEN_HOSTNAMES = new Set([
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '169.254.169.254', // AWS, GCP, Azure, OpenStack Metadata IP
  'metadata.google.internal',
  '100.100.100.200', // Alibaba Cloud Metadata
  '::1',
  '0:0:0:0:0:0:0:1',
]);

/**
 * Checks whether an IPv4 address belongs to a private/reserved subnet.
 */
function isPrivateIPv4(ip) {
  const parts = ip.split('.').map((p) => parseInt(p, 10));
  if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) return true;

  // 127.0.0.0/8 (Loopback)
  if (parts[0] === 127) return true;
  // 10.0.0.0/8 (Private)
  if (parts[0] === 10) return true;
  // 172.16.0.0/12 (Private)
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
  // 192.168.0.0/16 (Private)
  if (parts[0] === 192 && parts[1] === 168) return true;
  // 169.254.0.0/16 (Link-Local & Cloud Metadata)
  if (parts[0] === 169 && parts[1] === 254) return true;
  // 0.0.0.0/8 (Current network)
  if (parts[0] === 0) return true;

  return false;
}

/**
 * Validates an arbitrary URL against SSRF vulnerabilities.
 * @param {string} rawUrl - The user-supplied URL to validate.
 * @param {string[]} [allowedDomains] - Optional list of permitted domains.
 * @returns {{ isValid: boolean, error?: string, parsedUrl?: URL }}
 */
export function validateSafeUrl(rawUrl, allowedDomains = null) {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { isValid: false, error: 'URL must be a non-empty string' };
  }

  let parsed;
  try {
    parsed = new URL(rawUrl.trim());
  } catch {
    return { isValid: false, error: 'Malformed URL format' };
  }

  // Enforce HTTP / HTTPS protocols only (blocks file://, gopher://, dict://, ldap://, etc.)
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return { isValid: false, error: `Disallowed protocol "${parsed.protocol}". Only HTTP/HTTPS is permitted.` };
  }

  const hostname = parsed.hostname.toLowerCase();

  // Check forbidden hostnames
  if (FORBIDDEN_HOSTNAMES.has(hostname) || hostname.endsWith('.localhost') || hostname.endsWith('.internal')) {
    return { isValid: false, error: 'Access to internal or loopback hostnames is forbidden.' };
  }

  // Check for private IPv4 patterns
  if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) {
    if (isPrivateIPv4(hostname)) {
      return { isValid: false, error: 'Access to private or local network IP addresses is forbidden.' };
    }
  }

  // Check domain whitelist if specified
  if (Array.isArray(allowedDomains) && allowedDomains.length > 0) {
    const isDomainAllowed = allowedDomains.some((d) => {
      const clean = d.toLowerCase().replace(/^\./, '');
      return hostname === clean || hostname.endsWith(`.${clean}`);
    });
    if (!isDomainAllowed) {
      return { isValid: false, error: `Host "${hostname}" is not in the allowed domains list.` };
    }
  }

  return { isValid: true, parsedUrl: parsed };
}
