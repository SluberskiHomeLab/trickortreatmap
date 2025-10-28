# Nginx Reverse Proxy Configuration for Trick-or-Treat Map

## Basic Configuration (HTTP)

```nginx
server {
    listen 80;
    server_name your-domain.com;  # Replace with your domain
    
    # Main application (serves static files and API)
    location / {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket support (if added later)
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        # Increase timeout for long-running requests
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
    
    # Optional: Serve static files directly from nginx (better performance)
    # Uncomment if you want nginx to serve static files instead of Node.js
    #location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
    #    root /path/to/your/trickortreatmap/trickortreatmap;
    #    expires 1y;
    #    add_header Cache-Control "public, immutable";
    #}
}
```

## SSL/HTTPS Configuration (Recommended)

```nginx
# HTTP redirect to HTTPS
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

# HTTPS server
server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    # SSL certificate configuration
    ssl_certificate /path/to/your/ssl/certificate.crt;
    ssl_certificate_key /path/to/your/ssl/private.key;
    
    # Modern SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    
    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    
    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    
    # API endpoints with rate limiting
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # API-specific headers
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Server $host;
    }
    
    # Main application
    location / {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket support
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

## Subdirectory Configuration

If you want to serve the app from a subdirectory (e.g., `your-domain.com/trickortreat/`):

```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    # ... SSL configuration ...
    
    location /trickortreat/ {
        # Remove the subdirectory prefix before forwarding
        rewrite ^/trickortreat/(.*) /$1 break;
        
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Prefix /trickortreat;
        
        # Handle redirects properly
        proxy_redirect http://localhost:3001/ /trickortreat/;
    }
}
```

## Docker Configuration

If using Docker with nginx:

```yaml
# docker-compose.yml
version: '3.8'
services:
  trickortreat-app:
    build: .
    ports:
      - "3001:3001"
    volumes:
      - ./data:/app/data  # Persist SQLite database
    restart: unless-stopped
    
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/conf.d/default.conf
      - ./ssl:/etc/nginx/ssl  # SSL certificates
    depends_on:
      - trickortreat-app
    restart: unless-stopped
```

## Testing Your Configuration

After setting up nginx:

1. **Test nginx configuration**:
   ```bash
   sudo nginx -t
   ```

2. **Reload nginx**:
   ```bash
   sudo systemctl reload nginx
   ```

3. **Test the application**:
   - Visit: `https://your-domain.com/api/health`
   - Should return: `{"status": "healthy", "timestamp": "..."}`

4. **Check headers**:
   ```bash
   curl -I https://your-domain.com/api/health
   ```

## Troubleshooting

- **502 Bad Gateway**: Check if Node.js app is running on port 3001
- **CORS errors**: Verify the `proxy_set_header` directives are correct
- **SSL issues**: Check certificate paths and permissions
- **Rate limiting**: Adjust `limit_req` settings if needed

## Performance Optimizations

For high-traffic deployments:

```nginx
# Add to server block
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
    root /path/to/trickortreatmap/trickortreatmap;
    expires 1y;
    add_header Cache-Control "public, immutable";
    gzip_static on;
}

# Enable gzip compression
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
```