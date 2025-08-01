require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY); // ✅ Stripe initialized

const { getStoredItems, storeItems } = require('./items');

const app = express();

// ✅ Allow all origins or configure specific origin
app.use(cors({
  origin: 'http://localhost:5173', // Adjust based on your frontend origin
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
  credentials: true,
}));

app.use(bodyParser.json());

// ✅ Get all items
app.get('/api/items-list', async (req, res) => {
  const storedItems = await getStoredItems();
  await new Promise((resolve) => setTimeout(resolve, 2000));
  res.json({ items: storedItems });
});

// ✅ Get item by ID
app.get('/api/items-list/:id', async (req, res) => {
  const storedItems = await getStoredItems();
  const item = storedItems.find((item) => item.id === req.params.id);
  res.json({ item });
});

// ✅ Add a new item
app.post('/api/items', async (req, res) => {
  const existingItems = await getStoredItems();
  const itemData = req.body;
  const newItem = {
    ...itemData,
    id: Math.random().toString(),
  };
  const updatedItems = [newItem, ...existingItems];
  await storeItems(updatedItems);
  res.status(201).json({ message: 'Stored new item.', item: newItem });
});

// ✅ Stripe Checkout session route
app.post("/api/create-checkout-session", async (req, res) => {
  try {
    const { items } = req.body;

    const lineItems = items.map((item) => ({
      price_data: {
        currency: "inr",
        product_data: {
          name: item.item_name,
          images: [item.image],
        },
        unit_amount: item.current_price * 100 , // Stripe expects amount in paise
      },
      quantity: 1, // default quantity
    }));
    lineItems.push({
  price_data: {
    currency: "inr",
    product_data: {
      name: "Convenience Fee",
    },
    unit_amount: 9900,
  },
  quantity: 1,
});

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: lineItems,
      mode: "payment",
      success_url: "http://localhost:5173/success", // or your deployed frontend URL
      cancel_url: "http://localhost:5173/cancel",
    });

    res.json({ id: session.id });
  } catch (err) {
    console.error("Stripe session creation error:", err);
    res.status(500).json({ error: "Failed to create checkout session" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
