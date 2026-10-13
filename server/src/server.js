import 'dotenv/config';
import app from './app.js';
import { testConnection } from './config/db.js';
import { runSeed } from './config/seed.js';

const PORT = process.env.PORT || 5000;

async function start() {
  await testConnection();
  await runSeed();
  app.listen(PORT, () => {
    console.log(`MediKiosk server running on http://localhost:${PORT}`);
    console.log('DEMO MODE — Synthetic data only');
  });
}

start().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
