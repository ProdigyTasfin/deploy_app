// api/proxy.js
module.exports = async function handler(req, res) {
  // Allow all origins
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  try {
    const { endpoint } = req.query;
    
    // Forward to your actual API
    const targetUrl = `https://deployapp-git-main-prodigytasfins-projects.vercel.app/api/${endpoint}`;
    
    const body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
      },
      body
    });
    
    const data = await response.json();
    
    return res.status(response.status).json(data);
    
  } catch (error) {
    console.error('Proxy error:', error);
    return res.status(500).json({ error: 'Proxy error: ' + error.message });
  }
};
