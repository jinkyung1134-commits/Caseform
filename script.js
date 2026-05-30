const formatWon = (value) => `${Number(value).toLocaleString("ko-KR")}원`;

let settings = window.CaseformConfig.load();
let products = settings.products;

const productGrid = document.querySelector("#product-grid");
const hero = document.querySelector(".hero");
const heroTitle = document.querySelector("#hero-title");
const heroSubtitle = document.querySelector("#hero-subtitle");
const heroCopyLink = document.querySelector("#hero-copy-link");
const heroMediaLink = document.querySelector("#hero-media-link");
const heroPreload = document.querySelector("#hero-preload");
const { escapeHtml, mediaSource, productHasMedia, productMediaKind, productMediaMarkup } = window.CaseformConfig;
let heroSlideTimer;
let heroSwapTimer;
let activeHeroSlide = 0;

function setText(key, value) {
  document.querySelectorAll(`[data-setting="${key}"]`).forEach((node) => {
    node.textContent = value;
  });
}

function productUrl(index) {
  return window.CaseformConfig.urlFor("product.html", settings, { id: String(index) });
}

function heroSlideItems() {
  const selected = products
    .map((product, index) => ({ product, index }))
    .filter(({ product }) => product.showInHero);

  return selected.length ? selected : products.map((product, index) => ({ product, index }));
}

function clampNumber(value, fallback, min, max) {
  const number = Number(value);
  const resolved = Number.isFinite(number) ? number : fallback;
  return Math.min(Math.max(resolved, min), max);
}

function heroMediaBackdropMarkup(product) {
  const kind = productMediaKind(product);

  if (kind === "image") {
    const source = mediaSource(product.image);
    return `<img class="hero-media-backdrop" src="${escapeHtml(source)}" alt="" aria-hidden="true" loading="eager" />`;
  }

  if (kind === "video") {
    const source = mediaSource(product.video);
    return `<video class="hero-media-backdrop hero-media-backdrop-video" src="${escapeHtml(source)}" autoplay muted loop playsinline aria-hidden="true"></video>`;
  }

  return "";
}

function heroMediaContentMarkup(product) {
  return `
    ${heroMediaBackdropMarkup(product)}
    ${productMediaMarkup(product, {
      mediaClass: "product-media hero-product-media",
      caseClass: "hero-product-case",
    })}
  `;
}

function heroTransitionMs() {
  return clampNumber(settings.heroTransitionDuration, 650, 150, 1800);
}

function applySettings() {
  const root = document.documentElement;
  const mediaDarkness = clampNumber(settings.heroMediaDarkness, 58, 0, 90);
  const mediaFade = clampNumber(settings.heroMediaFade, 72, 0, 100);
  const transitionDuration = heroTransitionMs();

  root.style.setProperty("--accent", settings.colors.accent);
  root.style.setProperty("--accent-dark", settings.colors.accentSoft);
  root.style.setProperty("--gold", settings.colors.accent);
  root.style.setProperty("--gold-soft", settings.colors.accentSoft);
  root.style.setProperty("--gold-dark", settings.colors.accentWarm);
  root.style.setProperty("--hero-media-dim", (mediaDarkness / 100).toFixed(2));
  root.style.setProperty("--hero-media-edge", `${(8 + mediaFade * 0.22).toFixed(1)}%`);
  root.style.setProperty("--hero-media-backdrop-opacity", (0.24 + mediaFade * 0.004).toFixed(2));
  root.style.setProperty("--hero-transition-duration", `${transitionDuration}ms`);

  document.title = settings.pageTitle;
  document.body.classList.toggle("gold-finish", Boolean(settings.goldFinish));

  [
    "brandName",
    "collectionEyebrow",
    "collectionTitle",
    "supportEyebrow",
    "supportTitle",
  ].forEach((key) => setText(key, settings[key]));

  heroPreload.href = settings.heroImage;

  document.querySelectorAll("[data-home-link]").forEach((link) => {
    link.href = window.CaseformConfig.urlFor("index.html", settings);
  });

  renderHeroSlide(activeHeroSlide, true);
  startHeroSlider();
}

