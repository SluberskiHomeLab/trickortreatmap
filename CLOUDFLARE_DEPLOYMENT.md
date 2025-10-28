# Cloudflare R2 + Workers Deployment Guide

This guide will help you deploy the Trick or Treat Map using Cloudflare R2 for storage and Cloudflare Workers for the API backend.

## Prerequisites

- Cloudflare account (free tier works)
- [Node.js](https://nodejs.org/) installed
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/) installed

## Step 1: Install Wrangler CLI

```bash
npm install -g wrangler
wrangler login
```

## Step 2: Create R2 Bucket

1. Log into Cloudflare Dashboard
2. Go to **R2 Object Storage**
3. Create a new bucket named `trickortreat-markers`
4. Note your Account ID (you'll need this)

## Step 3: Configure wrangler.toml

Update the `wrangler.toml` file with your details:

```toml
name = "trickortreat-api"
main = "cloudflare-worker.js"
compatibility_date = "2023-10-30"

# R2 bucket binding
[[r2_buckets]]
binding = "R2_BUCKET"
bucket_name = "trickortreat-markers"
preview_bucket_name = "trickortreat-markers-preview"

# Environment variables
[env.production.vars]
ALLOWED_ORIGINS = "https://yourdomain.com,https://yourname.github.io"

[env.development.vars]
ALLOWED_ORIGINS = "*"
```

## Step 4: Deploy the Worker

```bash
# Deploy to production
wrangler deploy

# Or deploy to staging first
wrangler deploy --env development
```

## Step 5: Get Your Worker URL

After deployment, you'll get a URL like:
`https://trickortreat-api.<your-subdomain>.workers.dev`

## Step 6: Update config.js

Update your local `config.js` with the Worker URL:

```javascript
window.CONFIG = {
    api: {
        baseUrl: "https://trickortreat-api.<your-subdomain>.workers.dev",
        endpoints: {
            markers: "/api/markers",
            health: "/api/health"
        }
    },
    googleMapsApiKey: "your-google-maps-api-key", // Optional
    // ... other config
};
```

## Step 7: Test the Deployment

1. Open your `index.html` in a browser
2. Check the browser console for API connection status
3. Try adding/removing markers to test the API

## Security Configuration

### Environment Variables (Optional)

Set additional environment variables in Cloudflare Dashboard:

```bash
# In Cloudflare Dashboard > Workers > Your Worker > Settings > Variables
ALLOWED_ORIGINS = "https://yourdomain.com,https://yourname.github.io"
```

### CORS Configuration

The Worker automatically handles CORS based on your `ALLOWED_ORIGINS` setting. Update this to restrict access to your domain(s).

### Rate Limiting

The API includes built-in rate limiting:
- 10 requests per minute per IP
- Configurable in the Worker code

## Monitoring and Logs

### View Logs
```bash
wrangler tail
```

### Monitor Usage
- Cloudflare Dashboard > Workers > Analytics
- Cloudflare Dashboard > R2 > Metrics

## Cost Estimation

**Cloudflare R2 (Free Tier):**
- 10 GB storage/month
- 1 million Class A operations/month
- 10 million Class B operations/month

**Cloudflare Workers (Free Tier):**
- 100,000 requests/day
- 10ms CPU time per request

For a neighborhood trick-or-treat map, this should easily fit within free tier limits.

## Troubleshooting

### Common Issues

**Worker deployment fails:**
```bash
# Check your wrangler.toml syntax
wrangler validate

# Verify authentication
wrangler whoami
```

**API not accessible:**
1. Check CORS settings in Worker
2. Verify `ALLOWED_ORIGINS` includes your domain
3. Check browser network tab for errors

**Markers not saving:**
1. Check browser console for errors
2. Verify R2 bucket permissions
3. Test API health endpoint: `https://your-worker.workers.dev/api/health`

**Rate limiting errors:**
- Wait 1 minute before retrying
- Adjust rate limits in Worker code if needed

### Debug Mode

Add debug logging to your Worker:

```javascript
// In cloudflare-worker.js
console.log('Request:', request.method, url.pathname);
console.log('Origin:', origin);
```

View logs with `wrangler tail`

## Backup and Recovery

### Export Data
```bash
# Use wrangler to download markers.json
wrangler r2 object get trickortreat-markers/markers.json --file backup.json
```

### Import Data
```bash
# Upload backup to R2
wrangler r2 object put trickortreat-markers/markers.json --file backup.json
```

## Custom Domain (Optional)

To use a custom domain like `api.yourdomain.com`:

1. Add a Custom Domain in Cloudflare Workers
2. Update DNS in your domain settings
3. Update `config.js` with your custom domain

## Performance Optimization

### Caching
- R2 responses are cached for 5 minutes
- Browser caching headers are set automatically

### Global Distribution
- Workers run in 200+ locations worldwide
- R2 provides global object storage

This setup provides a fast, scalable, and cost-effective backend for your trick-or-treat map!