# 🌐 Reverse Proxy Deployment Guide

This guide covers deploying the Trick-or-Treat Map behind various reverse proxies for production use.

## 🚀 Quick Setup

### 1. Install Dependencies
```powershell
cd "c:\Users\LocalAdmin\Documents\trickortreatmap\trickortreatmap"
npm install
```

### 2. Setup Environment
```powershell
# Create environment file
npm run setup:env

# Edit .env file with your settings
notepad .env
```

### 3. Start in Production Mode
```powershell
npm run start:prod
```

---

## 🔧 Configuration Options

### Environment Variables (.env)

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3001 | Server port |
| `NODE_ENV` | development | Environment (development/production) |
| `DB_PATH` | ./trickortreat.db | SQLite database location |
| `TRUST_PROXY` | true (in prod) | Trust X-Forwarded headers |
| `CORS_ORIGIN` | * | Allowed CORS origins |
| `RATE_LIMIT_MAX_REQUESTS` | 20 | Max requests per minute |

### Example .env for Production:
```env
PORT=3001
NODE_ENV=production
DB_PATH=./data/trickortreat.db
TRUST_PROXY=true
CORS_ORIGIN=https://yourdomain.com,https://www.yourdomain.com
RATE_LIMIT_MAX_REQUESTS=30
```

---

## 🌐 Reverse Proxy Configurations

### Nginx (Recommended)

See `nginx-config.md` for detailed nginx configurations including:
- Basic HTTP setup
- SSL/HTTPS with security headers
- Subdirectory deployment
- Docker configurations
- Performance optimizations

### Apache HTTP Server

```apache
<VirtualHost *:80>
    ServerName yourdomain.com
    Redirect permanent / https://yourdomain.com/
</VirtualHost>

<VirtualHost *:443>
    ServerName yourdomain.com
    
    # SSL Configuration
    SSLEngine on
    SSLCertificateFile /path/to/cert.crt
    SSLCertificateKeyFile /path/to/private.key
    
    # Proxy Configuration
    ProxyPreserveHost On
    ProxyRequests Off
    
    # API endpoints
    ProxyPass /api/ http://localhost:3001/api/
    ProxyPassReverse /api/ http://localhost:3001/api/
    
    # Main application
    ProxyPass / http://localhost:3001/
    ProxyPassReverse / http://localhost:3001/
    
    # Headers for proper client IP detection
    ProxyPassReverse / http://localhost:3001/
    ProxySetEnv X-Forwarded-Proto https
    ProxySetEnv X-Forwarded-For %{REMOTE_ADDR}s
</VirtualHost>
```

### Traefik (Docker)

```yaml
# docker-compose.yml
version: '3.8'
services:
  trickortreat:
    build: .
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.trickortreat.rule=Host(`yourdomain.com`)"
      - "traefik.http.routers.trickortreat.tls.certresolver=letsencrypt"
      - "traefik.http.services.trickortreat.loadbalancer.server.port=3001"
    volumes:
      - ./data:/app/data
    environment:
      - NODE_ENV=production
      - TRUST_PROXY=true
    restart: unless-stopped

  traefik:
    image: traefik:v2.10
    command:
      - "--api.dashboard=true"
      - "--providers.docker=true"
      - "--entrypoints.web.address=:80"
      - "--entrypoints.websecure.address=:443"
      - "--certificatesresolvers.letsencrypt.acme.email=your@email.com"
      - "--certificatesresolvers.letsencrypt.acme.storage=/acme.json"
      - "--certificatesresolvers.letsencrypt.acme.httpchallenge.entrypoint=web"
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - ./acme.json:/acme.json
    restart: unless-stopped
```

### Caddy

```caddy
yourdomain.com {
    reverse_proxy localhost:3001
    
    header {
        # Security headers
        Strict-Transport-Security "max-age=31536000;"
        X-Content-Type-Options "nosniff"
        X-Frame-Options "DENY"
        X-XSS-Protection "1; mode=block"
    }
    
    # Rate limiting
    rate_limit {
        zone dynamic_limit {
            key {remote_host}
            events 30
            window 1m
        }
    }
}
```

---

