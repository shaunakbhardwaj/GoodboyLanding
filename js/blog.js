(() => {
  // Local research articles are used until a Sanity project is connected.
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
    if (/^assets\/blog\/[a-z0-9-]+\.svg$/.test(assetId)) return assetId;
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

  /* ------------------------------------------------------ local articles */

  const localPosts = window.GOODBOY_POSTS || [];
  const fetchers = LIVE
    ? { list: fetchPosts, one: fetchPost }
    : {
        list: async () => ({ posts: localPosts, refresh: null }),
        one: async (slug) => ({ post: localPosts.find((post) => post.slug === slug) || null, refresh: null }),
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
    return `post.html?slug=${encodeURIComponent(slug)}`;
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
            <p class="entry__meta">${esc(post.category || formatDate(post.publishedAt))}</p>
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

  }

  function renderPost(post) {
    const skeleton = document.getElementById("post-skeleton");
    const container = document.getElementById("post-content");
    if (!container) return;

    skeleton.hidden = true;
    container.innerHTML = `
      <a class="article__back" href="blog.html">All posts</a>
      <h1 class="article__title">${esc(post.title)}</h1>
      ${post.excerpt ? `<p class="article__deck">${esc(post.excerpt)}</p>` : ""}
      <p class="article__meta">
        <span>${esc(formatDate(post.publishedAt))}</span>
        <span aria-hidden="true">·</span>
        <span>${readingTime(post)} min read</span>
      </p>
      ${
        post.cover && post.cover.asset
          ? `<figure class="cover">
              <img src="${esc(imageUrl(post.cover.asset, { w: 1600, q: 80 }))}" alt="${esc(post.cover.alt || "")}" decoding="async" />
              ${post.cover.animated ? `<div class="illustration-controls"><button class="illustration-replay" type="button">Replay illustration <span aria-hidden="true">↻</span></button><a class="illustration-open" href="${esc(imageUrl(post.cover.asset))}" target="_blank" rel="noreferrer">View full size <span aria-hidden="true">↗</span></a></div>` : ""}
              ${post.cover.caption ? `<figcaption class="cover__caption">${esc(post.cover.caption)}</figcaption>` : ""}
            </figure>`
          : ""
      }
      <div class="article__body">${renderBody(post.body)}</div>
      <div class="article__end" aria-hidden="true"><span>Goodboy Dynamics</span></div>
    `;
    container.hidden = false;
    document.title = `${post.title} — Goodboy Dynamics`;
    document.querySelector('meta[name="description"]')?.setAttribute("content", post.excerpt || post.title);
    const replay = container.querySelector(".illustration-replay");
    replay?.addEventListener("click", () => {
      const image = container.querySelector(".cover img");
      if (!image) return;
      const fresh = image.cloneNode(true);
      fresh.src = `${post.cover.asset}?replay=${Date.now()}`;
      image.replaceWith(fresh);
    });
    reveal([
      ...container.querySelectorAll(".article__title, .article__meta, .cover, .article__end"),
      ...container.querySelectorAll(".article__body > *"),
    ]);

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
        showError("entries", "Nothing here yet.", "New research notes will appear here.");
        return;
      }
      renderIndex(posts);
      if (refresh) refresh.then(renderIndex).catch(() => {});
    } catch {
      showError(
        "entries",
        "Couldn't load posts.",
        "Please refresh the page or try again shortly."
      );
    }
  }

  async function initPost() {
    const slug = slugFromLocation();
    if (!slug) {
      location.replace("blog.html");
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
        "Please refresh the page or try again shortly."
      );
    }
  }

  initSmoothScroll();
  initProgressBar();
  if (page === "index") initIndex();
  if (page === "post") initPost();
})();
