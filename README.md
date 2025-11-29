# Quran.Foundation OAuth2 PoC

Node/Express proof-of-concept that follows the Quran.Foundation OAuth2 + PKCE Guide: <https://api-docs.quran.foundation/docs/tutorials/oidc/getting-started-with-oauth2>. It signs users in, exchanges the code for tokens, and calls `/auth/v1/collections` as an example.

## Prerequisites
- Node.js 18+ installed
- Quran.Foundation client credentials (client ID and secret) and a redirect URI that matches this app (defaults to `http://localhost:3000/oauth/callback`)

## Setup
1) Install dependencies:
```bash
npm install
```

2) Create your environment file:
```bash
cp .env.example .env
```
Fill in:
- `QF_CLIENT_ID`
- `QF_CLIENT_SECRET`
- `QF_REDIRECT_URI` (must match what you configure in the provider; default is fine for local testing)
- `PORT` (optional; defaults to 3000)

Secrets live only in `.env`, which is git-ignored.

## Run
```bash
node index.js
```
Then open `http://localhost:3000` and click “Login with Quran.Foundation”. After authorizing, the callback will show the token response and the `/auth/v1/collections` API output.

## Notes
- This PoC keeps PKCE state in memory and is not production-ready (no persistence, no error hardening).
- Make sure the redirect URI you use here is also registered in the Quran.Foundation console, or the authorization step will fail.