function renderHeroDots(slides) {
  const dots = document.querySelector("#hero-slide-dots");
  dots.innerHTML = slides
    .map(
      (_, index) => `
        <button class="${index === activeHeroSlide ? "is-active" : ""}" type="button" aria-label="메인 슬라이드 ${index + 1} 보기" data-hero-dot="${index}"></button>
      `,
    )
    .join("");
}

function renderHeroSlide(nextIndex = 0, immediate = false) {
  const slides = heroSlideItems();
  if (!slides.length) return;

  activeHeroSlide = ((nextIndex % slides.length) + slides.length) % slides.length;
  const { product, index } = slides[activeHeroSlide];
  const detailUrl = productUrl(index);
  const swapDelay = immediate ? 0 : Math.round(heroTransitionMs() * 0.45);

  if (heroSwapTimer) {
    window.clearTimeout(heroSwapTimer);
  }

  renderHeroDots(slides);

  if (!immediate) hero.classList.add("is-switching");

  heroSwapTimer = window.setTimeout(
    () => {
      heroTitle.textContent = product.name;
      heroSubtitle.textContent = product.description;
      heroCopyLink.href = detailUrl;
      heroCopyLink.setAttribute("aria-label", `${product.name} 상세페이지로 이동`);
      heroMediaLink.href = detailUrl;
      heroMediaLink.dataset.mediaMode = settings.heroMediaMode || "blend";
      heroMediaLink.classList.toggle("has-product-media", productHasMedia(product));
      heroMediaLink.innerHTML = heroMediaContentMarkup(product);

      const productImage = mediaSource(product.image);
      heroPreload.href = productImage && !productImage.startsWith("data:") ? productImage : settings.heroImage;
      window.requestAnimationFrame(() => {
        hero.classList.remove("is-switching");
      });
    },
    swapDelay,
  );
}

function startHeroSlider() {
  stopHeroSlider();
  const slides = heroSlideItems();
  if (slides.length <= 1) return;

  heroSlideTimer = window.setInterval(() => {
    if (!document.hidden) renderHeroSlide(activeHeroSlide + 1);
  }, settings.heroSlideInterval * 1000);
}

function stopHeroSlider() {
  if (heroSlideTimer) {
    window.clearInterval(heroSlideTimer);
    heroSlideTimer = null;
  }
}

function renderProducts() {
  productGrid.innerHTML = products
    .map(
      (product, index) => `
        <a class="product-card" href="${productUrl(index)}" aria-label="${escapeHtml(product.name)} 상세페이지로 이동">
          <span class="product-visual${productHasMedia(product) ? " has-product-media" : ""}">
            ${productMediaMarkup(product, { mediaClass: "product-media product-card-media" })}
          </span>
          <div>
            <h3>${escapeHtml(product.name)}</h3>
            <p>${escapeHtml(product.description)}</p>
          </div>
          <div class="product-meta">
            <strong>${formatWon(product.price)}</strong>
            <span class="detail-arrow" aria-hidden="true">→</span>
          </div>
        </a>
      `,
    )
    .join("");
}

function refreshFromStorage() {
  const nextSettings = window.CaseformConfig.load();
  if (JSON.stringify(nextSettings) === JSON.stringify(settings)) return;

  settings = nextSettings;
  products = settings.products;
  activeHeroSlide = 0;
  applySettings();
  renderProducts();
}

applySettings();
renderProducts();

document.querySelector("#hero-slide-dots").addEventListener("click", (event) => {
  const dot = event.target.closest("[data-hero-dot]");
  if (!dot) return;
  renderHeroSlide(Number(dot.dataset.heroDot));
  startHeroSlider();
});
hero.addEventListener("mouseenter", stopHeroSlider);
hero.addEventListener("mouseleave", startHeroSlider);
hero.addEventListener("focusin", stopHeroSlider);
hero.addEventListener("focusout", startHeroSlider);

window.addEventListener("storage", (event) => {
  if (event.key === window.CASEFORM_STORAGE_KEY) refreshFromStorage();
});

window.addEventListener("focus", refreshFromStorage);
