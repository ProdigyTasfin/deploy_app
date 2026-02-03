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
        const { val_id } = req.body;
        
        // Mock validation response
        const mockValidation = {
            status: 'VALID',
            tran_id: val_id,
            amount: '2500',
            currency: 'BDT',
            bank_tran_id: `BANK${Date.now()}`,
            card_type: 'VISA',
            card_no: 'XXXX-XXXX-XXXX-1234',
            card_issuer: 'BRAC BANK',
            card_brand: 'VISA',
            card_issuer_country: 'Bangladesh',
            card_issuer_country_code: 'BD',
            store_amount: '2450',
            currency_rate: '1.00',
            currency_amount: '2500',
            currency_type: 'BDT',
            value_a: 'Custom value A',
            value_b: 'Custom value B',
            value_c: 'Custom value C',
            value_d: 'Custom value D'
        };
        
        res.json(mockValidation);
    } catch (error) {
        console.error('Validation error:', error);
        res.status(500).json({ error: 'Validation failed' });
    }
};
