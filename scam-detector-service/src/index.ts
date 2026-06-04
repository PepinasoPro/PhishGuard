import express from 'express';
import multer from 'multer';
import { detectScam } from './controllers/scamController.js';
import { errorHandler } from './middleware/errorHandler.js';
import { ENV, validateEnv } from './config/environment.js';

let isGrokActive = false;

// Validate env vars on startup
try {
  isGrokActive = validateEnv();
} catch (e: any) {
  console.error('Environment validation failed:', e.message);
  process.exit(1);
}

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    mode: isGrokActive ? 'Grok API' : 'Demo Mode (Offline Fallback)',
    timestamp: new Date().toISOString()
  });
});

// Scam detection endpoint
app.post('/detect', upload.single('image'), detectScam);

// Global error handler
app.use(errorHandler);

const PORT = parseInt(ENV.PORT);
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Scam Detector Service running on port ${PORT}`);
  if (isGrokActive) {
    console.log(`🧠 Mode: Grok (xAI) active`);
    console.log(`🤖 Text Model: ${ENV.GROK_MODEL}`);
    console.log(`👁️  Vision Model: ${ENV.GROK_VISION_MODEL}`);
  } else {
    console.log(`⚠️  Mode: LOCAL DEMO MODE (Offline Heuristics & OCR)`);
  }
});
