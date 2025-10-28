// Cloudflare Worker for Trick or Treat Map API
// This worker provides secure access to R2 storage for marker data

// Configuration - Set these as environment variables in Cloudflare Workers dashboard
// R2_BUCKET_NAME: Your R2 bucket name
// ALLOWED_ORIGINS: Comma-separated list of allowed domains

export default {
  async fetch(request, env, ctx) {
    return handleRequest(request, env);
  },
};

async function handleRequest(request, env) {
  const url = new URL(request.url);
  const origin = request.headers.get('Origin');
  
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': getAllowedOrigin(origin, env.ALLOWED_ORIGINS),
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };
  
  // Handle CORS preflight requests
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    // Route handling
    if (url.pathname === '/api/health') {
      return handleHealth(corsHeaders);
    }
    
    if (url.pathname === '/api/markers') {
      switch (request.method) {
        case 'GET':
          return handleGetMarkers(env, corsHeaders);
        case 'POST':
          return handleCreateMarker(request, env, corsHeaders);
        case 'PUT':
          return handleUpdateMarker(request, env, corsHeaders);
        case 'DELETE':
          return handleDeleteMarker(request, env, corsHeaders);
        default:
          return jsonResponse({ error: 'Method not allowed' }, 405, corsHeaders);
      }
    }
    
    return jsonResponse({ error: 'Not found' }, 404, corsHeaders);
  } catch (error) {
    console.error('Worker error:', error);
    return jsonResponse({ error: 'Internal server error' }, 500, corsHeaders);
  }
}

// Health check endpoint
async function handleHealth(corsHeaders) {
  return jsonResponse({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'trickortreat-api'
  }, 200, corsHeaders);
}

// Get all markers
async function handleGetMarkers(env, corsHeaders) {
  try {
    const object = await env.R2_BUCKET.get('markers.json');
    
    if (!object) {
      return jsonResponse({ markers: [] }, 200, corsHeaders);
    }
    
    const data = await object.text();
    const markers = JSON.parse(data);
    
    // Add cache headers
    const cacheHeaders = {
      ...corsHeaders,
      'Cache-Control': 'public, max-age=300', // 5 minute cache
      'ETag': object.etag,
    };
    
    return jsonResponse({ markers: markers.markers || [] }, 200, cacheHeaders);
  } catch (error) {
    console.error('Get markers error:', error);
    return jsonResponse({ error: 'Failed to retrieve markers' }, 500, corsHeaders);
  }
}

// Create new marker
async function handleCreateMarker(request, env, corsHeaders) {
  try {
    const body = await request.json();
    
    // Validate required fields
    if (!body.x || !body.y || !body.id) {
      return jsonResponse({ error: 'Missing required fields: x, y, id' }, 400, corsHeaders);
    }
    
    // Rate limiting check (basic implementation)
    const clientId = getClientId(request);
    const rateLimitKey = `rate_limit_${clientId}`;
    
    // Get existing markers
    let markers = [];
    const existingObject = await env.R2_BUCKET.get('markers.json');
    if (existingObject) {
      const data = JSON.parse(await existingObject.text());
      markers = data.markers || [];
    }
    
    // Check marker limit
    if (markers.length >= 100) {
      return jsonResponse({ error: 'Maximum markers limit reached' }, 429, corsHeaders);
    }
    
    // Create new marker
    const newMarker = {
      id: body.id,
      x: parseFloat(body.x),
      y: parseFloat(body.y),
      timestamp: new Date().toISOString(),
      clientId: clientId,
      // Optional fields
      ...(body.lat && { lat: parseFloat(body.lat) }),
      ...(body.lng && { lng: parseFloat(body.lng) }),
    };
    
    // Remove existing marker with same ID (update)
    markers = markers.filter(m => m.id !== body.id);
    markers.push(newMarker);
    
    // Save to R2
    const updatedData = {
      markers,
      lastUpdated: new Date().toISOString(),
      version: 1
    };
    
    await env.R2_BUCKET.put('markers.json', JSON.stringify(updatedData), {
      httpMetadata: {
        contentType: 'application/json',
      },
    });
    
    return jsonResponse({ 
      success: true, 
      marker: newMarker,
      total: markers.length 
    }, 201, corsHeaders);
    
  } catch (error) {
    console.error('Create marker error:', error);
    return jsonResponse({ error: 'Failed to create marker' }, 500, corsHeaders);
  }
}

// Delete marker
async function handleDeleteMarker(request, env, corsHeaders) {
  try {
    const url = new URL(request.url);
    const markerId = url.searchParams.get('id');
    
    if (!markerId) {
      return jsonResponse({ error: 'Missing marker id parameter' }, 400, corsHeaders);
    }
    
    // Get existing markers
    const existingObject = await env.R2_BUCKET.get('markers.json');
    if (!existingObject) {
      return jsonResponse({ error: 'Marker not found' }, 404, corsHeaders);
    }
    
    const data = JSON.parse(await existingObject.text());
    let markers = data.markers || [];
    
    // Remove marker
    const initialLength = markers.length;
    markers = markers.filter(m => m.id !== markerId);
    
    if (markers.length === initialLength) {
      return jsonResponse({ error: 'Marker not found' }, 404, corsHeaders);
    }
    
    // Save updated markers
    const updatedData = {
      markers,
      lastUpdated: new Date().toISOString(),
      version: 1
    };
    
    await env.R2_BUCKET.put('markers.json', JSON.stringify(updatedData), {
      httpMetadata: {
        contentType: 'application/json',
      },
    });
    
    return jsonResponse({ 
      success: true, 
      deletedId: markerId,
      remaining: markers.length 
    }, 200, corsHeaders);
    
  } catch (error) {
    console.error('Delete marker error:', error);
    return jsonResponse({ error: 'Failed to delete marker' }, 500, corsHeaders);
  }
}

// Update marker (alias for create)
async function handleUpdateMarker(request, env, corsHeaders) {
  return handleCreateMarker(request, env, corsHeaders);
}

// Utility functions
function jsonResponse(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  });
}

function getAllowedOrigin(origin, allowedOrigins) {
  if (!allowedOrigins) return '*';
  
  const allowed = allowedOrigins.split(',').map(s => s.trim());
  
  if (allowed.includes('*')) return '*';
  
  if (origin && allowed.includes(origin)) {
    return origin;
  }
  
  // Check for wildcard patterns
  for (const allowedOrigin of allowed) {
    if (allowedOrigin.includes('*')) {
      const pattern = allowedOrigin.replace(/\*/g, '.*');
      const regex = new RegExp(`^${pattern}$`);
      if (origin && regex.test(origin)) {
        return origin;
      }
    }
  }
  
  return allowed[0] || '*';
}

function getClientId(request) {
  // Simple client identification for rate limiting
  const forwarded = request.headers.get('CF-Connecting-IP') || 
                   request.headers.get('X-Forwarded-For') || 
                   'unknown';
  return forwarded.split(',')[0].trim();
}