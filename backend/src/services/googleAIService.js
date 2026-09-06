const { GoogleGenAI } = require('@google/genai');
const env = require('../config/env');

let clientFactory = (options) => new GoogleGenAI(options);

function configured() {
  return Boolean(String(env.googleAI.apiKey || '').trim());
}

function configuration() {
  if (!configured()) {
    throw Object.assign(new Error('Google AI Studio integration is not configured. Set GEMINI_API_KEY in the backend environment.'), {
      status: 503,
      code: 'GOOGLE_AI_NOT_CONFIGURED',
    });
  }
  return env.googleAI;
}

function providerError(cause) {
  const status = Number(cause?.status || cause?.response?.status || 0);
  const name = String(cause?.name || '');
  if (name === 'AbortError' || name === 'TimeoutError' || /aborted|timeout/i.test(String(cause?.message || ''))) {
    return Object.assign(new Error('Google AI Studio request timed out.'), { status: 504, code: 'GOOGLE_AI_TIMEOUT' });
  }
  if (status === 401 || status === 403) {
    return Object.assign(new Error('Google AI Studio authentication failed.'), { status: 503, code: 'GOOGLE_AI_AUTHENTICATION_FAILED' });
  }
  if (status === 429) {
    return Object.assign(new Error('Google AI Studio rate limit or quota was reached.'), { status: 503, code: 'GOOGLE_AI_RATE_LIMITED' });
  }
  if (status === 503) {
    return Object.assign(new Error('Google AI Studio is temporarily overloaded.'), { status: 503, code: 'GOOGLE_AI_OVERLOADED' });
  }
  if (status === 400 || status === 404) {
    return Object.assign(new Error('Google AI Studio rejected the configured model or request.'), { status: 503, code: 'GOOGLE_AI_INVALID_REQUEST' });
  }
  return Object.assign(new Error('Google AI Studio report generation is temporarily unavailable.'), { status: 503, code: 'GOOGLE_AI_UNAVAILABLE' });
}

async function generatePoliceReport({ instructions, input, timeoutMs, maxOutputTokens, responseMimeType = 'text/plain', responseJsonSchema }) {
  const config = configuration();
  const timeout = Math.max(1000, Number(timeoutMs || config.timeoutMs));
  const deadline = Date.now() + timeout;
  const client = clientFactory({ apiKey: config.apiKey });
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const remainingMs = deadline - Date.now();
    if (remainingMs <= 0) throw Object.assign(new Error('Google AI Studio request timed out.'), { status: 504, code: 'GOOGLE_AI_TIMEOUT' });
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), remainingMs);
    try {
      const response = await client.models.generateContent({
        model: config.model,
        contents: input,
        config: {
          systemInstruction: instructions,
          temperature: 0.1,
          maxOutputTokens: maxOutputTokens || config.maxOutputTokens,
          responseMimeType,
          ...(responseJsonSchema ? { responseJsonSchema } : {}),
          abortSignal: controller.signal,
          httpOptions: {
            timeout: remainingMs,
            retryOptions: { attempts: 1 },
          },
        },
      });
      const outputText = String(response?.text || '').trim();
      if (!outputText) throw Object.assign(new Error('Google AI Studio returned an empty response.'), { status: 502, code: 'GOOGLE_AI_EMPTY_RESPONSE' });
      return { text: outputText, provider: 'Google AI Studio', model: config.model };
    } catch (cause) {
      if (cause?.code === 'GOOGLE_AI_EMPTY_RESPONSE') throw cause;
      const mapped = providerError(cause);
      const retryDelayMs = Math.max(0, Number(config.retryDelayMs || 0));
      const canRetryOverload = mapped.code === 'GOOGLE_AI_OVERLOADED' && attempt === 1 && deadline - Date.now() > retryDelayMs + 1000;
      if (!canRetryOverload) throw mapped;
      if (retryDelayMs) await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
    } finally {
      clearTimeout(timer);
    }
  }
  throw Object.assign(new Error('Google AI Studio report generation is temporarily unavailable.'), { status: 503, code: 'GOOGLE_AI_UNAVAILABLE' });
}

function setClientFactoryForTests(factory) {
  clientFactory = factory || ((options) => new GoogleGenAI(options));
}

module.exports = { configured, configuration, generatePoliceReport, providerError, setClientFactoryForTests };