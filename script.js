const formatWon = (value) => `${Number(value).toLocaleString("ko-KR")}원`;

let settings = window.CaseformConfig.load();
let products = settings.products;

const productGrid = document.querySelector("#product-grid");
const catalogPagination = document.querySelector("#catalog-pagination");
const hero = document.querySelector(".hero");
const heroTitle = document.querySelector("#hero-title");
const heroSubtitle = document.querySelector("#hero-subtitle");
const heroCopyLink = document.querySelector("#hero-copy-link");
const heroMediaLink = document.querySelector("#hero-media-link");
const heroPreload = document.querySelector("#hero-preload");
const { escapeHtml, mediaSource, productHasMedia, productMediaKind, productMediaMarkup } = window.CaseformConfig;
const catalogMobileQuery = window.matchMedia("(max-width: 720px)");
let heroSlideTimer;
let heroSwapTimer;
let activeHeroSlide = 0;
let activeCatalogPage = 0;
let heroSwipePointerId = null;
let heroSwipeStartX = 0;
let heroSwipeStartY = 0;
let heroSwipeBlockClick = false;

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

function startHeroSwipe(event) {
  if (!catalogMobileQuery.matches || event.pointerType === "mouse" || event.isPrimary === false) return;

  heroSwipePointerId = event.pointerId;
  heroSwipeStartX = event.clientX;
  heroSwipeStartY = event.clientY;
  stopHeroSlider();

  if (hero.setPointerCapture) {
    hero.setPointerCapture(event.pointerId);
  }
}

function finishHeroSwipe(event) {
  if (heroSwipePointerId !== event.pointerId) return;

  const deltaX = event.clientX - heroSwipeStartX;
  const deltaY = event.clientY - heroSwipeStartY;
  const isHorizontalSwipe = Math.abs(deltaX) > 48 && Math.abs(deltaX) > Math.abs(deltaY) * 1.25;

  heroSwipePointerId = null;

  if (isHorizontalSwipe) {
    heroSwipeBlockClick = true;
    renderHeroSlide(activeHeroSlide + (deltaX < 0 ? 1 : -1));
    window.setTimeout(() => {
      heroSwipeBlockClick = false;
    }, 360);
  }

  startHeroSlider();
}

function cancelHeroSwipe(event) {
  if (heroSwipePointerId !== event.pointerId) return;
  heroSwipePointerId = null;
  startHeroSlider();
}

function preventHeroSwipeClick(event) {
  if (!heroSwipeBlockClick) return;
  event.preventDefault();
  event.stopPropagation();
}

function renderProducts() {
  const pageSize = catalogMobileQuery.matches ? 10 : 20;
  const pageCount = Math.max(1, Math.ceil(products.length / pageSize));
  activeCatalogPage = Math.max(0, Math.min(activeCatalogPage, pageCount - 1));
  const start = activeCatalogPage * pageSize;
  const visibleProducts = products.slice(start, start + pageSize);

  productGrid.innerHTML = visibleProducts
    .map(
      (product, visibleIndex) => {
        const index = start + visibleIndex;
        return `
        <a class="product-card catalog-card" href="${productUrl(index)}" aria-label="${escapeHtml(product.name)} 상세페이지로 이동">
          <span class="product-visual catalog-visual${productHasMedia(product) ? " has-product-media" : ""}">
            ${productMediaMarkup(product, { mediaClass: "product-media product-card-media" })}
          </span>
          <div class="catalog-copy">
            <h3>${escapeHtml(product.name)}</h3>
          </div>
          <div class="product-meta">
            <strong>${formatWon(product.price)}</strong>
          </div>
        </a>
      `;
      },
    )
    .join("");

  renderCatalogPagination(pageCount);
}

function renderCatalogPagination(pageCount) {
  if (!catalogPagination) return;

  if (pageCount <= 1) {
    catalogPagination.innerHTML = "";
    return;
  }

  catalogPagination.innerHTML = `
    <button type="button" data-page-action="prev" ${activeCatalogPage === 0 ? "disabled" : ""}>이전</button>
    <span>${activeCatalogPage + 1} / ${pageCount}</span>
    <button type="button" data-page-action="next" ${activeCatalogPage >= pageCount - 1 ? "disabled" : ""}>다음</button>
  `;
}

function refreshFromStorage() {
  const nextSettings = window.CaseformConfig.load();
  if (JSON.stringify(nextSettings) === JSON.stringify(settings)) return;

  settings = nextSettings;
  products = settings.products;
  activeHeroSlide = 0;
  activeCatalogPage = 0;
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
hero.addEventListener("pointerdown", startHeroSwipe);
hero.addEventListener("pointerup", finishHeroSwipe);
hero.addEventListener("pointercancel", cancelHeroSwipe);
hero.addEventListener("click", preventHeroSwipeClick, true);

catalogPagination.addEventListener("click", (event) => {
  const button = event.target.closest("[data-page-action]");
  if (!button) return;
  activeCatalogPage += button.dataset.pageAction === "next" ? 1 : -1;
  renderProducts();
  document.querySelector("#collection").scrollIntoView({ behavior: "smooth", block: "start" });
});

catalogMobileQuery.addEventListener("change", () => {
  activeCatalogPage = 0;
  renderProducts();
});

window.addEventListener("storage", (event) => {
  if (event.key === window.CASEFORM_STORAGE_KEY) refreshFromStorage();
});

window.addEventListener("focus", refreshFromStorage);
