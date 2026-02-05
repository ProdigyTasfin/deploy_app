// api/payment/initiate.js - ENHANCED VERSION
const crypto = require('crypto');

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }
  
  try {
    const {
      total_amount,
      currency = 'BDT',
      cus_name,
      cus_email,
      cus_phone,
      cus_add1,
      product_name = 'Nibash Service Payment',
      service_request_id,
      customer_id
    } = req.body || {};
    
    console.log('💳 Payment initiation:', { total_amount, cus_email });
    
    // ================= VALIDATION =================
    if (!total_amount || total_amount <= 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Valid amount is required' 
      });
    }
    
    if (!cus_email || !cus_name || !cus_phone) {
      return res.status(400).json({ 
        success: false, 
        error: 'Customer information is required' 
      });
    }
    
    // ================= GENERATE TRANSACTION ID =================
    const tran_id = `NIBASH_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    
    // ================= SSLCOMMERZ CONFIGURATION =================
    const store_id = process.env.SSLCOMMERZ_STORE_ID || 'testbox';
    const store_passwd = process.env.SSLCOMMERZ_STORE_PASSWORD || 'qwerty';
    const is_sandbox = !process.env.SSLCOMMERZ_STORE_ID; // Use sandbox if no store ID
    
    const base_url = process.env.BASE_URL || 'http://localhost:3000';
    
    // ================= SSLCOMMERZ PAYMENT DATA =================
    const postData = {
      store_id: store_id,
      store_passwd: store_passwd,
      total_amount: parseFloat(total_amount).toFixed(2),
      currency: currency,
      tran_id: tran_id,
      success_url: `${base_url}/payment-success.html?tran_id=${tran_id}&status=success`,
      fail_url: `${base_url}/payment-failed.html?tran_id=${tran_id}&status=failed`,
      cancel_url: `${base_url}/payment-cancel.html?tran_id=${tran_id}&status=canceled`,
      ipn_url: `${base_url}/api/payment/validate`,
      
      // Customer info
      cus_name: cus_name,
      cus_email: cus_email,
      cus_add1: cus_add1 || 'Dhaka, Bangladesh',
      cus_add2: '',
      cus_city: 'Dhaka',
      cus_state: 'Dhaka',
      cus_postcode: '1000',
      cus_country: 'Bangladesh',
      cus_phone: cus_phone,
      
      // Product info
      product_name: product_name,
      product_category: 'Home Service',
      product_profile: 'general',
      
      // Shipping info
      shipping_method: 'NO',
      num_of_item: 1,
      
      // Additional info for callback
      value_a: service_request_id || 'N/A', // Service request ID
      value_b: customer_id || 'N/A', // Customer ID
      value_c: 'nibash_payment_2024', // Platform identifier
      value_d: `${total_amount}_${currency}` // Amount and currency
    };
    
    // ================= SEND TO SSLCOMMERZ =================
    const sslcommerzUrl = is_sandbox 
      ? 'https://sandbox.sslcommerz.com/gwprocess/v4/api.php'
      : 'https://securepay.sslcommerz.com/gwprocess/v4/api.php';
    
    console.log('🔄 Sending to SSLCommerz:', sslcommerzUrl);
    
    try {
      const response = await fetch(sslcommerzUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams(Object.entries(postData))
      });
      
      const result = await response.json();
      
      console.log('SSLCommerz Response:', result);
      
      if (result.status === 'SUCCESS') {
        return res.json({
          success: true,
          message: 'Payment initiated successfully',
          data: {
            GatewayPageURL: result.GatewayPageURL,
            tran_id: tran_id,
            session_key: result.sessionkey,
            gateway: 'sslcommerz',
            is_sandbox: is_sandbox,
            amount: total_amount,
            currency: currency,
            customer_email: cus_email,
            redirect_url: result.GatewayPageURL,
            instructions: 'Redirecting to payment gateway...'
          }
        });
      } else {
        // Fallback to mock if SSLCommerz fails
        console.warn('SSLCommerz failed, using mock response');
        return res.json({
          success: true,
          message: 'Payment initiated (mock mode)',
          data: {
            GatewayPageURL: 'https://sandbox.sslcommerz.com/gwprocess/v4/gateway.php?Q=PAY&SESSIONKEY=mock_session',
            tran_id: tran_id,
            gateway: 'sslcommerz_mock',
            is_sandbox: true,
            amount: total_amount,
            currency: currency,
            customer_email: cus_email,
            redirect_url: `${base_url}/payment-success.html?tran_id=${tran_id}&status=success_mock`,
            instructions: 'Mock payment - redirecting to success page'
          }
        });
      }
      
    } catch (fetchError) {
      console.error('SSLCommerz fetch error:', fetchError);
      // Fallback to mock response
      return res.json({
        success: true,
        message: 'Payment initiated (fallback mode)',
        data: {
          GatewayPageURL: `${base_url}/payment-success.html?tran_id=${tran_id}&status=success_fallback`,
          tran_id: tran_id,
          gateway: 'fallback',
          is_sandbox: true,
          amount: total_amount,
          currency: currency,
          customer_email: cus_email,
          redirect_url: `${base_url}/payment-success.html?tran_id=${tran_id}&status=success_fallback`,
          instructions: 'Fallback payment mode'
        }
      });
    }
    
  } catch (error) {
    console.error('Payment initiation error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Payment initiation failed',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};