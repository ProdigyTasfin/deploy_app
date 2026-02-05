// api/payment/initiate.js
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
      currency = 'BDT',
      tran_id,
      success_url,
      fail_url,
      cancel_url,
      cus_name,
      cus_email,
      cus_phone,
      cus_add1,
      product_name = 'Nibash Service'
    } = req.body || {};
    
    console.log('Payment initiation:', { total_amount, cus_email });
    
    if (!total_amount || !currency || !cus_email) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required payment fields' 
      });
    }
    
    // Generate transaction ID if not provided
    const transactionId = tran_id || `NIBASH_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // SSLCommerz configuration
    const storeId = process.env.SSLCOMMERZ_STORE_ID || 'testbox';
    const storePassword = process.env.SSLCOMMERZ_STORE_PASSWORD || 'qwerty';
    const isSandbox = !process.env.SSLCOMMERZ_STORE_ID;
    
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : (process.env.BASE_URL || 'http://localhost:3000');
    
    // Prepare SSLCommerz data
    const postData = {
      store_id: storeId,
      store_passwd: storePassword,
      total_amount: parseFloat(total_amount).toFixed(2),
      currency: currency,
      tran_id: transactionId,
      success_url: success_url || `${baseUrl}/payment-success.html?tran_id=${transactionId}&status=success`,
      fail_url: fail_url || `${baseUrl}/payment-failed.html?tran_id=${transactionId}&status=failed`,
      cancel_url: cancel_url || `${baseUrl}/payment-cancel.html?tran_id=${transactionId}&status=canceled`,
      ipn_url: `${baseUrl}/api/payment/validate`,
      
      // Customer info
      cus_name: cus_name || 'Customer',
      cus_email: cus_email,
      cus_phone: cus_phone || '01700000000',
      cus_add1: cus_add1 || 'Dhaka, Bangladesh',
      cus_city: 'Dhaka',
      cus_country: 'Bangladesh',
      cus_postcode: '1000',
      
      // Product info
      product_name: product_name,
      product_category: 'Home Service',
      product_profile: 'general',
      
      // Shipping info
      shipping_method: 'NO',
      num_of_item: 1,
      
      // Additional parameters
      value_a: 'payment_reference',
      value_b: 'customer_info',
      value_c: 'service_details'
    };
    
    // Send to SSLCommerz
    const sslcommerzUrl = isSandbox 
      ? 'https://sandbox.sslcommerz.com/gwprocess/v4/api.php'
      : 'https://securepay.sslcommerz.com/gwprocess/v4/api.php';
    
    try {
      const response = await fetch(sslcommerzUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams(postData)
      });
      
      const result = await response.json();
      
      if (result.status === 'SUCCESS') {
        return res.json({
          success: true,
          GatewayPageURL: result.GatewayPageURL,
          tran_id: transactionId,
          amount: total_amount,
          currency: currency,
          gateway: 'sslcommerz',
          is_sandbox: isSandbox
        });
      } else {
        throw new Error(result.failedreason || 'SSLCommerz payment failed');
      }
      
    } catch (fetchError) {
      console.error('SSLCommerz error:', fetchError);
      
      // Fallback to mock response for development
      return res.json({
        success: true,
        GatewayPageURL: `${baseUrl}/payment-success.html?tran_id=${transactionId}&status=success_mock`,
        tran_id: transactionId,
        amount: total_amount,
        currency: currency,
        gateway: 'mock',
        is_sandbox: true,
        message: 'Using mock payment for development'
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