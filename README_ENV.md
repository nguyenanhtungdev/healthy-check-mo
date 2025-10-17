Local env and Expo config

This project reads API_BASE from Expo's `extra` config. `app.config.js` will try the following (in order):

1. `process.env.API_BASE` (useful for CI or running `API_BASE=... expo start`)
2. `.env` file at project root with a line `API_BASE=...`
3. fallback ngrok URL `https://unilaterally-waterlocked-chelsea.ngrok-free.dev`

Quick start

- Copy `.env.example` to `.env` and update the API_BASE value to your ngrok or LAN URL.

  Windows PowerShell:

```powershell
copy .env.example .env
# then edit .env with your editor
```

- Start Expo (app.config.js will inject extra.API_BASE):

```powershell
expo start
```

- If you want to override on the command line (temporary):

```powershell
$env:API_BASE = 'https://your-ngrok.ngrok-free.dev'; expo start
```

Notes

- If you run on a physical device, prefer using your machine LAN IP (http://192.168.x.y:8080) and ensure your backend binds to 0.0.0.0 and firewall allows incoming connections on that port.
- `app.config.js` sets `expo.extra.API_BASE` so the app can read it via `expo-constants` at runtime.
