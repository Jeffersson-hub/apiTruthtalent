const express = require('express');
const routes = require('../routes/analyze');
const app = express();
const PORT = process.env.PORT || 3000;

app.use('/api/analyze', routes);

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
