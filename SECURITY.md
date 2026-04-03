# Pilates Studio - Security Checklist

This document provides a comprehensive security checklist for deploying Pilates Studio in production.

## Pre-Deployment Security Checklist

### 1. Secrets Management

- [ ] **JWT Secrets**: Use strong, randomly generated secrets (min 32 characters)
  ```bash
  openssl rand -base64 32
  ```
- [ ] **Database Password**: Strong password (min 16 characters, mixed case + numbers + symbols)
- [ ] **API Keys**: Store in environment variables, never in code
- [ ] **.env files**: Added to `.gitignore`, not committed to repository

### 2. Database Security

- [ ] **Root Password**: Changed from default/empty
- [ ] **Application User**: Separate user with minimal required privileges
- [ ] **Network Access**: Database not exposed to public internet (bind to 127.0.0.1 or internal network)
- [ ] **Encryption**: Enable SSL/TLS for database connections
- [ ] **Backups**: Automated encrypted backups configured

### 3. API Security

- [ ] **CORS**: Restricted to known origins (not using `*` in production)
  ```
  CORS_ORIGINS=https://admin.yourdomain.com,https://mini.yourdomain.com
  ```
- [ ] **Rate Limiting**: Enabled to prevent brute force attacks
- [ ] **Input Validation**: All inputs validated using class-validator DTOs
- [ ] **SQL Injection**: Protected via Prisma ORM (no raw SQL)
- [ ] **XSS Protection**: Output encoding in frontend

### 4. Authentication & Authorization

- [ ] **Password Policy**: Minimum 8 characters, complexity requirements
- [ ] **JWT Expiration**: Short-lived access tokens (15 minutes recommended)
- [ ] **Refresh Tokens**: Secure storage and rotation implemented
- [ ] **Password Hashing**: bcrypt with appropriate rounds (10-12)
- [ ] **Role-Based Access**: RBAC properly configured
- [ ] **Session Management**: Proper logout and token invalidation

### 5. Infrastructure Security

- [ ] **HTTPS**: TLS 1.2+ enforced for all communications
- [ ] **SSL Certificate**: Valid certificate from trusted CA
- [ ] **Headers**: Security headers configured (HSTS, X-Frame-Options, etc.)
- [ ] **Container Security**: Running as non-root user
- [ ] **Network Segmentation**: Services isolated in separate networks
- [ ] **Firewall**: Only necessary ports open (80, 443)

### 6. Logging & Monitoring

- [ ] **Access Logs**: Enabled and stored securely
- [ ] **Error Logs**: No sensitive data in error messages
- [ ] **Audit Logs**: Critical actions logged (login, data modification)
- [ ] **Log Retention**: Defined retention policy
- [ ] **Monitoring**: Health checks and alerting configured

### 7. Dependency Security

- [ ] **Audit**: Run `npm audit` and fix vulnerabilities
  ```bash
  npm audit
  npm audit fix
  ```
- [ ] **Updates**: Keep dependencies updated
- [ ] **Lock Files**: Commit package-lock.json for reproducible builds

### 8. Mini Program Security

- [ ] **API Domain**: Whitelist backend domain in WeChat console
- [ ] **HTTPS**: All API calls use HTTPS
- [ ] **Token Storage**: Secure storage for JWT tokens
- [ ] **Data Validation**: Client-side and server-side validation

## Security Testing

### Before Production

1. **Vulnerability Scan**: Run security scanner on container/image
2. **Penetration Test**: Basic API penetration testing
3. **Dependency Check**: Verify no known vulnerabilities
4. **Secrets Scan**: Ensure no secrets in repository
   ```bash
   # Using git-secrets or similar
   git secrets --scan
   ```

### Regular Maintenance

- [ ] Monthly: Update dependencies
- [ ] Monthly: Review access logs for anomalies
- [ ] Quarterly: Rotate JWT secrets
- [ ] Quarterly: Review user permissions

## Incident Response

### If Breach Suspected

1. **Isolate**: Immediately isolate affected systems
2. **Assess**: Determine scope of breach
3. **Rotate**: Change all secrets and passwords
4. **Audit**: Review logs for unauthorized access
5. **Notify**: Inform affected users if required by law

## Compliance Considerations

- **GDPR**: User data protection and right to deletion
- **PCI DSS**: If handling credit card data (use third-party processor)
- **Data Retention**: Define and enforce data retention policies

## Contact

Security issues should be reported to: security@yourcompany.com

## References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [Docker Security](https://docs.docker.com/engine/security/)
