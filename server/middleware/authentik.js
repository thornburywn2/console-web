/**
 * Authentik Authentication Middleware
 * Integrates with Authentik SSO from Sovereign Stack
 *
 * SECURITY: This middleware validates that requests come from the Authentik proxy
 * by checking a shared secret. Without this validation, anyone could inject
 * fake X-authentik-* headers to bypass authentication.
 *
 * Required environment variables:
 * - AUTHENTIK_PROXY_SECRET: Shared secret that Authentik proxy sends
 * - AUTH_ENABLED: Set to 'false' only for local development
 */

import jwt from 'jsonwebtoken';
import { Router } from 'express';
import { createLogger } from '../services/logger.js';
import { roleFromGroups } from './rbac.js';

const log = createLogger('auth');

// Authentik configuration from environment
const AUTHENTIK_URL = process.env.AUTHENTIK_URL || 'http://localhost:9000';
const AUTHENTIK_CLIENT_ID = process.env.AUTHENTIK_CLIENT_ID || 'claude-manager';
const AUTHENTIK_CLIENT_SECRET = process.env.AUTHENTIK_CLIENT_SECRET;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5275';

// CRITICAL: Shared secret for proxy validation
// This MUST be set in production and configured in Authentik proxy
const AUTHENTIK_PROXY_SECRET = process.env.AUTHENTIK_PROXY_SECRET;

// Auth enabled flag - MUST be true in production
const AUTH_ENABLED = process.env.AUTH_ENABLED !== 'false';

// Trusted proxy IPs (Docker network range for Authentik proxy container)
// Format: comma-separated list of IPs or CIDR ranges
const TRUSTED_PROXY_IPS = (process.env.TRUSTED_PROXY_IPS || '').split(',').filter(Boolean);

// Admin group names in Authentik
const ADMIN_GROUPS = ['authentik Admins', 'Administrators', 'admins'];

// Cache for JWKS keys
let jwksCache = null;
let jwksCacheTime = 0;
const JWKS_CACHE_DURATION = 3600000; // 1 hour

/**
 * Check if an IP is in a trusted range
 */
function isIPTrusted(clientIP) {
  if (!clientIP || TRUSTED_PROXY_IPS.length === 0) {
    return false;
  }

  // Normalize IPv6 localhost to IPv4
  const normalizedIP = clientIP.replace(/^::ffff:/, '');

  return TRUSTED_PROXY_IPS.some(trustedIP => {
    // Exact match
    if (normalizedIP === trustedIP) return true;

    // CIDR range check (simplified - supports /8, /16, /24)
    if (trustedIP.includes('/')) {
      const [range, bits] = trustedIP.split('/');
      const rangeParts = range.split('.');
      const ipParts = normalizedIP.split('.');

      if (rangeParts.length !== 4 || ipParts.length !== 4) return false;

      const maskBits = parseInt(bits, 10);
      const octetsToCheck = Math.floor(maskBits / 8);

      for (let i = 0; i < octetsToCheck; i++) {
        if (rangeParts[i] !== ipParts[i]) return false;
      }
      return true;
    }

    return false;
  });
}

/**
 * Get the real client IP, handling proxy chains
 */
function getClientIP(req) {
  // Check X-Forwarded-For header (set by proxies)
  const forwardedFor = req.headers['x-forwarded-for'];
  if (forwardedFor) {
    // X-Forwarded-For can be comma-separated list: client, proxy1, proxy2
    // The first IP is the original client
    const ips = forwardedFor.split(',').map(ip => ip.trim());
    // Return the first non-local IP, or the first IP if all are local
    for (const ip of ips) {
      const normalized = ip.replace(/^::ffff:/, '');
      if (!normalized.startsWith('127.') && normalized !== '::1') {
        return normalized;
      }
    }
    return ips[0].replace(/^::ffff:/, '');
  }

  // Fall back to connection IP
  return (req.ip || req.connection?.remoteAddress || '').replace(/^::ffff:/, '');
}

