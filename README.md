### View environement vars on CloudFlare
https://dash.cloudflare.com/5a9337c6b42dd87fb9743274de65ce86/workers/services/view/tindapi/production/settings

### Get list of secrets for production environment
```bash
bunx wrangler secret list --env production
```
### View secrets on web fro production environemtn
https://dash.cloudflare.com/5a9337c6b42dd87fb9743274de65ce86/workers/services/view/tindapi-production/production/settings
### Push secret to production environment
```bash
bunx wrangler secret push <NAME> --env production
```
Example:
```bash
bunx wrangler secret put TURSO_DATABASE_URL --env production
bunx wrangler secret put TURSO_AUTH_TOKEN --env production
```

### Push schema to database
```bash
bun --env-file=.dev.vars run drizzle-kit push
```
### Other command with drizzle-kit
```bash
bun --env-file=.dev.vars run drizzle-kit generate
bun --env-file=.dev.vars run drizzle-kit migrate
bun --env-file=.dev.vars run drizzle-kit push
bun --env-file=.dev.vars run drizzle-kit pull
bun --env-file=.dev.vars run drizzle-kit check
bun --env-file=.dev.vars run drizzle-kit up
bun --env-file=.dev.vars run drizzle-kit studio
```
### With specific configure file
```bash
bun --env-file=.dev.vars drizzle-kit generate --config=drizzle_turso_tind_tracking.config.ts
bun --env-file=.dev.vars drizzle-kit push --config=drizzle_turso_tind_tracking.config.ts
```

### seed the tind_tracking database
```bash
bun run .\drizzle_tind_tracking\db\seed.ts
```
### Deploy to production
```bash
bun run deploy --env="production"
```
