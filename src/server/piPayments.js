require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();
app.use(bodyParser.json());

const API_KEY = process.env.PI_API_KEY;
const BASE_URL = process.env.PI_API_BASE_URL || 'https://api.minepi.com';
// Endpoint to verify rewarded ad status
app.post('/verify-rewarded-ad', async (req, res) => {
  const { adId } = req.body;
  try {
    const response = await axios.get(
      `${BASE_URL}/v2/ads_network/status/${adId}`,
      {
        headers: {
          Authorization: `Key ${API_KEY}`,
        },
      }
    );
    res.status(200).json({ success: true, data: response.data });
  } catch (error) {
    console.error('Error verifying rewarded ad:', error.response?.data || error.message);
    res.status(500).json({ success: false, error: error.response?.data || error.message });
  }
});

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