/**
 * Validate that the request comes from the Authentik proxy
 * Returns true only if:
 * 1. The proxy secret header matches (RECOMMENDED - most secure), OR
 * 2. The request comes from a trusted proxy IP
 */
function isFromAuthentikProxy(req) {
  // Check shared secret header (primary validation - most secure)
  const proxySecret = req.headers['x-authentik-proxy-secret'];
  if (AUTHENTIK_PROXY_SECRET && proxySecret === AUTHENTIK_PROXY_SECRET) {
    return true;
  }

  // Fallback: Check if request comes from trusted proxy IP
  const clientIP = getClientIP(req);
  if (isIPTrusted(clientIP)) {
    return true;
  }

  // SECURITY: Log potential header injection attempts
  if (req.headers['x-authentik-username'] || req.headers['x-authentik-email']) {
    log.warn({
      clientIP,
      xForwardedFor: req.headers['x-forwarded-for'],
      reqIP: req.ip
    }, 'blocked potential header injection');
  }

  return false;
}

/**
 * Fetch JWKS from Authentik for token validation
 */
async function fetchJWKS() {
  const now = Date.now();
  if (jwksCache && (now - jwksCacheTime) < JWKS_CACHE_DURATION) {
    return jwksCache;
  }

  try {
    const response = await fetch(`${AUTHENTIK_URL}/application/o/${AUTHENTIK_CLIENT_ID}/jwks/`);
    if (response.ok) {
      jwksCache = await response.json();
      jwksCacheTime = now;
      return jwksCache;
    }
  } catch (error) {
    log.error({ error: error.message }, 'failed to fetch JWKS');
  }
  return jwksCache;
}

/**
 * Convert JWKS key to PEM format for JWT verification
 */
function jwkToPem(jwk) {
  // For RSA keys, construct PEM from modulus (n) and exponent (e)
  if (jwk.kty !== 'RSA') {
    log.warn({ kty: jwk.kty }, 'unsupported key type');
    return null;
  }

  // Create a simple RSA public key in PKCS#1 format
  // This is a simplified conversion - for production, consider using a library like 'jwk-to-pem'
  const modulus = Buffer.from(jwk.n, 'base64url');
  const exponent = Buffer.from(jwk.e, 'base64url');

  // ASN.1 DER encoding for RSA public key
  const modulusLen = modulus.length;
  const exponentLen = exponent.length;

  // Build the sequence
  const modulusSeq = Buffer.concat([
    Buffer.from([0x02]), // INTEGER tag
    modulusLen > 127
      ? Buffer.from([0x82, (modulusLen >> 8) & 0xff, modulusLen & 0xff])
      : Buffer.from([modulusLen]),
    modulus[0] >= 0x80 ? Buffer.from([0x00]) : Buffer.alloc(0), // Pad if high bit set
    modulus,
  ]);

  const exponentSeq = Buffer.concat([
    Buffer.from([0x02]), // INTEGER tag
    Buffer.from([exponentLen]),
    exponent,
  ]);

  const totalLen = modulusSeq.length + exponentSeq.length + (modulus[0] >= 0x80 ? 1 : 0);
  const sequence = Buffer.concat([
    Buffer.from([0x30]), // SEQUENCE tag
    totalLen > 127
      ? Buffer.from([0x82, (totalLen >> 8) & 0xff, totalLen & 0xff])
      : Buffer.from([totalLen]),
    modulusSeq,
    exponentSeq,
  ]);

  // Wrap in PKCS#8 format
  const pkcs8Header = Buffer.from([
    0x30, 0x82, // SEQUENCE
    ((sequence.length + 22) >> 8) & 0xff, (sequence.length + 22) & 0xff,
    0x30, 0x0d, // SEQUENCE (algorithm identifier)
    0x06, 0x09, // OID
    0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01, 0x01, // rsaEncryption
    0x05, 0x00, // NULL
    0x03, 0x82, // BIT STRING
    ((sequence.length + 1) >> 8) & 0xff, (sequence.length + 1) & 0xff,
    0x00, // unused bits
  ]);

  const der = Buffer.concat([pkcs8Header, sequence]);
  const pem = `-----BEGIN PUBLIC KEY-----\n${der.toString('base64').match(/.{1,64}/g).join('\n')}\n-----END PUBLIC KEY-----`;

  return pem;
}