## 🐳 Docker Deployment

### Dockerfile
```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application files
COPY . .

# Create data directory for SQLite
RUN mkdir -p /app/data

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3001/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1))"

# Start application
CMD ["npm", "run", "start:prod"]
```

### Docker Compose
```yaml
version: '3.8'
services:
  trickortreat:
    build: .
    ports:
      - "3001:3001"
    volumes:
      - ./data:/app/data  # Persist SQLite database
      - ./logs:/app/logs  # Persist logs
    environment:
      NODE_ENV: production
      DB_PATH: /app/data/trickortreat.db
      TRUST_PROXY: true
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

---

## 🔒 Security Considerations

### 1. SSL/TLS Configuration
- Always use HTTPS in production
- Use strong cipher suites
- Enable HSTS headers
- Consider HTTP/2 support

### 2. Rate Limiting
- Configure at both reverse proxy and application level
- Adjust limits based on expected traffic
- Monitor for abuse patterns

### 3. Headers & Security
- Set proper `X-Forwarded-*` headers
- Enable security headers (CSP, HSTS, etc.)
- Validate client IP detection

### 4. Database Security
- Place SQLite file outside web root
- Regular backups
- File permissions (read/write for app user only)

### 5. Monitoring
- Log all requests
- Monitor error rates
- Set up health checks
- Track database size

---

## 🚦 Testing Your Deployment

### 1. Basic Functionality
```bash
# Health check
curl https://yourdomain.com/api/health

# CORS test
curl -H "Origin: https://yourdomain.com" \
     -H "Access-Control-Request-Method: GET" \
     -H "Access-Control-Request-Headers: Content-Type" \
     -X OPTIONS \
     https://yourdomain.com/api/markers

# Rate limit test
for i in {1..25}; do curl https://yourdomain.com/api/health; done
```

### 2. SSL/Security Test
```bash
# SSL Labs test
# Visit: https://www.ssllabs.com/ssltest/analyze.html?d=yourdomain.com

# Security headers
curl -I https://yourdomain.com/

# HSTS test
curl -I https://yourdomain.com/ | grep -i strict
```

### 3. Performance Test
```bash
# Load test with ab (Apache Bench)
ab -n 100 -c 10 https://yourdomain.com/api/health

# WebPageTest
# Visit: https://www.webpagetest.org/
```

---

## 🔧 Troubleshooting

### Common Issues

1. **502 Bad Gateway**
   - Check if Node.js app is running: `netstat -tlnp | grep 3001`
   - Verify proxy configuration
   - Check application logs

2. **CORS Errors**
   - Verify `CORS_ORIGIN` environment variable
   - Check reverse proxy headers
   - Ensure `TRUST_PROXY=true` in production

3. **Rate Limiting Issues**
   - Check client IP detection: `req.ip`
   - Adjust rate limits in `.env`
   - Verify X-Forwarded-For headers

4. **SSL Issues**
   - Verify certificate paths and permissions
   - Check SSL configuration syntax
   - Test with `openssl s_client -connect yourdomain.com:443`

### Logs & Debugging

```bash
# Application logs
tail -f logs/app.log

# Nginx logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log

# System logs (systemd)
journalctl -u nginx -f
```

---

## 📊 Production Checklist

- [ ] Environment variables configured
- [ ] Database initialized and backed up
- [ ] SSL certificate installed and valid
- [ ] Security headers configured
- [ ] Rate limiting enabled
- [ ] Health checks configured
- [ ] Monitoring and logging setup
- [ ] Backup strategy in place
- [ ] Performance testing completed
- [ ] Security scan passed

---

## 🔄 Maintenance

### Regular Tasks
1. **Database Backup**: Set up automated SQLite backups
2. **Log Rotation**: Configure log rotation to prevent disk fill
3. **SSL Renewal**: Automate certificate renewal
4. **Updates**: Keep dependencies and OS updated
5. **Monitoring**: Check application health and performance

### Scaling Considerations
- **Multiple Instances**: Use load balancer with session affinity
- **Database**: Consider read replicas for high traffic
- **Caching**: Add Redis for session storage
- **CDN**: Serve static assets from CDN