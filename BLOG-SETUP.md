# Blog Setup — Goodboy Dynamics

The blog is already built into the site. This guide is the **one-time**
wiring between your site and Sanity (where you write). After this, publishing
a post is: open your editor → write → click **Publish**. It appears on the
site instantly.

While the setup is not done, the blog pages show built-in **demo content**
so you can see the design working at `blog.html`.

---

## 1. Create your Sanity project (free)

1. Go to <https://www.sanity.io> → sign up with Google or email.
2. At <https://www.sanity.io/manage> click **Create project**.
   - Name: `Goodboy Dynamics`
   - Plan: **Free**
3. Copy the **Project ID** (looks like `ab12cd34`).

## 2. Make the dataset public (required)

The site reads posts without a secret key, so the dataset must be public:

- In **Manage → Datasets**, open your `production` dataset and enable
  **publicly readable** access.

## 3. Connect the site

Paste your Project ID in **three places** (replacing `YOUR_PROJECT_ID`):

| File | Purpose |
|---|---|
| `js/config.js` | the website and homepage data fetch |
| `studio/sanity.config.js` | the writing dashboard |
| `studio/sanity.cli.js` | deploy commands |

## 4. Deploy your writing dashboard

```bash
cd studio
npm install
npm run deploy     # log in when prompted, pick a name like goodboy-dynamics
```

This publishes your editor to `https://goodboy-dynamics.sanity.studio`
(bookmark it — this is where you write). `npm run dev` runs it locally at
`http://localhost:3333` instead.

## 5. Allow the website to read your content (CORS)

In **Manage → API → CORS origins**, add:

- `http://localhost:8734` (local testing)
- your Netlify URL, e.g. `https://your-site.netlify.app`
- your custom domain, when you have one

Leave **Allow credentials** off.

## 6. Deploy to Netlify

Drag-and-drop the `landing/` folder onto <https://app.netlify.com/drop>
(the `_redirects` file inside already creates clean `/blog/post-name` URLs),
or connect the folder's git repo for auto-deploys.

Remember to add the Netlify URL to CORS (step 5).

---

## Writing posts

In your studio (`…sanity.studio`):

- **Title** — required
- **Slug** — auto-generated from the title; this becomes the URL
- **Excerpt** — the one-line summary on the blog index
- **Cover image** — shown at the top of the article
- **Body** — the article itself

Formatting: select text for **bold**, *italic*, links, headings, quotes and
lists — exactly like a normal document editor.

Images: place the cursor in the body, click the **+** / image icon, and
upload or drag an image. Every image has **Alt text** (accessibility) and
**Caption** — the caption is the small line printed under the image on the
site. Aim for images ~1600px wide.

Click **Publish** when ready. Unpublished drafts are invisible to the site.

## How it works

- Posts and images live in Sanity's cloud (free tier: ~2 editors, 10,000
  documents, generous API/image limits — far beyond a company blog's needs).
- The site fetches published posts as JSON and renders them in the site's
  design. Image transformations (resizing, WebP) happen on Sanity's CDN.
- Content can be exported anytime from **Manage → API → Datasets** — you're
  never locked in.

## Troubleshooting

- **"Couldn't load posts"** — the Project ID in `js/blog.js` is wrong, the
  dataset isn't public (step 2), or the current domain is missing from CORS
  (step 5).
- **Posts don't appear** — make sure you clicked **Publish** in the studio;
  drafts never reach the website.
- **Local links** — `/blog/...` clean URLs only work on Netlify; locally,
  open `blog.html` and `post.html?slug=…` directly.
