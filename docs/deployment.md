# Static deployment

Build with Node.js 24 using `npm ci && npm run build`. Publish the contents of `dist/` on a static HTTPS host. By default Vite builds relative asset paths. To test an exact hosted prefix, run `SITE_BASE=/economics/ npm run build` and `SITE_BASE=/economics/ npm run preview`. A route such as `/economics/#/compare/reversal` uses a fragment, so it works on refresh without a host rewrite. Use a trailing slash for a directory mount.

GitHub Actions runs type checking, lint, numerical fixtures and production-bundle browser tests before uploading a static GitHub Pages preview. Set the repository’s Pages source to **GitHub Actions**. Pull requests run tests without a Pages deploy. No repository secrets are required for this workflow.

For the dedicated `economics.hamdam.me` site, import this repository into its own Vercel Vite project with build output `dist`. Verify a preview, then attach that hostname and set only the DNS record Vercel specifies at the authoritative DNS provider. The homepage project remains separate. Add a link card immediately below Beekeeping in the homepage navigation once the economics hostname works. Verify the homepage, Beekeeping, Contact and a refreshed scenario link after both deployments.

[Vite static deployment](https://vite.dev/guide/static-deploy.html) · [Vite public base](https://vite.dev/config/shared-options.html#base) · [Next.js static export](https://nextjs.org/docs/app/guides/static-exports)
