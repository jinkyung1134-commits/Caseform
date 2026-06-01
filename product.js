const settings = window.CaseformConfig.load();
const products = settings.products;
const params = new URLSearchParams(window.location.search);
const selectedIndex = Math.min(Math.max(Number(params.get("id")) || 0, 0), products.length - 1);
const product = products[selectedIndex] || products[0];
const { escapeHtml, mediaSource, productHasMedia, productMediaMarkup } = window.CaseformConfig;
const shop = window.CaseformShop;
const detailFallbackImage = "assets/caseform-obsidian-grid-concept.png?v=20260601-scroll-image";
const siteHeader = document.querySelector(".site-header");
const mobileMenuButton = document.querySelector("#mobile-menu-button");
const jumpPurchaseButton = document.querySelector("#jump-purchase");
const purchaseSection = document.querySelector("#purchase-section");
const purchaseStatus = document.querySelector("#purchase-status");
const deviceSelect = document.querySelector("#device-select");
const relatedTrack = document.querySelector("#related-products");
const reviewForm = document.querySelector("#review-form");
const reviewList = document.querySelector("#review-list");
const reviewStatus = document.querySelector("#review-status");
const reviewSummary = document.querySelector("#reviews-summary");
const reviewMemberState = document.querySelector("#review-member-state");
const reviewSubmit = document.querySelector("#review-submit");

function formatWon(value) {
  return `${Number(value).toLocaleString("ko-KR")}원`;
}

function applyTheme() {
  const root = document.documentElement;
  root.style.setProperty("--accent", settings.colors.accent);
  root.style.setProperty("--accent-dark", settings.colors.accentSoft);
  root.style.setProperty("--gold", settings.colors.accent);
  root.style.setProperty("--gold-soft", settings.colors.accentSoft);
  root.style.setProperty("--gold-dark", settings.colors.accentWarm);
  document.body.classList.toggle("gold-finish", Boolean(settings.goldFinish));
  document.querySelectorAll('[data-setting="brandName"]').forEach((node) => {
    node.textContent = settings.brandName;
  });
}

function productUrl(index) {
  return window.CaseformConfig.urlFor("product.html", settings, { id: String(index) });
}

function indexUrl(hash = "") {
  const url = window.CaseformConfig.urlFor("index.html", settings);
  return `${url}${hash}`;
}

function productsUrl() {
  return window.CaseformConfig.urlFor("products.html", settings);
}

function renderProductMedia(target, options = {}) {
  target.classList.toggle("has-product-media", productHasMedia(product));
  target.innerHTML = productMediaMarkup(product, {
    mediaClass: options.mediaClass || "product-media product-detail-media",
    caseClass: options.caseClass || "product-case",
  });
}

function productDetailImageSource() {
  return mediaSource(product.image) || mediaSource(detailFallbackImage);
}

function renderDetailHeroMedia(target) {
  const source = productDetailImageSource();
  const alt = `${product.name} 대표 이미지`;

  target.classList.add("has-product-media", "has-hero-image");
  target.classList.remove("has-hero-video");
  target.innerHTML = `
    <img class="product-detail-backdrop" src="${escapeHtml(source)}" alt="" aria-hidden="true" decoding="async" />
    <span class="product-detail-light" aria-hidden="true"></span>
    <img
      class="product-media product-detail-media product-hero-image"
      src="${escapeHtml(source)}"
      alt="${escapeHtml(alt)}"
      decoding="async"
      fetchpriority="high"
    />
  `;
}

function renderStoryMedia(target) {
  const source = productDetailImageSource();
  const alt = `${product.name} 스크롤 쇼케이스 이미지`;

  target.classList.add("has-product-media");
  target.innerHTML = `
    <img class="story-media-backdrop" src="${escapeHtml(source)}" alt="" aria-hidden="true" decoding="async" />
    <img
      class="product-media story-product-media"
      src="${escapeHtml(source)}"
      alt="${escapeHtml(alt)}"
      loading="lazy"
    />
  `;
}

