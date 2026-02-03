const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const SSLCommerzPayment = require('sslcommerz-lts');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// SSLCommerz configuration
//const store_id = 'your_store_id';
//const store_passwd = 'your_store_password';
//const is_live = false; // true for live, false for sandbox

// Payment initiation endpoint
app.post('/api/payment/initiate', async (req, res) => {
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
        } = req.body;

        const data = {
            total_amount,
            currency,
            tran_id,
            success_url,
            fail_url,
            cancel_url,
            ipn_url: 'https://your-domain.com/api/payment/ipn',
            shipping_method: 'Courier',
            product_name,
            product_category: 'Service',
            product_profile: 'general',
            cus_name,
            cus_email,
            cus_phone,
            cus_add1,
            cus_city: 'Dhaka',
            cus_country: 'Bangladesh',
            cus_zip: '1000'
        };

        const sslcz = new SSLCommerzPayment(store_id, store_passwd, is_live);
        const apiResponse = await sslcz.init(data);

        if (apiResponse?.GatewayPageURL) {
            res.json({
                GatewayPageURL: apiResponse.GatewayPageURL,
                tran_id: tran_id
            });
        } else {
            res.status(400).json({ error: 'Payment initiation failed' });
        }
    } catch (error) {
        console.error('Payment initiation error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// IPN (Instant Payment Notification) endpoint
app.post('/api/payment/ipn', async (req, res) => {
    try {
        const payment = req.body;
        
        // Verify payment
        if (payment.status === 'VALID') {
            // Update your database with successful payment
            console.log('Payment successful:', payment);
            
            // Send confirmation email/sms
            // Update order status
        }
        
        res.json({ status: 'received' });
    } catch (error) {
        console.error('IPN error:', error);
        res.status(500).json({ error: 'IPN processing failed' });
    }
});

// Payment validation endpoint
app.post('/api/payment/validate', async (req, res) => {
    try {
        const { val_id } = req.body;
        
        const sslcz = new SSLCommerzPayment(store_id, store_passwd, is_live);
        const validationResponse = await sslcz.validate({ val_id });
        
        res.json(validationResponse);
    } catch (error) {
        console.error('Payment validation error:', error);
        res.status(500).json({ error: 'Validation failed' });
    }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
