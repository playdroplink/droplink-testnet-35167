const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();
app.use(bodyParser.json());

const API_KEY = '6dxche8cvknkiozfe7no9eucsi5ohlqy6oyrlclq9jx03gt9z10icujzbfaiaev7';
const BASE_URL = 'https://api.minepi.com';

// Endpoint to handle server-side approval
app.post('/approve-payment', async (req, res) => {
  const { paymentId } = req.body;

  try {
    const response = await axios.post(
      `${BASE_URL}/v2/payments/${paymentId}/approve`,
      {},
      {
        headers: {
          Authorization: `Key ${API_KEY}`,
        },
      }
    );

    res.status(200).json({ success: true, data: response.data });
  } catch (error) {
    console.error('Error approving payment:', error.response?.data || error.message);
    res.status(500).json({ success: false, error: error.response?.data || error.message });
  }
});

// Endpoint to handle server-side completion
app.post('/complete-payment', async (req, res) => {
  const { paymentId, txid } = req.body;

  try {
    const response = await axios.post(
      `${BASE_URL}/v2/payments/${paymentId}/complete`,
      { txid },
      {
        headers: {
          Authorization: `Key ${API_KEY}`,
        },
      }
    );

    res.status(200).json({ success: true, data: response.data });
  } catch (error) {
    console.error('Error completing payment:', error.response?.data || error.message);
    res.status(500).json({ success: false, error: error.response?.data || error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});