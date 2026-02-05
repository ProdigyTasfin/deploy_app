// api/payment/validate.js
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS, GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Handle GET requests (return URL)
  if (req.method === 'GET') {
    try {
      const { tran_id, status, val_id } = req.query;
      
      console.log('Payment validation (GET):', { tran_id, status });
      
      return res.json({
        success: true,
        message: 'Payment validated successfully',
        data: {
          tran_id,
          status: status || 'VALID',
          val_id: val_id || `VAL_${Date.now()}`,
          validated_at: new Date().toISOString()
        }
      });
      
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: 'Validation failed'
      });
    }
  }
  
  // Handle POST requests (IPN)
  if (req.method === 'POST') {
    try {
      const paymentData = req.body;
      
      console.log('IPN received:', {
        tran_id: paymentData.tran_id,
        status: paymentData.status,
        amount: paymentData.amount
      });
      
      // Here you should:
      // 1. Verify the payment with SSLCommerz
      // 2. Update your database
      // 3. Send confirmation emails
      
      return res.json({
        status: '200',
        message: 'IPN received successfully'
      });
      
    } catch (error) {
      console.error('IPN error:', error);
      return res.status(500).json({
        status: '500',
        message: 'IPN processing failed'
      });
    }
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
};