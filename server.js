/*
  ╔══════════════════════════════════════════════════════════════╗
  ║   Bracelets in Bloom — Payment Server                       ║
  ║   Built with Express + Stripe                               ║
  ║                                                              ║
  ║   NEVER share your STRIPE_SECRET_KEY publicly.              ║
  ║   Set it as an environment variable on your host.           ║
  ╚══════════════════════════════════════════════════════════════╝
*/

const express = require('express');
const stripe  = require('stripe')(process.env.STRIPE_SECRET_KEY);
const cors    = require('cors');

const app  = express();
const PORT = process.env.PORT || 4000;

// Allow requests from your website
app.use(cors());
app.use(express.json());

// Health check — visit /ping to confirm server is running
app.get('/ping', (req, res) => {
  res.json({ status: 'ok', shop: 'Bracelets in Bloom 🌸' });
});

// ── Daily order counter (resets automatically at midnight) ──
var orderData = { date: '', count: 0 };

function getTodayCount() {
  var today = new Date().toDateString();
  if (orderData.date !== today) {
    orderData.date  = today;
    orderData.count = 0;
  }
  return orderData.count;
}

// GET /order-count — returns today's order count
app.get('/order-count', (req, res) => {
  res.json({ count: getTodayCount(), date: orderData.date });
});

// POST /increment-order — called when a payment succeeds
app.post('/increment-order', (req, res) => {
  getTodayCount(); // reset if new day
  orderData.count++;
  res.json({ count: orderData.count });
});

// Create a PaymentIntent — called by the checkout form
app.post('/create-payment-intent', async (req, res) => {
  try {
    const {
      amount,
      currency = 'usd',
      customer_name,
      customer_email,
      delivery_method,
      shipping_cost,
      shipping_address
    } = req.body;

    // Validate amount
    if (!amount || amount < 50) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount:   Math.round(amount), // already in cents from frontend
      currency,
      receipt_email: customer_email,
      description:   'Bracelets in Bloom Order',
      metadata: {
        customer_name,
        customer_email,
        delivery_method,
        shipping_cost:    String(shipping_cost || 0),
        shipping_address: JSON.stringify(shipping_address || {})
      }
    });

    res.json({ clientSecret: paymentIntent.client_secret });

  } catch (err) {
    console.error('Stripe error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`🌸 Bracelets in Bloom server running on port ${PORT}`);
});
