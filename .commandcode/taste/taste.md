# Taste (Continuously Learned by [CommandCode][cmd])

[cmd]: https://commandcode.ai/


# api
- For data export endpoints, return the data as a downloadable file (with Content-Disposition: attachment header) instead of returning JSON in the response body. Confidence: 0.70

# api
- For data export endpoints, return the data as a downloadable file (with Content-Disposition: attachment header) instead of returning JSON in the response body. Confidence: 0.70
- For delete endpoints, simply remove the record without performing any balance adjustments or side-effect calculations. Confidence: 0.70

# cloudflare-workers
- For timezone-sensitive date calculations (e.g., day remaining, midnight boundaries), use explicit UTC offset arithmetic (Date.UTC + manual offset) instead of relying on local timezone methods like new Date(), which always run in UTC on Cloudflare Workers. Confidence: 0.65
