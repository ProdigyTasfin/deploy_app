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
        const {
            total_amount,
            currency,
            tran_id,
            success_url,
            fail_url,
            cancel_url,
            cus_name,
            cus_email,
            cus_phone,
            cus_add1,
            product_name
        } = req.body || {};

        if (!total_amount || !currency || !tran_id || !success_url || !fail_url || !cancel_url) {
            return res.status(400).json({ error: 'Missing required payment fields' });
        }

        const mockResponse = {
            GatewayPageURL: 'https://sandbox.sslcommerz.com/gwprocess/v4/gateway.php?Q=PAY&SESSIONKEY=mock',
            tran_id,
            total_amount,
            currency,
            cus_name,
            cus_email,
            cus_phone,
            cus_add1,
            product_name
        };

        res.json(mockResponse);
    } catch (error) {
        console.error('Payment initiation error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
