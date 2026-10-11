# BuildTrack ticket server (one-time setup, ~5 minutes)

Needs a free Cloudflare account and Node installed.

```
cd server
npm install -g wrangler        # or: npx wrangler ...
wrangler login
wrangler d1 create buildtrack                      # copy the database_id it prints into wrangler.toml
wrangler d1 execute buildtrack --remote --file=schema.sql
wrangler secret put MANAGER_KEY                    # type a long random password; this is YOUR key
wrangler deploy                                    # prints https://buildtrack-tickets.<you>.workers.dev
```

Then open BuildTrack → Tickets → Server settings, paste the Worker URL and your key.
The page then shows the tenant link + QR code to post in the lobby.

- Tenants can only create tickets and look up their own ticket (needs ticket # + unit). They never see anyone else's data.
- Only your key can list or change tickets.
- Each device is limited to 8 new tickets per hour.
