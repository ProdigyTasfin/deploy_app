// api/proxy.js
export default async function handler(req, res) {
  // Allow all origins
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  try {
    const { endpoint } = req.query;
    const targetUrl = `https://deployapp-git-main-prodigytasfins-projects.vercel.app/api/${endpoint}`;
    
    console.log('🔁 Proxying to:', targetUrl);
    
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        ...req.headers
      },
      body: req.method !== 'GET' ? JSON.stringify(req.body) : undefined
    });
    
    const data = await response.json();
    
    return res.status(response.status).json(data);
    
  } catch (error) {
    console.error('❌ Proxy error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Proxy error: ' + error.message 
    });
  }
}
