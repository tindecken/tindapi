### View environement vars on CloudFlare
https://dash.cloudflare.com/5a9337c6b42dd87fb9743274de65ce86/workers/services/view/tindapi/production/settings

### Get list of secrets for production environment
```bash
bunx wrangler secret list --env production
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