/**
 * Validate JWT token from Authentik with proper signature verification
 * SECURITY: Uses jwt.verify() with JWKS public key, not just jwt.decode()
 */
async function validateToken(token) {
  try {
    // First decode to get the key ID (kid) from header
    const decoded = jwt.decode(token, { complete: true });
    if (!decoded) {
      log.warn('JWT decode failed - invalid token format');
      return null;
    }

    const { header, payload } = decoded;

    // Check expiration early (before expensive JWKS fetch)
    if (payload.exp && Date.now() >= payload.exp * 1000) {
      log.debug('JWT expired');
      return null;
    }

    // Fetch JWKS and find matching key
    const jwks = await fetchJWKS();
    if (!jwks || !jwks.keys || jwks.keys.length === 0) {
      log.warn('JWKS not available - falling back to unverified decode');
      // In development/fallback mode, allow unverified tokens
      // In production with JWKS configured, this should fail
      if (process.env.NODE_ENV === 'production' && AUTHENTIK_URL !== 'http://localhost:9000') {
        return null;
      }
    } else {
      // Find the key matching the token's kid
      const key = header.kid
        ? jwks.keys.find(k => k.kid === header.kid)
        : jwks.keys[0]; // Use first key if no kid specified

      if (!key) {
        log.warn({ kid: header.kid }, 'no matching JWKS key found');
        return null;
      }

      // Convert JWK to PEM and verify signature
      try {
        const pem = jwkToPem(key);
        if (pem) {
          // Verify with proper signature check
          jwt.verify(token, pem, {
            algorithms: [header.alg || 'RS256'],
            issuer: AUTHENTIK_URL,
          });
          log.debug('JWT signature verified successfully');
        }
      } catch (verifyError) {
        log.warn({ error: verifyError.message }, 'JWT signature verification failed');
        // In non-production, allow fallthrough for development
        if (process.env.NODE_ENV === 'production') {
          return null;
        }
      }
    }

    return {
      id: payload.sub,
      email: payload.email,
      name: payload.name || payload.preferred_username,
      username: payload.preferred_username,
      groups: payload.groups || [],
      isAdmin: ADMIN_GROUPS.some(adminGroup =>
        payload.groups?.some(g => g.toLowerCase() === adminGroup.toLowerCase())
      ),
    };
  } catch (error) {
    log.error({ error: error.message }, 'token validation error');
    return null;
  }
}

/**
 * Extract user from Authentik proxy headers
 * ONLY call this after verifying the request comes from the proxy!
 */
function extractFromProxyHeaders(req) {
  const username = req.headers['x-authentik-username'];
  const email = req.headers['x-authentik-email'];
  const name = req.headers['x-authentik-name'];
  const groupsHeader = req.headers['x-authentik-groups'];
  const uid = req.headers['x-authentik-uid'];

  if (!username && !email) {
    return null;
  }

  // Parse groups - Authentik uses pipe separator
  const groups = groupsHeader ? groupsHeader.split('|').filter(Boolean) : [];

  // Check if user is admin
  const isAdmin = ADMIN_GROUPS.some(adminGroup =>
    groups.some(g => g.toLowerCase() === adminGroup.toLowerCase())
  );

  return {
    id: uid || username,
    email: email,
    name: name || username,
    username: username,
    groups,
    isAdmin,
  };
}

/**
 * Main authentication middleware
 */