function renderDetail() {
  document.title = `${product.name} - ${settings.brandName}`;
  renderDetailHeroMedia(document.querySelector("#detail-media"));
  renderProductMedia(document.querySelector("#purchase-media"), {
    mediaClass: "product-media purchase-product-media",
    caseClass: "product-case purchase-product-case",
  });
  renderStoryMedia(document.querySelector("#story-media"));
  document.querySelector("#detail-name").textContent = product.name;
  document.querySelector("#purchase-name").textContent = product.name;
  document.querySelector("#purchase-price").textContent = formatWon(product.price);
  document.querySelector("#purchase-summary").textContent =
    `${product.material} 소재의 ${product.name} 케이스입니다. 기종을 선택한 뒤 구매 흐름을 이어가세요.`;
  document.querySelector("#story-copy-1").textContent = `${product.name}의 ${product.material} 질감이 블랙 배경 위에서 천천히 떠오르도록 보여줍니다.`;
  document.querySelector("#story-copy-2").textContent = `스크롤할수록 이미지가 가까워지고, ${formatWon(product.price)} 구성의 컬러와 소재가 먼저 눈에 들어옵니다.`;
  document.querySelector("#story-copy-3").textContent = productHasMedia(product)
    ? "대표 이미지는 상세 상단과 스크롤 쇼케이스에 같은 톤으로 이어져, 화면이 끊기지 않게 보입니다."
    : "상품 이미지를 등록하면 이 영역이 실제 사진 중심의 스크롤 쇼케이스로 바뀝니다.";
  document.querySelector("#collection-link").href = productsUrl();
  document.querySelector("#support-link").href = indexUrl("#support");
  document.querySelector("[data-home-link]").href = indexUrl("");
  if (shop) {
    shop.setupHeaderActions(settings);
  }
}

function renderRelated() {
  const related = products
    .map((item, index) => ({ item, index }))
    .filter(({ index }) => index !== selectedIndex);

  relatedTrack.innerHTML = related
    .map(
      ({ item, index }) => `
        <a class="related-card reveal-on-scroll" href="${productUrl(index)}" aria-label="${escapeHtml(item.name)} 상세페이지로 이동">
          <span class="related-media${productHasMedia(item) ? " has-product-media" : ""}">
            ${productMediaMarkup(item, { mediaClass: "product-media product-card-media" })}
          </span>
          <span class="related-card-copy">
            <strong>${escapeHtml(item.name)}</strong>
            <small>${formatWon(item.price)}</small>
          </span>
        </a>
      `,
    )
    .join("");
}

function setActiveStory(index) {
  const story = document.querySelector("#scroll-story");
  const stage = document.querySelector("#story-stage");
  const steps = [...document.querySelectorAll(".story-step")];
  story.dataset.scene = String(index);
  stage.dataset.scene = String(index);
  steps.forEach((step, stepIndex) => {
    step.classList.toggle("is-active", stepIndex === index);
  });
}

function setupScrollStory() {
  const story = document.querySelector("#scroll-story");
  const stage = document.querySelector("#story-stage");
  const steps = [...document.querySelectorAll(".story-step")];

  const updateProgress = () => {
    const rect = story.getBoundingClientRect();
    const total = Math.max(rect.height - window.innerHeight, 1);
    const progress = Math.min(Math.max((0 - rect.top) / total, 0), 1);
    story.style.setProperty("--story-progress", progress.toFixed(3));
    stage.style.setProperty("--story-progress", progress.toFixed(3));
    stage.style.setProperty("--story-stage-y", `${((progress - 0.5) * -34).toFixed(1)}px`);
    stage.style.setProperty("--story-stage-scale", (0.9 + progress * 0.18).toFixed(3));
    stage.style.setProperty("--story-orb-opacity", (0.54 + progress * 0.28).toFixed(3));
    stage.style.setProperty("--story-orb-scale", (0.86 + progress * 0.22).toFixed(3));
    stage.style.setProperty("--story-image-scale", (1.01 + progress * 0.12).toFixed(3));
    steps.forEach((step) => {
      const stepRect = step.getBoundingClientRect();
      const stepCenter = stepRect.top + stepRect.height / 2;
      const focusDistance = Math.abs(stepCenter - window.innerHeight * 0.52);
      const focus = Math.max(0, 1 - focusDistance / (window.innerHeight * 0.72));
      step.style.setProperty("--step-focus", focus.toFixed(3));
      step.style.setProperty("--step-y", `${((1 - focus) * 54).toFixed(1)}px`);
      step.style.setProperty("--step-scale", (0.96 + focus * 0.04).toFixed(3));
      step.style.setProperty("--step-opacity", (0.2 + focus * 0.8).toFixed(3));
      step.style.setProperty("--step-active-opacity", (0.58 + focus * 0.42).toFixed(3));
      step.style.setProperty("--step-heading-scale", (0.985 + focus * 0.025).toFixed(3));
    });
  };

  const observer = new IntersectionObserver(
    (entries) => {
      const activeEntry = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

      if (activeEntry) {
        setActiveStory(Number(activeEntry.target.dataset.scene || 0));
      }
    },
    { threshold: [0.35, 0.55, 0.75], rootMargin: "-18% 0px -34% 0px" },
  );

  steps.forEach((step) => observer.observe(step));
  updateProgress();
  window.addEventListener("scroll", updateProgress, { passive: true });
  window.addEventListener("resize", updateProgress);
}

