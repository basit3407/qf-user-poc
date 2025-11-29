require('dotenv').config();

const express = require('express');
const axios = require('axios');
const crypto = require('crypto');

const app = express();

// ====== CONFIG (PUT YOUR VALUES HERE) ======
function getRequiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

const CLIENT_ID = getRequiredEnv('QF_CLIENT_ID');
const CLIENT_SECRET = getRequiredEnv('QF_CLIENT_SECRET');
const REDIRECT_URI = getRequiredEnv('QF_REDIRECT_URI')

const OAUTH_BASE = 'https://oauth2.quran.foundation';
const API_BASE = 'https://apis.quran.foundation';

// VERY naive in-memory storage just for PoC7f04ea3a-ea78-47f2-82b4-bc1b5539dbd7
let currentCodeVerifier = null;
let currentState = null;

// ==== PKCE helpers (from docs, slightly wrapped) ====
function base64url(buf) {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/,'');
}

function generatePkcePair() {
  const codeVerifier = base64url(crypto.randomBytes(32));
  const hash = crypto.createHash('sha256').update(codeVerifier).digest();
  const codeChallenge = base64url(hash);
  return { codeVerifier, codeChallenge };
}

// ===== ROUTES =====

// Home: simple link
app.get('/', (req, res) => {
  res.send('<a href="/login">Login with Quran.Foundation (User APIs PoC)</a>');
});

// Step 2 from docs: build authorization URL with PKCE
app.get('/login', (req, res) => {
  const { codeVerifier, codeChallenge } = generatePkcePair();
  currentCodeVerifier = codeVerifier;
  currentState = crypto.randomBytes(16).toString('hex');

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    scope: 'openid offline user collection', // from docs
    state: currentState,
    nonce: crypto.randomBytes(16).toString('hex'),
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });

  const authUrl = `${OAUTH_BASE}/oauth2/auth?${params.toString()}`;
  res.redirect(authUrl);
});

// OAuth2 callback: exchange code -> tokens, then call a user API
app.get('/oauth/callback', async (req, res) => {
  const { code, state, error, error_description } = req.query;

  if (error) {
    return res.status(400).send(`OAuth error: ${error} - ${error_description || ''}`);
  }

  if (!code) {
    return res.status(400).send('Missing "code" in callback query params');
  }

  if (state !== currentState) {
    return res.status(400).send('State mismatch – possible CSRF, aborting');
  }

  try {
    // Step 3 from docs: exchange code for tokens
    const tokenParams = new URLSearchParams();
    tokenParams.append('grant_type', 'authorization_code');
    tokenParams.append('code', code);
    tokenParams.append('redirect_uri', REDIRECT_URI);
    tokenParams.append('code_verifier', currentCodeVerifier);

    const tokenResponse = await axios.post(
      `${OAUTH_BASE}/oauth2/token`,
      tokenParams.toString(),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        auth: {
          username: CLIENT_ID,
          password: CLIENT_SECRET, // confidential client
        },
      }
    );

    const tokenData = tokenResponse.data;
    const accessToken = tokenData.access_token;

    // Step 4 from docs: call a user API with x-auth-token + x-client-id
    const collectionsResponse = await axios.get(
      `${API_BASE}/auth/v1/collections`,
      {
        headers: {
          'x-auth-token': accessToken,
          'x-client-id': CLIENT_ID,
        },
      }
    );

    // Return something visible in browser
    res.send(`
      <h1>Quran.Foundation User APIs PoC</h1>
      <h2>Token Response</h2>
      <pre>${JSON.stringify(tokenData, null, 2)}</pre>
      <h2>/auth/v1/collections Response</h2>
      <pre>${JSON.stringify(collectionsResponse.data, null, 2)}</pre>
    `);
  } catch (err) {
    console.error('Error in callback:', err.response?.data || err.message);
    res.status(500).send(
      `<h1>Error</h1><pre>${JSON.stringify(err.response?.data || err.message, null, 2)}</pre>`
    );
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`QF User APIs PoC running on http://localhost:${PORT}`);
});
