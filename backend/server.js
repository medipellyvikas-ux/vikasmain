import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { initDatabase } from './db.js';
import apiRouter, { triggerAutomatedWhatsAppReport } from './routes.js';
import gymRouter from './gymRoutes.js';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS
app.use(cors());

// Body parser with size limits for Base64 receipt image uploads
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Serve API routes
app.use('/api', apiRouter);
app.use('/api/gym', gymRouter);

// Serve Static Frontend files in production
const frontendDistPath = path.join(__dirname, '../frontend/dist');
app.use(express.static(frontendDistPath));

// Fallback for Single Page Application routing in React
app.get('*', (req, res, next) => {
  // If request is for an API route, don't serve HTML
  if (req.url.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(frontendDistPath, 'index.html'), (err) => {
    if (err) {
      // In development when build directory doesn't exist yet, return a simple status
      res.status(200).send('Room Expense Tracker API server is running. Frontend has not been built yet.');
    }
  });
});

// Daily WhatsApp Automation Scheduler (Runs at 9:00 PM every day)
let lastRunDate = '';
function initDailyCronJob() {
  console.log('[Daily Automation]: Initialized WhatsApp daily report scheduler (Runs at 9:00 PM daily).');
  setInterval(async () => {
    const now = new Date();
    const todayDateStr = now.toISOString().split('T')[0];
    
    // Check if time is 21:00 (9:00 PM) and hasn't run yet today
    if (now.getHours() === 21 && lastRunDate !== todayDateStr) {
      lastRunDate = todayDateStr;
      console.log(`[Daily Automation]: Running 9 PM WhatsApp report dispatch for ${todayDateStr}...`);
      try {
        await triggerAutomatedWhatsAppReport();
      } catch (err) {
        console.error('[Daily Automation Error]:', err.message);
      }
    }
  }, 30000); // Checks every 30 seconds
}

// Start Express server and initialize database tables
const startServer = async () => {
  try {
    await initDatabase();
    initDailyCronJob();
    app.listen(PORT, () => {
      console.log(`====================================================`);
      console.log(`  Room Expense Tracker server is running on port ${PORT}`);
      console.log(`  API Base: http://localhost:${PORT}/api`);
      console.log(`====================================================`);
    });
  } catch (err) {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  }
};

startServer();
