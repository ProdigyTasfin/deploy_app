// api/payment/validate.js - ENHANCED VERSION
const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabase = createClient(
  'https://kohswrhxjvfygzrldyyk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvaHN3cmh4anZmeWd6cmxkeXlrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwMzUzODgsImV4cCI6MjA4NTYxMTM4OH0.rK-SYCs-uC63581jLtuTDdYklsiL7vKtdCO7TuIdKII'
);

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS, GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Handle GET requests for IPN/return URL
  if (req.method === 'GET') {
    try {
      const { 
        tran_id, 
        status, 
        val_id, 
        amount, 
        currency, 
        bank_tran_id,
        card_type,
        card_no,
        card_issuer
      } = req.query;
      
      console.log('🔍 Payment validation (GET):', { tran_id, status });
      
      // Create payment record if it doesn't exist
      if (tran_id && status === 'VALID') {
        const paymentData = {
          tran_id: tran_id,
          val_id: val_id || `VAL_${Date.now()}`,
          amount: amount || '0.00',
          currency: currency || 'BDT',
          bank_tran_id: bank_tran_id || `BANK_${Date.now()}`,
          card_type: card_type || 'Mock Card',
          card_no: card_no || 'XXXX-XXXX-XXXX-0000',
          card_issuer: card_issuer || 'Mock Bank',
          status: 'VALID',
          validated_at: new Date().toISOString(),
          payment_method: 'sslcommerz',
          created_at: new Date().toISOString()
        };
        
        // Store in Supabase
        await supabase
          .from('payments')
          .insert([paymentData]);
          
        console.log('✅ Payment validated and stored:', tran_id);
      }
      
      // Return success page or JSON
      if (req.headers.accept?.includes('text/html')) {
        res.setHeader('Content-Type', 'text/html');
        return res.send(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Payment Validation</title>
            <meta http-equiv="refresh" content="3;url=/payment-success.html?tran_id=${tran_id}">
          </head>
          <body style="text-align: center; padding: 50px; font-family: Arial;">
            <h1>✅ Payment Validated Successfully!</h1>
            <p>Transaction ID: ${tran_id}</p>
            <p>Amount: ${amount} ${currency}</p>
            <p>Status: ${status}</p>
            <p>Redirecting to success page...</p>
          </body>
          </html>
        `);
      }
      
      return res.json({
        success: true,
        message: 'Payment validated successfully',
        data: {
          tran_id,
          status,
          val_id,
          amount,
          currency,
          bank_tran_id,
          validated_at: new Date().toISOString()
        }
      });
      
    } catch (error) {
      console.error('GET validation error:', error);
      return res.json({
        success: false,
        error: 'Validation failed'
      });
    }
  }
  
  // Handle POST requests (SSLCommerz IPN)
  if (req.method === 'POST') {
    try {
      const paymentData = req.body;
      
      console.log('📨 IPN Received:', {
        tran_id: paymentData.tran_id,
        status: paymentData.status,
        amount: paymentData.amount,
        currency: paymentData.currency
      });
      
      // Store in Supabase
      const { data, error } = await supabase
        .from('payments')
        .insert([{
          ...paymentData,
          ipn_received_at: new Date().toISOString(),
          created_at: new Date().toISOString()
        }])
        .select()
        .single();
      
      if (error) {
        console.error('Supabase insert error:', error);
      } else {
        console.log('✅ IPN stored:', data.id);
      }
      
      // If payment is valid, update service request
      if (paymentData.status === 'VALID' && paymentData.value_a && paymentData.value_a !== 'N/A') {
        try {
          await supabase
            .from('service_requests')
            .update({
              status: 'confirmed',
              is_paid: true,
              updated_at: new Date().toISOString()
            })
            .eq('id', paymentData.value_a);
          
          console.log('✅ Service request updated:', paymentData.value_a);
        } catch (updateError) {
          console.error('Service request update error:', updateError);
        }
      }
      
      // Return success response to SSLCommerz
      return res.json({
        status: '200',
        message: 'IPN received successfully'
      });
      
    } catch (error) {
      console.error('IPN processing error:', error);
      return res.status(500).json({
        status: '500',
        message: 'IPN processing failed'
      });
    }
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
};