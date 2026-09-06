// BLUEWRITE — Server Entry Point
// Starts the Express server.

const app = require('./src/app');
const env = require('./src/config/env');

app.listen(env.port, () => {
  // eslint-disable-next-line no-console
  console.log(`BLUEWRITE API running on port ${env.port} (${env.nodeEnv})`);
  if (!env.googleAI.apiKey) console.warn('Google AI Studio integration is not configured. Set GEMINI_API_KEY in the backend environment; non-AI features remain available.');
});