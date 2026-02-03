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
        const { fullName, email, password, phone, role = 'customer' } = req.body;
        
        if (!fullName || !email || !password) {
            return res.status(400).json({ error: 'Full name, email, and password are required' });
        }
        
        // Mock user creation
        const newUser = {
            id: 'user_' + Date.now(),
            fullName,
            email,
            phone: phone || '',
            address: '',
            role,
            createdAt: new Date().toISOString()
        };
        
        // In production, save to database
        res.json({
            success: true,
            message: 'User registered successfully',
            user: newUser
        });
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
};
