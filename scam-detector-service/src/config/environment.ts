import dotenv from 'dotenv';

dotenv.config();

export const ENV = {
  PORT: process.env.PORT || '3000',
  GROK_API_KEY: process.env.GROK_API_KEY,
  GROK_MODEL: process.env.GROK_MODEL || 'grok-beta',
  GROK_VISION_MODEL: process.env.GROK_VISION_MODEL || 'grok-2-vision',
  GROK_API_URL: process.env.GROK_API_URL || 'https://api.x.ai/v1',
};

export const validateEnv = (): boolean => {
  if (!ENV.GROK_API_KEY || ENV.GROK_API_KEY === 'xai-your-api-key-here') {
    console.warn('\n⚠️  WARNING: GROK_API_KEY is not set or contains the default placeholder.');
    console.warn('⚠️  The service will run exclusively in local "Demo Mode" for all requests.\n');
    return false; // Return false to indicate Demo Mode is active
  }
  return true; // Return true to indicate Grok API is active
};
