const dotenv = require('dotenv');
dotenv.config();

const app = require('./app');
const pool = require('./config/db');
const { initScheduler } = require('./jobs/scheduler');
const seed = require('../scripts/seed');

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    // 1. Verify DB connection
    const [rows] = await pool.query('SELECT 1 + 1 AS result');
    console.log('[Database] Connected successfully to MySQL.');

    // 2. Check if DB is empty; if so, run initial seed
    const [wards] = await pool.query('SELECT COUNT(*) AS count FROM wards');
    if (wards[0].count === 0) {
      console.log('[Database] Empty database detected. Running initial seed...');
      await seed();
    }

    // 3. Initialize background scheduled cron jobs
    initScheduler();

    // 4. Start HTTP Server
    app.listen(PORT, () => {
      console.log(`===============================================`);
      console.log(`CivicTrack Nagpur API is running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`Health check: http://localhost:${PORT}/api/health`);
      console.log(`===============================================`);
    });
  } catch (err) {
    console.error('Fatal error starting server:', err);
    process.exit(1);
  }
}

startServer();

