// api/payment/validate.js
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS, GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  const storeId = process.env.SSLCOMMERZ_STORE_ID;
  const storePassword = process.env.SSLCOMMERZ_STORE_PASSWORD;
  const isSandbox = !storeId;
  const validatorBase = isSandbox
    ? 'https://sandbox.sslcommerz.com/validator/api/validationserverAPI.php'
    : 'https://securepay.sslcommerz.com/validator/api/validationserverAPI.php';

  const buildValidatorUrl = (valId) => {
    const params = new URLSearchParams({
      val_id: valId,
      store_id: storeId || 'testbox',
      store_passwd: storePassword || 'qwerty',
      v: '1',
      format: 'json'
    });
    return `${validatorBase}?${params.toString()}`;
  };

  const validatePayment = async (valId) => {
    const response = await fetch(buildValidatorUrl(valId));
    const result = await response.json();
    return result;
  };

  // Handle GET requests (return URL)
  if (req.method === 'GET') {
    try {
      const { tran_id, val_id } = req.query;

      if (!val_id) {
        return res.status(400).json({
          success: false,
          error: 'val_id is required for payment validation'
        });
      }

      const validation = await validatePayment(val_id);

      if (!['VALID', 'VALIDATED'].includes(validation.status)) {
        return res.status(400).json({
          success: false,
          error: 'Payment not validated',
          data: validation
        });
      }

      return res.json({
        success: true,
        message: 'Payment validated successfully',
        data: {
          tran_id: validation.tran_id || tran_id,
          status: validation.status,
          val_id: validation.val_id || val_id,
          amount: validation.amount,
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
      const paymentData = req.body || {};

      if (!paymentData.val_id) {
        return res.status(400).json({
          status: '400',
          message: 'val_id is required for IPN validation'
        });
      }

      const validation = await validatePayment(paymentData.val_id);

      if (!['VALID', 'VALIDATED'].includes(validation.status)) {
        return res.status(400).json({
          status: '400',
          message: 'Payment validation failed',
          data: validation
        });
      }

      return res.json({
        status: '200',
        message: 'IPN received and validated',
        data: {
          tran_id: validation.tran_id,
          status: validation.status,
          val_id: validation.val_id,
          amount: validation.amount
        }
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