export function authentikAuth(options = {}) {
  const { required = true, adminOnly = false, excludePaths = [] } = options;

  return async (req, res, next) => {
    // Skip auth for excluded paths (e.g., /api/system for self-update feature)
    if (excludePaths.length > 0) {
      const fullPath = req.baseUrl + req.path;
      for (const excludePath of excludePaths) {
        if (fullPath.startsWith(excludePath)) {
          return next();
        }
      }
    }

    // Skip auth if explicitly disabled (ONLY for local development)
    if (!AUTH_ENABLED) {
      log.warn('authentication disabled - this should only happen in development');
      req.user = { id: 'local', name: 'Local Dev User', email: 'dev@localhost', isAdmin: true, groups: [] };
      return next();
    }

    let user = null;

    // SECURITY: Only trust proxy headers if request comes from Authentik proxy
    if (isFromAuthentikProxy(req)) {
      user = extractFromProxyHeaders(req);
    }

    // Try Bearer token if no proxy auth (for API clients)
    if (!user) {
      const authHeader = req.headers.authorization;
      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        user = await validateToken(token);
      }
    }

    // Check authentication result
    if (!user) {
      if (required) {
        // For Proxy Provider setup, redirect to the proxy's sign-in endpoint
        // This triggers Authentik's built-in authentication flow
        return res.status(401).json({
          error: 'Authentication required',
          loginUrl: `${CLIENT_URL}/outpost.goauthentik.io/start?rd=${encodeURIComponent(CLIENT_URL + '/')}`,
        });
      }
      req.user = null;
      return next();
    }

    // Check admin requirement
    if (adminOnly && !user.isAdmin) {
      return res.status(403).json({
        error: 'Administrator access required',
      });
    }

    req.user = user;
    next();
  };
}

/**
 * OAuth2 callback handler
 */
export async function handleOAuthCallback(req, res) {
  const { code } = req.query;

  if (!code) {
    return res.status(400).json({ error: 'Authorization code required' });
  }

  try {
    const tokenResponse = await fetch(`${AUTHENTIK_URL}/application/o/token/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: AUTHENTIK_CLIENT_ID,
        client_secret: AUTHENTIK_CLIENT_SECRET,
        code,
        redirect_uri: `${CLIENT_URL}/auth/callback`,
      }),
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      log.error({ error }, 'token exchange failed');
      return res.status(401).json({ error: 'Authentication failed' });
    }

    const tokens = await tokenResponse.json();

    res.cookie('access_token', tokens.access_token, {
      httpOnly: true,
      secure: true, // Always use secure cookies
      sameSite: 'lax',
      maxAge: tokens.expires_in * 1000,
    });

    res.redirect('/');
  } catch (error) {
    log.error({ error: error.message }, 'OAuth callback error');
    res.status(500).json({ error: 'Authentication error' });
  }
}

/**
 * Logout handler
 */
export function handleLogout(req, res) {
  res.clearCookie('access_token');
  const logoutUrl = `${AUTHENTIK_URL}/outpost.goauthentik.io/sign_out`;
  res.redirect(logoutUrl);
}

/**
 * Get current user endpoint
 * Returns user info including RBAC role from database (Phase 3)
 */
export function getCurrentUser(req, res) {
  if (req.user) {
    // Get role from database user if available, otherwise derive from groups
    const role = req.dbUser?.role || roleFromGroups(req.user.groups);

    res.json({
      authenticated: true,
      user: {
        id: req.user.id,
        email: req.user.email,
        name: req.user.name,
        username: req.user.username,
        isAdmin: req.user.isAdmin,
        groups: req.user.groups,
        // RBAC: Include role for frontend permission checks (Phase 3)
        role: role,
      },
    });
  } else {
    // For Proxy Provider setup, use the proxy's sign-in endpoint
    res.json({
      authenticated: false,
      loginUrl: `${CLIENT_URL}/outpost.goauthentik.io/start?rd=${encodeURIComponent(CLIENT_URL + '/')}`,
    });
  }
}

/**
 * Create auth routes
 */
export function createAuthRouter() {
  const router = Router();

  router.get('/callback', handleOAuthCallback);
  router.get('/logout', handleLogout);
  router.get('/me', authentikAuth({ required: false }), getCurrentUser);
  router.get('/login', (req, res) => {
    // For Proxy Provider setup, redirect to the proxy's sign-in endpoint
    const loginUrl = `${CLIENT_URL}/outpost.goauthentik.io/start?rd=${encodeURIComponent(CLIENT_URL + '/')}`;
    res.redirect(loginUrl);
  });

  return router;
}

export default authentikAuth;
