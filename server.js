// server.js - canonical startup entry
const app = require('./index');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`API test: http://localhost:${PORT}/api/test`);
});
