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

function productHeroSlideItems() {
  return [];
}

function campaignHeroSlideItems() {
  const screenKey = activeScreenKey();
  const slides = Array.isArray(settings.heroSlides) ? settings.heroSlides : [];

  return slides
    .filter((slide) => slide && slide.isActive !== false)
    .map((slide, fallbackIndex) => {
      const productIndex = Number.isFinite(Number(slide.productIndex))
        ? Number(slide.productIndex)
        : fallbackIndex;
      const product = products[productIndex] || null;
      const desktopImage = mediaSource(slide.desktopImage);
      const mobileImage = mediaSource(slide.mobileImage);
      const image = screenKey === "mobile" ? mobileImage || desktopImage : desktopImage || mobileImage;

      return {
        type: "campaign",
        slide,
        product,
        index: product ? productIndex : -1,
        image,
      };
    })
    .filter((item) => item.image);
}

function heroSlideItems() {
  const campaignSlides = campaignHeroSlideItems();
  return campaignSlides.length ? campaignSlides : productHeroSlideItems();
}

function clampNumber(value, fallback, min, max) {
  const number = Number(value);
  const resolved = Number.isFinite(number) ? number : fallback;
  return Math.min(Math.max(resolved, min), max);
}

function activeScreenKey() {
  return catalogMobileQuery.matches ? "mobile" : "desktop";
}

