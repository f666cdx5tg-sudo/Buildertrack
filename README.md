# BuildTrack NYC — v2.4.0

Property maintenance and repair tracker. Single-file app (`index.html`) works offline.

## What it does
- Building map: tap any unit for the full tenant view (contact + call/text/email, open work tickets, trade status, notes, notices).
- Tenants open a request link, enter unit + complaint (+ photo) and a work ticket appears on the manager dashboard.
- Tickets page: status flow New → Assigned → In Progress → Done, assign vendor, notes, manual entry.

## Deploy
1. **App**: GitHub Pages → Settings → Pages → Deploy from branch `main` / root. Open the Pages URL on your phone/computer.
2. **Ticket server** (needed for tenant requests to reach you): follow `server/README.md` (Cloudflare Worker + D1, about 5 minutes).
3. In the app: Tickets → Server → paste the Worker URL + your manager key. It shows the tenant link + QR code.

## Develop
```
npm install
npm run build     # bundles src/app.jsx into index.html
```
The version is `APP_VERSION` at the top of `src/app.jsx` — bump it on every change.
