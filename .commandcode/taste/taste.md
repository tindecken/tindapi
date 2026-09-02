# Taste (Continuously Learned by [CommandCode][cmd])

[cmd]: https://commandcode.ai/

# api
See [api/taste.md](api/taste.md)
# cloudflare-workers
- For timezone-sensitive date calculations (e.g., day remaining, midnight boundaries), use explicit UTC offset arithmetic (Date.UTC + manual offset) instead of relying on local timezone methods like new Date(), which always run in UTC on Cloudflare Workers. Confidence: 0.65

# coding-style
- Prefers tabs over spaces for indentation in TypeScript source files. Confidence: 0.85
