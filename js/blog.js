(() => {
  // Shared with the homepage. While the placeholder remains, demo content is used.
  const sharedConfig = window.GOODBOY_CONFIG || {};
  const CONFIG = {
    projectId: sharedConfig.sanityProjectId || "YOUR_PROJECT_ID",
    dataset: sharedConfig.sanityDataset || "production",
  };

  const LIVE = !/YOUR_PROJECT_ID/.test(CONFIG.projectId);
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const page = document.body.dataset.page;

  /* ---------------------------------------------------------- data layer */

  function groqUrl(query, params) {
    const url = new URL(
      `https://${CONFIG.projectId}.api.sanity.io/v1/data/query/${CONFIG.dataset}`
    );
    url.searchParams.set("query", query);
    for (const [key, value] of Object.entries(params || {})) {
      url.searchParams.set(`$${key}`, JSON.stringify(value));
    }
    return url;
  }

  async function groq(query, params) {
    const response = await fetch(groqUrl(query, params), {
      headers: { Accept: "application/json" },
    });
    if (!response.ok) throw new Error(`Sanity API responded ${response.status}`);
    const json = await response.json();
    return json.result;
  }

  const LIST_QUERY = `*[_type == "post" && defined(slug.current)] | order(publishedAt desc) {
    title,
    "slug": slug.current,
    excerpt,
    publishedAt,
    "cover": mainImage->{ "asset": asset->_id, alt, caption }
  }`;

  const POST_QUERY = `*[_type == "post" && slug.current == $slug][0] {
    title,
    "slug": slug.current,
    excerpt,
    publishedAt,
    "cover": mainImage->{ "asset": asset->_id, alt, caption },
    body[]{ ..., "asset": asset->_id }
  }`;

  const cache = {
    get(key) {
      try {
        return JSON.parse(sessionStorage.getItem(key));
      } catch {
        return null;
      }
    },
    set(key, value) {
      try {
        sessionStorage.setItem(key, JSON.stringify(value));
      } catch {
        /* private mode — caching is best-effort */
      }
    },
  };

  async function fetchPosts() {
    const key = "gb:posts";
    const cached = cache.get(key);
    const load = (async () => {
      const result = await groq(LIST_QUERY);
      const posts = result.filter((post) => post.slug);
      cache.set(key, posts);
      return posts;
    })();
    return cached ? { posts: cached, refresh: load } : { posts: await load, refresh: null };
  }

  async function fetchPost(slug) {
    const key = `gb:post:${slug}`;
    const cached = cache.get(key);
    const load = (async () => {
      const post = await groq(POST_QUERY, { slug });
      if (post) cache.set(key, post);
      return post;
    })();
    return cached ? { post: cached, refresh: load } : { post: await load, refresh: null };
  }

  /* ------------------------------------------------------------- images */

  function imageUrl(assetId, options) {
    if (!assetId || /^(data:|https?:)/.test(assetId)) return assetId || "";
    const file = assetId.replace(/^image-/, "");
    const params = new URLSearchParams({ auto: "format", ...options });
    return `https://cdn.sanity.io/images/${CONFIG.projectId}/${CONFIG.dataset}/${file}?${params}`;
  }

  /* ------------------------------------------------------ text helpers */

  const esc = (value) =>
    String(value ?? "").replace(/[&<>"']/g, (char) => (
      { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]
    ));

  const safeHref = (href) => (/^(https?:|mailto:)/i.test(href || "") ? href : "#");

  const dateFormatter = new Intl.DateTimeFormat("en", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const formatDate = (iso) => (iso ? dateFormatter.format(new Date(iso)) : "");

  function readingTime(post) {
    const words = (post.body || []).reduce((count, block) => {
      if (block._type === "block") {
        return count + (block.children || []).reduce((n, child) => n + (child.text || "").split(/\s+/).filter(Boolean).length, 0);
      }
      return count;
    }, 0);
    return Math.max(1, Math.round(words / 210));
  }

  /* --------------------------------------------- portable text renderer */

  function inlineHtml(children, markDefs) {
    return (children || [])
      .map((child) => {
        let html = esc(child.text);
        for (const mark of child.marks || []) {
          if (mark === "strong") html = `<strong>${html}</strong>`;
          else if (mark === "em") html = `<em>${html}</em>`;
          else {
            const def = (markDefs || []).find((d) => d._key === mark);
            if (def && def._type === "link") {
              const href = safeHref(def.href);
              const external = /^https?:/i.test(href);
              html = `<a href="${esc(href)}"${external ? ' target="_blank" rel="noreferrer"' : ""}>${html}</a>`;
            }
          }
        }
        return html;
      })
      .join("");
  }

  function figureHtml(image) {
    if (!image || !image.asset) return "";
    const src = imageUrl(image.asset, { w: 1400, q: 78 });
    const caption = image.caption ? `<figcaption>${esc(image.caption)}</figcaption>` : "";
    return (
      `<figure class="article__figure">` +
      `<img src="${esc(src)}" alt="${esc(image.alt || "")}" loading="lazy" decoding="async" />` +
      `${caption}</figure>`
    );
  }

  function renderBody(blocks) {
    let html = "";
    let list = null;

    const closeList = () => {
      if (!list) return;
      html += `<${list.type}><li>${list.items.join("</li><li>")}</li></${list.type}>`;
      list = null;
    };

    for (const block of blocks || []) {
      if (block._type === "image") {
        closeList();
        html += figureHtml(block);
        continue;
      }
      if (block._type !== "block") continue;

      const content = inlineHtml(block.children, block.markDefs);

      if (block.listItem) {
        const type = block.listItem === "number" ? "ol" : "ul";
        if (!list || list.type !== type) {
          closeList();
          list = { type, items: [] };
        }
        list.items.push(content);
        continue;
      }
      closeList();

      if (block.style === "h2") html += `<h2>${content}</h2>`;
      else if (block.style === "h3") html += `<h3>${content}</h3>`;
      else if (block.style === "h4") html += `<h4>${content}</h4>`;
      else if (block.style === "blockquote") html += `<blockquote><p>${content}</p></blockquote>`;
      else html += `<p>${content}</p>`;
    }
    closeList();
    return html;
  }

  /* ------------------------------------------------------------- demo */

  const demoImage = (from, to, label) =>
    "data:image/svg+xml," +
    encodeURIComponent(
      `<svg xmlns='http://www.w3.org/2000/svg' width='1200' height='800'>` +
      `<defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>` +
      `<stop offset='0' stop-color='${from}'/><stop offset='1' stop-color='${to}'/>` +
      `</linearGradient></defs>` +
      `<rect width='1200' height='800' fill='url(#g)'/>` +
      `<circle cx='960' cy='190' r='110' fill='none' stroke='#f6f3ee' stroke-opacity='0.35' stroke-width='2'/>` +
      `<text x='50%' y='52%' fill='#f6f3ee' fill-opacity='0.85' font-family='sans-serif' font-size='40' letter-spacing='14' text-anchor='middle'>${label}</text>` +
      `</svg>`
    );

  const block = (key, text, style = "normal") => ({
    _type: "block", style, children: [{ _key: key, text, marks: [] }], markDefs: [],
  });

  const DEMO_POSTS = [
    {
      title: "Why the factory floor comes before the software",
      slug: "factory-floor-first",
      excerpt: "Useful operational software begins with watching the real work move.",
      publishedAt: "2026-09-01T09:00:00Z",
      cover: { asset: demoImage("#2a2824", "#6b6455", "FIELD NOTE 001"), alt: "Abstract field diagram", caption: "A system begins at the point where the work becomes visible." },
      body: [
        block("f1", "It is tempting to begin an operational project with the software: the dashboard, the database, the list of integrations. We think that is one step too late. The first interface is the operation itself."),
        block("f2", "A production schedule may look clean on screen while the real schedule lives across a whiteboard, a supervisor's memory and three phone calls to vendors. Those informal systems are not noise. They are evidence of what the formal system failed to understand."),
        block("f3", "Go where the constraint lives", "h2"),
        block("f4", "Before proposing automation, we want to follow a part, a purchase order or a decision from beginning to end. We want to see where context is lost, where people wait and where experience quietly prevents an expensive mistake."),
        { _type: "image", asset: demoImage("#8d8982", "#3f3d39", "MATERIAL / SIGNAL / DECISION"), alt: "Abstract operational flow", caption: "Three flows usually overlap: material, information and authority." },
        block("f5", "Good software should preserve the intelligence already present in the operation, then make it easier for the next person to act. That is why our work starts on site."),
      ],
    },
    {
      title: "A supply chain needs a shared operational memory",
      slug: "shared-operational-memory",
      excerpt: "Every handoff loses context. Connected intelligence can preserve it.",
      publishedAt: "2026-08-22T09:00:00Z",
      cover: { asset: demoImage("#d6c4a8", "#77644e", "SYSTEM NOTE 002"), alt: "Abstract connected-system diagram", caption: "The value is not more data. It is usable context at the next handoff." },
      body: [
        block("s1", "Supply chains are full of competent people working from different versions of the truth. Procurement sees the order. Production sees the shortage. Quality sees the deviation. The customer sees only the delay."),
        block("s2", "The problem is rarely that no data exists. It is that the reason behind a decision disappears as the work moves from one team, vendor or tool to another."),
        block("s3", "Memory, not another dashboard", "h2"),
        block("s4", "A useful connected system should remember what changed, why it changed, who needs to know and what the next decision depends on. It should reduce the need to reconstruct history in meetings and message threads."),
        block("s5", "That shared operational memory is one of the most promising places for connected intelligence: not replacing responsibility, but giving responsible people the context to act earlier."),
      ],
    },
    {
      title: "Travel before automation",
      slug: "travel-before-automation",
      excerpt: "Why we intend to meet operators where their constraints actually live.",
      publishedAt: "2026-08-10T09:00:00Z",
      cover: { asset: demoImage("#3f3d39", "#1c1b19", "WORKING NOTE 003"), alt: "Abstract route diagram", caption: "The distance to the site is part of the research, not an inconvenience." },
      body: [
        block("t1", "A video call is excellent for discussing a known problem. It is much less useful for discovering the problem nobody has named yet."),
        block("t2", "In complex operations, the important detail may be the walk between two stations, the printout beside a machine, the change in tone during a shift handover or the spreadsheet one person maintains because the official tool cannot answer a daily question."),
        block("t3", "Fieldwork is product work", "h2"),
        block("t4", "We expect to travel when the work requires it. Being present helps us understand physical constraints, local incentives and the tacit knowledge that disappears in a requirements document."),
        block("t5", "The objective is not observation for its own sake. It is to return with a smaller, sharper problem—and to build something the people doing the work can recognize as useful."),
      ],
    },
  ];

  const loadDemoPosts = async () => DEMO_POSTS;
  const loadDemoPost = async (slug) => DEMO_POSTS.find((post) => post.slug === slug) || null;

  const fetchers = LIVE
    ? { list: fetchPosts, one: fetchPost }
    : {
        list: async () => ({ posts: await loadDemoPosts(), refresh: null }),
        one: async (slug) => ({ post: await loadDemoPost(slug), refresh: null }),
      };

  /* --------------------------------------------------------- motion */

  function initSmoothScroll() {
    if (!window.Lenis) return;
    const lenis = new Lenis({
      duration: 1.15,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: !reduceMotion,
    });
    if (window.gsap && window.ScrollTrigger) {
      gsap.registerPlugin(ScrollTrigger);
      lenis.on("scroll", ScrollTrigger.update);
      gsap.ticker.add((time) => lenis.raf(time * 1000));
      gsap.ticker.lagSmoothing(0);
    } else {
      const raf = (time) => {
        lenis.raf(time);
        requestAnimationFrame(raf);
      };
      requestAnimationFrame(raf);
    }
  }

  function reveal(elements) {
    if (!window.gsap || reduceMotion || !elements.length) return;
    if (window.ScrollTrigger) gsap.registerPlugin(ScrollTrigger);
    elements.forEach((el) => {
      gsap.from(el, {
        y: 26,
        opacity: 0,
        duration: 0.85,
        ease: "power3.out",
        scrollTrigger: window.ScrollTrigger
          ? { trigger: el, start: "top 88%", once: true }
          : undefined,
      });
    });
  }

  function initProgressBar() {
    const bar = document.getElementById("progress");
    if (!bar) return;
    let ticking = false;
    const update = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const ratio = max > 0 ? Math.min(1, window.scrollY / max) : 0;
      bar.style.transform = `scaleX(${ratio})`;
      ticking = false;
    };
    window.addEventListener(
      "scroll",
      () => {
        if (!ticking) {
          ticking = true;
          requestAnimationFrame(update);
        }
      },
      { passive: true }
    );
    update();
  }

  /* -------------------------------------------------------- views */

  function postHref(slug) {
    return LIVE ? `/blog/${slug}` : `post.html?slug=${slug}`;
  }

  function renderIndex(posts) {
    const skeleton = document.getElementById("entries-skeleton");
    const list = document.getElementById("entries-list");
    if (!list) return;

    skeleton.hidden = true;
    list.innerHTML = posts
      .map(
        (post) => `
        <li class="entry">
          <a class="entry__media" href="${esc(postHref(post.slug))}" aria-hidden="true" tabindex="-1">
            ${post.cover && post.cover.asset
              ? `<img src="${esc(imageUrl(post.cover.asset, { w: 900, h: 600, fit: "min", q: 75 }))}" alt="" loading="lazy" decoding="async" />`
              : ""}
          </a>
          <div class="entry__body">
            <p class="entry__meta">${esc(formatDate(post.publishedAt))}</p>
            <h2 class="entry__title">
              <a href="${esc(postHref(post.slug))}">${esc(post.title)}</a>
            </h2>
            ${post.excerpt ? `<p class="entry__excerpt">${esc(post.excerpt)}</p>` : ""}
            <a class="entry__more" href="${esc(postHref(post.slug))}">Read article</a>
          </div>
        </li>`
      )
      .join("");
    list.hidden = false;
    reveal([...list.querySelectorAll(".entry")]);

    if (!LIVE) {
      const note = document.createElement("p");
      note.className = "demo-note";
      note.textContent = "Demo content — connect your Sanity project (BLOG-SETUP.md) to publish real posts.";
      list.after(note);
    }
  }

  function renderPost(post) {
    const skeleton = document.getElementById("post-skeleton");
    const container = document.getElementById("post-content");
    if (!container) return;

    skeleton.hidden = true;
    container.innerHTML = `
      <a class="article__back" href="${LIVE ? "/blog" : "blog.html"}">All posts</a>
      <h1 class="article__title">${esc(post.title)}</h1>
      <p class="article__meta">
        <span>${esc(formatDate(post.publishedAt))}</span>
        <span aria-hidden="true">·</span>
        <span>${readingTime(post)} min read</span>
      </p>
      ${
        post.cover && post.cover.asset
          ? `<figure class="cover">
              <img src="${esc(imageUrl(post.cover.asset, { w: 1600, q: 80 }))}" alt="${esc(post.cover.alt || "")}" decoding="async" />
              ${post.cover.caption ? `<figcaption class="cover__caption">${esc(post.cover.caption)}</figcaption>` : ""}
            </figure>`
          : ""
      }
      <div class="article__body">${renderBody(post.body)}</div>
      <div class="article__end" aria-hidden="true"><span>Goodboy Dynamics</span></div>
    `;
    container.hidden = false;
    document.title = `${post.title} — Goodboy Dynamics`;
    reveal([
      ...container.querySelectorAll(".article__title, .article__meta, .cover, .article__end"),
      ...container.querySelectorAll(".article__body > *"),
    ]);

    if (!LIVE) {
      const note = document.createElement("p");
      note.className = "demo-note";
      note.textContent = "Demo content — connect your Sanity project (BLOG-SETUP.md) to publish real posts.";
      container.after(note);
    }
  }

  function showError(id, title, hint) {
    const skeleton = document.getElementById(`${id}-skeleton`);
    const status = document.getElementById(`${id}-status`);
    if (skeleton) skeleton.hidden = true;
    if (!status) return;
    status.innerHTML = `
      <p class="status__title">${esc(title)}</p>
      ${hint ? `<p class="status__hint">${esc(hint)}</p>` : ""}
    `;
  }

  /* ---------------------------------------------------------- init */

  function slugFromLocation() {
    const match = location.pathname.match(/\/blog\/([^/]+)\/?$/);
    if (match) return decodeURIComponent(match[1]);
    return new URLSearchParams(location.search).get("slug");
  }

  async function initIndex() {
    try {
      const { posts, refresh } = await fetchers.list();
      if (!posts.length) {
        showError("entries", "Nothing here yet.", "Publish your first post in Sanity and it will appear here instantly.");
        return;
      }
      renderIndex(posts);
      if (refresh) refresh.then(renderIndex).catch(() => {});
    } catch {
      showError(
        "entries",
        "Couldn't load posts.",
        "Check that your Sanity project ID, dataset and CORS settings match BLOG-SETUP.md."
      );
    }
  }

  async function initPost() {
    const slug = slugFromLocation();
    if (!slug) {
      location.replace(LIVE ? "/blog" : "blog.html");
      return;
    }
    try {
      const { post, refresh } = await fetchers.one(slug);
      if (!post) {
        showError("post", "This post doesn't exist.", "It may have been unpublished — head back to the blog index.");
        return;
      }
      renderPost(post);
      if (refresh) {
        refresh
          .then((fresh) => fresh && renderPost(fresh))
          .catch(() => {});
      }
    } catch {
      showError(
        "post",
        "Couldn't load this post.",
        "Check that your Sanity project ID, dataset and CORS settings match BLOG-SETUP.md."
      );
    }
  }

  initSmoothScroll();
  initProgressBar();
  if (page === "index") initIndex();
  if (page === "post") initPost();
})();
