Sector Save Server (dev)

This is a minimal Node/Express server that accepts POST requests to persist sector/territory data and keeps timestamped backups.

Quick start

1. Install dependencies

```bash
cd "Map u Street/Website/server"
npm install
```

2. Start the server (set a token for security)

```bash
set ADMIN_TOKEN=your-secret-token     # Windows Powershell/CMD
# or
export ADMIN_TOKEN=your-secret-token  # Linux / macOS
npm start
```

3. Endpoint

- POST /admin/api/sectors/save
  - Headers: `x-admin-token: <token>` or `Authorization: Bearer <token>`
  - Body: JSON { ts: <timestamp>, territories: [...] }
  - Response: { ok: true, file: "sectors-YYYY-MM-DDTHH-mm-ss-sssZ.json" }

- GET /admin/api/sectors/backups
  - Returns list of saved backup filenames

Notes

- This server is intentionally minimal and meant for local/dev usage. In production, secure the endpoint properly (HTTPS, strong auth, rate limits, validation).
- Saved files are stored in `server/storage/`.
