# Goodboy Dynamics — Sanity Studio

This is the writing dashboard for the blog. You write here; the website picks it up automatically.

For the full one-time setup (creating the Sanity project, connecting it, deploying
this studio), see **`BLOG-SETUP.md`** in the `landing/` folder.

After the one-time setup:

```bash
npm run dev     # run the editor locally at http://localhost:3333
npm run deploy  # publish the editor to <your-name>.sanity.studio (bookmark it)
```

Remember: `projectId` must match in **three places** — `sanity.config.js`,
`sanity.cli.js` (here), and `../js/config.js` (the website).
