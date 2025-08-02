const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Test route
app.get('/api/status', (req, res) => {
  res.json({ message: '✅ API Render opérationnelle' });
});

app.listen(PORT, () => {
  console.log(`🚀 Serveur en ligne sur le port ${PORT}`);
});
