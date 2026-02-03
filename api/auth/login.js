const bcrypt = require('bcryptjs');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }
        
        // Mock user validation
        // In production, query from database
        const mockUser = {
            id: 'user_123',
            email: email,
            fullName: 'Demo User',
            phone: '01234567890',
            address: 'Dhaka, Bangladesh',
            role: 'customer',
            createdAt: new Date().toISOString()
        };
        
        // For demo, accept any password
        // In production, verify password hash
        const isValid = true; // Replace with actual password verification
        
        if (isValid) {
            res.json({
                success: true,
                user: mockUser,
                token: 'mock_jwt_token_' + Date.now()
            });
        } else {
            res.status(401).json({ error: 'Invalid credentials' });
        }
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
};
