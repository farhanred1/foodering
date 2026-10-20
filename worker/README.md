# SSIP Cafeteria Auth Worker (Cloudflare Edge Proxy)

This worker provides secure, cross-origin serverless authentication between the Foodering Web App and `https://ssip-cafeteria.whew.life`.

---

## How to Deploy (Takes 1–2 minutes)

### Option A: Via Cloudflare Web Dashboard (Simplest, No CLI needed)

1. Log in to [Cloudflare Dashboard](https://dash.cloudflare.com/) (create a free account if you don't have one).
2. In the left sidebar, click **Compute (Workers) > Workers & Pages**.
3. Click **Create** > **Create Worker**.
4. Name it `ssip-cafeteria-auth` and click **Deploy**.
5. On the success screen, click **Edit Code** (top right).
6. Replace all existing code in the editor with the complete contents of [`worker/index.js`](./index.js).
7. Click **Save and Deploy**.
8. Copy your Worker URL from the top bar (e.g., `https://ssip-cafeteria-auth.YOUR_SUBDOMAIN.workers.dev`).

---

### Option B: Via Command Line (Wrangler)

Run the following command in your terminal:
```bash
cd worker
npx wrangler deploy
```
If you are not signed in, it will open your browser to authorize your free Cloudflare account, then deploy automatically.

---

## How It Works

1. **Client Request:** The Foodering App sends `POST /api/auth` with `{ username, password }`.
2. **Edge Processing:** The Cloudflare Worker contacts `https://ssip-cafeteria.whew.life/my-account/`, obtains the login CSRF nonce, and submits the staff credentials.
3. **WordPress Verification:** WordPress validates the actual employee password against its database:
   - If invalid: Returns `HTTP 401` with the exact server error message (e.g. *"The username or password you entered is incorrect"*).
   - If valid: WordPress issues authenticated cookies. The Worker uses these cookies to extract the staff member's real name, live wallet balance, and order history, returning it as a verified session payload.
4. **Zero CORS Issues:** The worker responds with `Access-Control-Allow-Origin: *`, allowing the web app to run seamlessly on GitHub Pages, mobile phones, or desktop browsers.