function setupRevealAnimations() {
  const targets = document.querySelectorAll(".purchase-showcase, .related-card, .section-heading, .review-form, .review-card");
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-revealed");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.18 },
  );

  targets.forEach((target) => {
    target.classList.add("reveal-on-scroll");
    observer.observe(target);
  });
}

function setupPurchaseFlow() {
  if (jumpPurchaseButton && purchaseSection) {
    jumpPurchaseButton.addEventListener("click", () => {
      purchaseSection.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  document.querySelector("#cart-action").addEventListener("click", () => {
    shop.addToCart({ productIndex: selectedIndex, product, device: deviceSelect.value });
    purchaseStatus.textContent = `${deviceSelect.value} / ${product.name} 상품을 장바구니에 담았습니다.`;
  });

  document.querySelector("#buy-action").addEventListener("click", () => {
    shop.addToCart({ productIndex: selectedIndex, product, device: deviceSelect.value });
    shop.openCartDrawer();
    purchaseStatus.textContent = `${deviceSelect.value} / ${product.name} 상품을 장바구니에 담았습니다.`;
  });
}

function renderReviewStars(rating) {
  const score = Math.min(Math.max(Number(rating || 0), 0), 5);
  return `${"★".repeat(score)}${"☆".repeat(5 - score)}`;
}

function renderReviews() {
  if (!reviewList || !shop) return;

  const reviews = shop.getReviews(selectedIndex);
  const average = reviews.length
    ? reviews.reduce((total, review) => total + Number(review.rating || 0), 0) / reviews.length
    : 0;

  reviewSummary.textContent = reviews.length
    ? `${reviews.length}개의 리뷰 · 평균 ${average.toFixed(1)}점`
    : "아직 등록된 리뷰가 없습니다.";

  if (!reviews.length) {
    reviewList.innerHTML = `<p class="review-empty">첫 리뷰를 남겨주세요.</p>`;
    return;
  }

  reviewList.innerHTML = reviews
    .map(
      (review) => `
        <article class="review-card reveal-on-scroll">
          <div class="review-card-head">
            <strong>${escapeHtml(review.title)}</strong>
            <span class="rating-stars" aria-label="${review.rating}점">${renderReviewStars(review.rating)}</span>
          </div>
          <p>${escapeHtml(review.body)}</p>
          <small>${escapeHtml(review.author)} · ${new Date(review.createdAt).toLocaleDateString("ko-KR")}</small>
        </article>
      `,
    )
    .join("");
}

function updateReviewFormState() {
  if (!reviewForm || !shop) return;
  const member = shop.currentMember();
  const fields = reviewForm.querySelectorAll("input, select, textarea");

  fields.forEach((field) => {
    field.disabled = !member;
  });
  reviewSubmit.disabled = !member;
  reviewSubmit.textContent = member ? "리뷰 등록" : "로그인 후 작성";
  reviewMemberState.textContent = member ? `${member.name}님으로 작성` : "마이페이지에서 로그인 후 작성 가능";
}

function setupReviews() {
  if (!reviewForm || !shop) return;
  renderReviews();
  updateReviewFormState();
  setupRevealAnimations();

  reviewForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const member = shop.currentMember();
    if (!member) {
      window.location.href = shop.pageUrl("account.html", settings);
      return;
    }

    try {
      shop.addReview({
        productIndex: selectedIndex,
        ...Object.fromEntries(new FormData(reviewForm)),
      });
      reviewStatus.textContent = "리뷰가 등록되었습니다.";
      reviewForm.reset();
      renderReviews();
      setupRevealAnimations();
    } catch (error) {
      reviewStatus.textContent = error.message;
    }
  });
}

function setupRelatedSlider() {
  document.querySelectorAll("[data-related-action]").forEach((button) => {
    button.addEventListener("click", () => {
      const direction = button.dataset.relatedAction === "next" ? 1 : -1;
      const distance = Math.max(relatedTrack.clientWidth * 0.78, 280);
      relatedTrack.scrollBy({ left: direction * distance, behavior: "smooth" });
    });
  });
}

function setupHeaderMenu() {
  if (!mobileMenuButton || !siteHeader) return;

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

applyTheme();
renderDetail();
renderRelated();
setupHeaderMenu();
setupScrollStory();
setupRevealAnimations();
setupPurchaseFlow();
setupRelatedSlider();
setupReviews();
