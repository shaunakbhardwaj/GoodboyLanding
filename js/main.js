(() => {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(pointer: fine)").matches;
  let lenis = null;

  if (window.Lenis) {
    lenis = new Lenis({
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

  document.addEventListener("click", (event) => {
      const link = event.target.closest('a[href^="#"]');
      if (!link || event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const selector = link.getAttribute("href");
      if (!selector || selector === "#") return;
      const target = document.querySelector(selector);
      if (!target) return;
      event.preventDefault();
      if (lenis) lenis.scrollTo(target, { offset: -100, duration: 1.2, immediate: reduceMotion });
      else target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
  });

  const aboutText = document.getElementById("about-text");
  if (aboutText) {
    aboutText.innerHTML = aboutText.textContent
      .trim()
      .split(/\s+/)
      .map((word) => `<span class="word">${word}</span>`)
      .join(" ");
  }

  if (window.gsap && !reduceMotion) {

    const words = document.querySelectorAll(".about__text .word");
    if (words.length) {
      gsap.to(words, {
        color: "#1c1b19",
        stagger: 0.075,
        ease: "none",
        scrollTrigger: { trigger: ".about", start: "top 72%", end: "bottom 50%", scrub: 0.55 },
      });
    }

    document.querySelectorAll(".reveal-block").forEach((element) => {
      gsap.from(element, {
        y: 28,
        opacity: 0,
        duration: 0.9,
        ease: "power3.out",
        scrollTrigger: { trigger: element, start: "top 88%", once: true },
      });
    });

    document.querySelectorAll(".note-card__visual").forEach((visual) => {
      gsap.from(visual, {
        clipPath: "inset(0 0 100% 0)",
        duration: 1.05,
        ease: "power3.inOut",
        scrollTrigger: { trigger: visual, start: "top 90%", once: true },
      });
    });

    gsap.from(".contact__header", {
      y: 28,
      opacity: 0,
      duration: 0.9,
      ease: "power3.out",
      scrollTrigger: { trigger: ".contact", start: "top 78%", once: true },
    });
    gsap.from(".contact .form", {
      y: 32,
      opacity: 0,
      duration: 0.95,
      ease: "power3.out",
      scrollTrigger: { trigger: ".contact__inner", start: "top 74%", once: true },
    });
  }

  if (!reduceMotion && finePointer) {

    document.querySelectorAll("[data-magnetic]").forEach((element) => {
      element.addEventListener("pointermove", (event) => {
        const rect = element.getBoundingClientRect();
        element.style.transform = `translate(${(event.clientX - rect.left - rect.width / 2) / 18}px, ${(event.clientY - rect.top - rect.height / 2) / 18}px)`;
      });
      element.addEventListener("pointerleave", () => { element.style.transform = "translate(0, 0)"; });
    });
  }

  const config = window.GOODBOY_CONFIG || {};
  const projectId = config.sanityProjectId || "YOUR_PROJECT_ID";
  if (!/YOUR_PROJECT_ID/.test(projectId)) {
    const dataset = config.sanityDataset || "production";
    const query = encodeURIComponent('*[_type == "post" && defined(slug.current)] | order(publishedAt desc)[0...3]{title,"slug":slug.current,excerpt,publishedAt}');
    fetch(`https://${projectId}.api.sanity.io/v1/data/query/${dataset}?query=${query}`)
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then(({ result }) => {
        if (!Array.isArray(result) || !result.length) return;
        const cards = document.querySelectorAll("#home-notes .note-card");
        const date = new Intl.DateTimeFormat("en", { month: "long", day: "numeric", year: "numeric" });
        result.slice(0, cards.length).forEach((post, index) => {
          const card = cards[index];
          const link = card.querySelector("a");
          link.href = `/blog/${post.slug}`;
          card.querySelector(".note-card__meta").textContent = date.format(new Date(post.publishedAt));
          card.querySelector("h3").textContent = post.title;
          if (post.excerpt) card.querySelector("a > p:last-child").textContent = post.excerpt;
        });
      })
      .catch(() => {});
  }

  const FORM_ENDPOINT = "https://formsubmit.co/ajax/32d5ca925eed499ead7262fbffee8421";
  const form = document.getElementById("contact-form");
  const success = document.getElementById("form-success");
  const status = document.getElementById("form-status");

  if (form) {
    let submitting = false;
    const validators = {
      name: (value) => value.trim() ? "" : "Please enter your name.",
      email: (value) => {
        if (!value.trim()) return "Please enter your email address.";
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? "" : "Please enter a valid email address.";
      },
      message: (value) => value.trim() ? "" : "Please enter a message.",
    };

    const setError = (name, message) => {
      const field = form.querySelector(`[name="${name}"]`)?.closest(".field");
      const error = form.querySelector(`[data-error-for="${name}"]`);
      if (!field || !error) return;
      field.classList.toggle("is-invalid", Boolean(message));
      error.textContent = message;
    };

    form.addEventListener("input", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)) return;
      if (validators[target.name]) setError(target.name, validators[target.name](target.value));
    });

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (submitting || form.hidden) return;
      if (status) status.textContent = "";
      const data = new FormData(form);
      let valid = true;
      let firstInvalid = null;

      Object.keys(validators).forEach((name) => {
        const message = validators[name](String(data.get(name) || ""));
        setError(name, message);
        if (message) {
          valid = false;
          firstInvalid ||= form.querySelector(`[name="${name}"]`);
        }
      });
      if (!valid) {
        if (status) status.textContent = "Please fill in the required fields.";
        firstInvalid?.focus();
        return;
      }

      const button = form.querySelector(".btn");
      const label = button?.querySelector(".btn__label");
      submitting = true;
      if (button) button.disabled = true;
      form.setAttribute("aria-busy", "true");
      button?.classList.add("is-loading");
      if (label) label.textContent = "Sending...";
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 15000);
      const payload = {
        name: String(data.get("name") || ""),
        email: String(data.get("email") || ""),
        message: String(data.get("message") || ""),
        _replyto: String(data.get("email") || ""),
        _subject: "New contact form message — Goodboy Dynamics",
        _template: "table",
      };
      if (data.get("_honey")) payload._honey = String(data.get("_honey"));

      try {
        const response = await fetch(FORM_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });
        const body = await response.json();
        if (!response.ok || !(body.success === "true" || body.success === true)) throw new Error();
        form.hidden = true;
        if (success) {
          success.hidden = false;
          if (window.gsap && !reduceMotion) gsap.fromTo(success, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.7, ease: "power3.out" });
        }
      } catch {
        if (status) status.textContent = "Something went wrong sending your message. Please try again.";
      } finally {
        window.clearTimeout(timeout);
        submitting = false;
        button?.classList.remove("is-loading");
        if (button) button.disabled = false;
        if (label) label.textContent = "Send message";
        form.removeAttribute("aria-busy");
      }
    });
  }
})();
