# VELTIER Commerce Launch Notes

## Supabase SQL

Run `supabase/commerce-ops.sql` in the Supabase SQL Editor after each commerce schema update.

## Edge Functions

Required secrets:

```powershell
supabase secrets set TOSS_SECRET_KEY="test_sk_..."
supabase secrets set RESEND_API_KEY="re_..."
supabase secrets set FROM_EMAIL="VELTIER <orders@your-domain.com>"
```

Deploy functions:

```powershell
supabase functions deploy confirm-toss-payment
supabase functions deploy send-notification-email
```

## Public Browser Keys

Public keys are safe to expose only when provider-side restrictions are enabled.

- `payments-config.js`: Toss Payments Client Key
- `maps-config.js`: Google Maps browser key

Never put Toss Secret Key, Supabase service role key, or email provider API keys in browser files.

## Custom Domain

Do not commit a `CNAME` file until the real domain is chosen. After buying a domain:

1. Add the domain in GitHub Pages settings.
2. Configure DNS at the registrar.
3. Commit a `CNAME` file containing only the real domain, such as `veltier.co`.
4. Wait for HTTPS enforcement to become available, then enable it.
