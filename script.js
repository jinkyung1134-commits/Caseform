const formatWon = (value) => `${Number(value).toLocaleString("ko-KR")}원`;

let settings = window.CaseformConfig.load();
let products = settings.products;

const productGrid = document.querySelector("#product-grid");
const hero = document.querySelector(".hero");
const heroTitle = document.querySelector("#hero-title");
const heroSubtitle = document.querySelector("#hero-subtitle");
const heroCopyLink = document.querySelector("#hero-copy-link");
const heroMediaLink = document.querySelector("#hero-media-link");
const heroMobileProductLink = document.querySelector("#hero-mobile-product-link");
const heroMobileAllLink = document.querySelector("#hero-mobile-all-link");
const collectionViewAllLink = document.querySelector("#collection-view-all");
const heroPreload = document.querySelector("#hero-preload");
const siteHeader = document.querySelector(".site-header");
const mobileMenuButton = document.querySelector("#mobile-menu-button");
const { escapeHtml, mediaSource, productHasMedia, productMediaKind, productMediaMarkup } = window.CaseformConfig;
const whiteHeroImage = "assets/hero-cases.png";
const catalogMobileQuery = window.matchMedia("(max-width: 720px)");
let heroSlideTimer;
let heroSwapTimer;
let activeHeroSlide = 0;
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

function productsUrl() {
  return window.CaseformConfig.urlFor("products.html", settings);
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

function useStaticHeroImage() {
  return false;
}

function staticHeroMediaMarkup() {
  const savedSource = mediaSource(settings.heroImage);
  const source = /hero-cases\.png(?:[?#].*)?$/i.test(savedSource) ? savedSource : whiteHeroImage;
  return `<img src="${escapeHtml(source)}" alt="Caseform 핸드폰 케이스 컬렉션" loading="eager" />`;
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
  document.querySelectorAll("[data-products-link]").forEach((link) => {
    link.href = productsUrl();
  });

  if (collectionViewAllLink) {
    collectionViewAllLink.href = productsUrl();
  }
  if (heroMobileAllLink) {
    heroMobileAllLink.href = productsUrl();
  }

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
  if (!slides.length && !useStaticHeroImage()) return;

  if (useStaticHeroImage()) {
    activeHeroSlide = 0;
    renderHeroDots([]);

    heroTitle.textContent = settings.heroTitle;
    heroSubtitle.textContent = settings.heroSubtitle;
    heroCopyLink.href = productsUrl();
    heroCopyLink.setAttribute("aria-label", "전체 상품 페이지로 이동");
    if (heroMobileProductLink) {
      heroMobileProductLink.href = productsUrl();
      heroMobileProductLink.textContent = "컬렉션 보기";
      heroMobileProductLink.setAttribute("aria-label", "컬렉션 보기");
    }
    heroMediaLink.href = productsUrl();
    heroMediaLink.dataset.mediaMode = "static";
    heroMediaLink.classList.remove("has-product-media");
    heroMediaLink.classList.add("is-static-hero");
    heroMediaLink.innerHTML = staticHeroMediaMarkup();
    heroPreload.href = whiteHeroImage;
    hero.classList.remove("is-switching");
    return;
  }

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
      if (heroMobileProductLink) {
        heroMobileProductLink.href = detailUrl;
        heroMobileProductLink.setAttribute("aria-label", `${product.name} 상품 보기`);
      }
      heroMediaLink.href = detailUrl;
      heroMediaLink.dataset.mediaMode = settings.heroMediaMode || "blend";
      heroMediaLink.classList.remove("is-static-hero");
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
  if (useStaticHeroImage()) return;
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
  if (useStaticHeroImage()) return;
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
  const previewCount = catalogMobileQuery.matches ? 4 : 8;
  const visibleProducts = products.slice(0, previewCount);

  productGrid.innerHTML = visibleProducts
    .map(
      (product, index) => `
        <a class="product-card catalog-card reveal-on-scroll" href="${productUrl(index)}" aria-label="${escapeHtml(product.name)} 상세페이지로 이동" style="--reveal-delay: ${(index % 4) * 70}ms">
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
      `,
    )
    .join("");

  setupRevealAnimations();
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

function setupRevealAnimations() {
  const targets = document.querySelectorAll(".collection-section .reveal-on-scroll");
  if (!("IntersectionObserver" in window)) {
    targets.forEach((target) => target.classList.add("is-revealed"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-revealed");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -10% 0px" },
  );

  targets.forEach((target) => observer.observe(target));
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

if (mobileMenuButton && siteHeader) {
  mobileMenuButton.addEventListener("click", () => {
    const isOpen = siteHeader.classList.toggle("is-menu-open");
    mobileMenuButton.setAttribute("aria-expanded", String(isOpen));
    mobileMenuButton.setAttribute("aria-label", isOpen ? "메뉴 닫기" : "메뉴 열기");
  });

  siteHeader.querySelectorAll(".nav-links a").forEach((link) => {
    link.addEventListener("click", () => {
      siteHeader.classList.remove("is-menu-open");
      mobileMenuButton.setAttribute("aria-expanded", "false");
      mobileMenuButton.setAttribute("aria-label", "메뉴 열기");
    });
  });
}

catalogMobileQuery.addEventListener("change", () => {
  renderProducts();
});

window.addEventListener("storage", (event) => {
  if (event.key === window.CASEFORM_STORAGE_KEY) refreshFromStorage();
});

window.addEventListener("focus", refreshFromStorage);
