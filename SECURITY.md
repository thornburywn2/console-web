# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

We take the security of Console.web seriously. If you believe you have found a security vulnerability, please report it to us as described below.

### How to Report

**Please do not report security vulnerabilities through public GitHub issues.**

Instead, please report them via email to: [INSERT SECURITY EMAIL]

You should receive a response within 48 hours. If for some reason you do not, please follow up to ensure we received your original message.

Please include the following information in your report:

- Type of issue (e.g., buffer overflow, SQL injection, cross-site scripting, etc.)
- Full paths of source file(s) related to the issue
- Location of the affected source code (tag/branch/commit or direct URL)
- Any special configuration required to reproduce the issue
- Step-by-step instructions to reproduce the issue
- Proof-of-concept or exploit code (if possible)
- Impact of the issue, including how an attacker might exploit it

### What to Expect

- **Acknowledgment**: We will acknowledge receipt of your vulnerability report within 48 hours.
- **Communication**: We will keep you informed of the progress toward a fix.
- **Credit**: If you report a valid vulnerability, we will credit you in our release notes (unless you prefer to remain anonymous).

## Security Considerations

### Authentication

Console.web supports multiple authentication modes:

1. **Authentik SSO** (Enterprise mode) - Recommended for production
2. **Local password** (Standalone mode) - For single-user deployments

### Network Security

- Always run behind a reverse proxy (nginx, Caddy) in production
- Use HTTPS for all connections
- Configure appropriate firewall rules
- Limit access to trusted networks when possible

### Environment Variables

Sensitive configuration should be stored in environment variables:

```bash
# Required for production
AUTHENTIK_PROXY_SECRET=   # Shared secret for proxy validation
DATABASE_URL=             # PostgreSQL connection string

# Optional but recommended
TRUSTED_PROXY_IPS=        # Comma-separated CIDR ranges
```

**Never commit `.env` files or secrets to version control.**

### API Security

- All API endpoints require authentication (except `/api/system`)
- Admin-only endpoints check user groups
- Input validation using Zod schemas
- Rate limiting recommended at reverse proxy level

### Terminal Security

- Terminal sessions run as the server user
- Consider using dedicated service accounts
- Use `--dangerously-skip-permissions` flag with caution
- Monitor terminal activity through logs

### Docker Security

- Socket access (`/var/run/docker.sock`) grants container control
- Consider using Docker socket proxy for restricted access
- Review container capabilities and resource limits

## Security Best Practices

### For Operators

1. Keep Console.web and dependencies updated
2. Use strong, unique passwords
3. Enable two-factor authentication (via Authentik)
4. Regularly review access logs
5. Implement network segmentation
6. Back up configuration and database regularly

### For Developers

1. Never hardcode secrets in source code
2. Validate all user inputs
3. Use parameterized queries (Prisma)
4. Sanitize output to prevent XSS
5. Follow the principle of least privilege
6. Review security headers configuration

## Known Security Considerations

### Terminal Access

Console.web provides terminal access to the server. Users with terminal access can execute commands with the permissions of the server process. Ensure proper access controls are in place.

### Docker Socket

Access to the Docker socket allows management of containers. This is a powerful capability that should be restricted to trusted users.

### File Browser

The file browser component allows navigation of the filesystem. Consider restricting the base directory or disabling this feature in sensitive environments.

## Security Updates

Security updates are released as patch versions (e.g., 1.0.x) and announced through:

- GitHub Security Advisories
- Release notes in CHANGELOG.md
- GitHub Releases

We recommend subscribing to GitHub notifications for this repository to stay informed of security updates.

## Disclosure Policy

We follow a coordinated disclosure process:

1. Researcher reports vulnerability privately
2. We confirm and assess the vulnerability
3. We develop and test a fix
4. We release the fix and publish advisory
5. We credit the researcher (if desired)

We aim to release fixes within 90 days of confirmed vulnerabilities.
