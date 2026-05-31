const settings = window.CaseformConfig.load();
const products = settings.products;
const params = new URLSearchParams(window.location.search);
const selectedIndex = Math.min(Math.max(Number(params.get("id")) || 0, 0), products.length - 1);
const product = products[selectedIndex] || products[0];
const { escapeHtml, productHasMedia, productMediaMarkup } = window.CaseformConfig;
const siteHeader = document.querySelector(".site-header");
const mobileMenuButton = document.querySelector("#mobile-menu-button");

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

function renderProductMedia(target, options = {}) {
  target.classList.toggle("has-product-media", productHasMedia(product));
  target.innerHTML = productMediaMarkup(product, {
    mediaClass: options.mediaClass || "product-media product-detail-media",
    caseClass: options.caseClass || "product-case",
  });
}

function renderDetail() {
  document.title = `${product.name} - ${settings.brandName}`;
  renderProductMedia(document.querySelector("#detail-media"));
  renderProductMedia(document.querySelector("#story-media"), {
    mediaClass: "product-media story-product-media",
    caseClass: "product-case story-product-case",
  });
  document.querySelector("#detail-name").textContent = product.name;
  document.querySelector("#detail-description").textContent = product.description;
  document.querySelector("#detail-price").textContent = formatWon(product.price);
  document.querySelector("#detail-material").textContent = product.material;
  document.querySelector("#detail-grip").textContent = `${product.material} 특유의 감각과 ${product.name} 컬러 밸런스를 살린 모델입니다.`;
  document.querySelector("#story-copy-1").textContent = `${product.name}의 ${product.material} 질감이 블랙 화면과 골드 마감선 사이에서 또렷하게 보입니다.`;
  document.querySelector("#story-copy-2").textContent = `${formatWon(product.price)} 구성으로, 컬러와 소재를 먼저 확인한 뒤 상세 화면에서 구매 흐름을 이어갈 수 있습니다.`;
  document.querySelector("#story-copy-3").textContent = productHasMedia(product)
    ? "관리자에서 등록한 대표 미디어가 카드, 상세 상단, 스크롤 쇼케이스에 같은 톤으로 반영됩니다."
    : "관리자에서 상품 이미지나 영상을 등록하면 이 영역이 실제 미디어 쇼케이스로 바뀝니다.";
  document.querySelector("#back-link").href = indexUrl("#collection");
  document.querySelector("#collection-link").href = indexUrl("#collection");
  document.querySelector("#support-link").href = indexUrl("#support");
  document.querySelector("[data-home-link]").href = indexUrl("");
}

function renderRelated() {
  const related = products
    .map((item, index) => ({ item, index }))
    .filter(({ index }) => index !== selectedIndex);

  document.querySelector("#related-products").innerHTML = related
    .map(
      ({ item, index }) => `
        <article class="product-card">
          <a class="product-visual${productHasMedia(item) ? " has-product-media" : ""}" href="${productUrl(index)}" aria-label="${escapeHtml(item.name)} 상세보기">
            ${productMediaMarkup(item, { mediaClass: "product-media product-card-media" })}
          </a>
          <div>
            <h3>${escapeHtml(item.name)}</h3>
            <p>${escapeHtml(item.description)}</p>
          </div>
          <div class="product-meta">
            <strong>${formatWon(item.price)}</strong>
            <a class="button secondary" href="${productUrl(index)}">상세보기</a>
          </div>
        </article>
      `,
    )
    .join("");
}

function setActiveStory(index) {
  const stage = document.querySelector("#story-stage");
  const steps = [...document.querySelectorAll(".story-step")];
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
    stage.style.setProperty("--story-progress", progress.toFixed(3));
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
  const targets = document.querySelectorAll(".detail-grid article, .product-card, .section-heading");
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