function responsiveProfile(sourceSettings = settings, screenKey = activeScreenKey()) {
  const fallback = window.CASEFORM_DEFAULTS.responsive?.[screenKey] || {};
  return {
    ...fallback,
    ...(sourceSettings.responsive?.[screenKey] || {}),
  };
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

function renderEmptyHero() {
  activeHeroSlide = 0;
  renderHeroDots([]);
  hero.classList.add("is-empty-hero");
  hero.classList.remove("is-campaign-hero", "is-switching");
  heroTitle.textContent = "메인 슬라이드 준비 중";
  heroSubtitle.textContent = "관리자에서 완성된 PC/모바일 이미지를 업로드하면 이 영역에 표시됩니다.";
  heroCopyLink.href = productsUrl();
  heroCopyLink.setAttribute("aria-label", "상품 목록으로 이동");
  if (heroMobileProductLink) {
    heroMobileProductLink.href = productsUrl();
    heroMobileProductLink.textContent = "상품 준비 중";
    heroMobileProductLink.setAttribute("aria-label", "상품 목록으로 이동");
  }
  heroMediaLink.href = productsUrl();
  heroMediaLink.dataset.mediaMode = "empty";
  heroMediaLink.classList.remove("has-product-media", "is-campaign-media", "is-static-hero");
  heroMediaLink.innerHTML = `<span class="hero-empty-message">VELTIER</span>`;
  heroPreload.href = settings.heroImage;
}

function staticHeroMediaMarkup() {
  const savedSource = mediaSource(settings.heroImage);
  const source = /hero-cases\.png(?:[?#].*)?$/i.test(savedSource) ? savedSource : whiteHeroImage;
  return `<img src="${escapeHtml(source)}" alt="VELTIER 핸드폰 케이스 컬렉션" loading="eager" />`;
}

function heroTransitionMs() {
  return clampNumber(settings.heroTransitionDuration, 650, 150, 1800);
}

function applySettings() {
  const root = document.documentElement;
  const screenKey = activeScreenKey();
  const screenProfile = responsiveProfile(settings, screenKey);
  const mediaDarkness = clampNumber(settings.heroMediaDarkness, 58, 0, 90);
  const mediaFade = clampNumber(settings.heroMediaFade, 72, 0, 100);
  const transitionDuration = heroTransitionMs();
  const mediaScale = clampNumber(screenProfile.heroMediaScale, 100, 80, 150);

  root.style.setProperty("--accent", settings.colors.accent);
  root.style.setProperty("--accent-dark", settings.colors.accentSoft);
  root.style.setProperty("--gold", settings.colors.accent);
  root.style.setProperty("--gold-soft", settings.colors.accentSoft);
  root.style.setProperty("--gold-dark", settings.colors.accentWarm);
  root.style.setProperty("--hero-media-dim", (mediaDarkness / 100).toFixed(2));
  root.style.setProperty("--hero-media-edge", `${(8 + mediaFade * 0.22).toFixed(1)}%`);
  root.style.setProperty("--hero-media-backdrop-opacity", (0.24 + mediaFade * 0.004).toFixed(2));
  root.style.setProperty("--hero-transition-duration", `${transitionDuration}ms`);
  root.style.setProperty("--hero-media-scale", (mediaScale / 100).toFixed(2));

  document.title = settings.pageTitle;
  document.body.classList.toggle("gold-finish", Boolean(settings.goldFinish));
  document.body.dataset.screenVersion = screenKey;
  document.body.dataset.heroLayout = screenProfile.heroLayout || (screenKey === "mobile" ? "immersive" : "split");
  document.body.dataset.heroTextAlign = screenProfile.heroTextAlign || (screenKey === "mobile" ? "center" : "left");

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
  if (window.CaseformShop) {
    window.CaseformShop.setupHeaderActions(settings);
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
  if (!slides.length && !useStaticHeroImage()) {
    renderEmptyHero();
    return;
  }

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
    heroMediaLink.classList.remove("is-campaign-media");
    heroMediaLink.classList.add("is-static-hero");
    heroMediaLink.innerHTML = staticHeroMediaMarkup();
    heroPreload.href = whiteHeroImage;
    hero.classList.remove("is-campaign-hero");
    hero.classList.remove("is-switching");
    return;
  }

  activeHeroSlide = ((nextIndex % slides.length) + slides.length) % slides.length;
  const item = slides[activeHeroSlide];
  const { product, index } = item;
  const isCampaignSlide = item.type === "campaign";
  const detailUrl = product ? productUrl(index) : productsUrl();
  const productName = product?.name || settings.brandName;
  const swapDelay = immediate ? 0 : Math.round(heroTransitionMs() * 0.45);

  if (heroSwapTimer) {
    window.clearTimeout(heroSwapTimer);
  }

  renderHeroDots(slides);

  if (!immediate) hero.classList.add("is-switching");

  heroSwapTimer = window.setTimeout(
    () => {
      hero.classList.remove("is-empty-hero");
      heroTitle.textContent = productName;
      heroSubtitle.textContent = product?.description || "";
      heroCopyLink.href = detailUrl;
      heroCopyLink.setAttribute("aria-label", `${productName} 상세페이지로 이동`);
      if (heroMobileProductLink) {
        heroMobileProductLink.href = detailUrl;
        heroMobileProductLink.textContent = "상품 보기";
        heroMobileProductLink.setAttribute("aria-label", `${productName} 상품 보기`);
      }
      heroMediaLink.href = detailUrl;
      heroMediaLink.dataset.mediaMode = isCampaignSlide ? "campaign" : settings.heroMediaMode || "blend";
      heroMediaLink.classList.remove("is-static-hero");
      heroMediaLink.classList.toggle("is-campaign-media", isCampaignSlide);
      heroMediaLink.classList.toggle("has-product-media", !isCampaignSlide && productHasMedia(product));
      heroMediaLink.innerHTML = isCampaignSlide
        ? `<img class="hero-campaign-image" src="${escapeHtml(item.image)}" alt="${escapeHtml(productName)} 메인 슬라이드" loading="eager" />`
        : heroMediaContentMarkup(product);
      hero.classList.toggle("is-campaign-hero", isCampaignSlide);

      const productImage = mediaSource(product?.image);
      const preloadImage = isCampaignSlide ? item.image : productImage;
      heroPreload.href = preloadImage && !preloadImage.startsWith("data:") ? preloadImage : settings.heroImage;
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
  if (!products.length) {
    productGrid.innerHTML = `
      <div class="product-empty-state">
        <strong>등록된 상품이 없습니다.</strong>
        <p>관리자 상품 관리에서 실제 판매할 상품과 업로드 파일을 추가하세요.</p>
      </div>
    `;
    if (collectionViewAllLink) collectionViewAllLink.hidden = true;
    setupRevealAnimations();
    return;
  }

  if (collectionViewAllLink) collectionViewAllLink.hidden = false;
  const screenProfile = responsiveProfile(settings);
  const fallbackCount = catalogMobileQuery.matches ? 4 : 8;
  const previewCount = Math.round(clampNumber(screenProfile.productPreviewCount, fallbackCount, 2, 12));
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

async function hydrateProductSettings() {
  if (!window.CaseformShop?.getProductSettings) return;
  settings = await window.CaseformShop.getProductSettings(settings);
  products = settings.products;
}

async function refreshFromStorage() {
  const nextSettings = window.CaseformConfig.load();
  if (JSON.stringify(nextSettings) === JSON.stringify(settings)) return;

  settings = nextSettings;
  await hydrateProductSettings();
  products = settings.products;
  activeHeroSlide = 0;
  applySettings();
  renderProducts();
}

async function boot() {
  await hydrateProductSettings();
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

boot().catch((error) => {
  console.warn("VELTIER products could not be prepared.", error);
  applySettings();
  renderProducts();
});

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
  applySettings();
  renderProducts();
});

window.addEventListener("storage", (event) => {
  if (event.key === window.CASEFORM_STORAGE_KEY) refreshFromStorage();
});

window.addEventListener("focus", refreshFromStorage);
