const formatWon = (value) => `${Number(value).toLocaleString("ko-KR")}원`;

let settings = window.CaseformConfig.load();
let products = settings.products;

const productGrid = document.querySelector("#product-grid");
const catalogPagination = document.querySelector("#catalog-pagination");
const siteHeader = document.querySelector(".site-header");
const mobileMenuButton = document.querySelector("#mobile-menu-button");
const catalogMobileQuery = window.matchMedia("(max-width: 720px)");
const { escapeHtml, productHasMedia, productMediaMarkup } = window.CaseformConfig;
let activeCatalogPage = 0;

function productUrl(index) {
  return window.CaseformConfig.urlFor("product.html", settings, { id: String(index) });
}

function productsUrl() {
  return window.CaseformConfig.urlFor("products.html", settings);
}

function indexUrl(hash = "") {
  const url = window.CaseformConfig.urlFor("index.html", settings);
  return `${url}${hash}`;
}

function policyUrl(hash = "") {
  const url = window.CaseformConfig.urlFor("policies.html", settings);
  return `${url}${hash}`;
}

function applySettings() {
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

  document.querySelectorAll("[data-home-link]").forEach((link) => {
    link.href = indexUrl("");
  });
  document.querySelectorAll("[data-products-link]").forEach((link) => {
    link.href = productsUrl();
  });
  document.querySelectorAll("[data-support-link]").forEach((link) => {
    link.href = policyUrl("#shipping");
  });
  if (window.CaseformShop) {
    window.CaseformShop.setupHeaderActions(settings);
  }
}

function renderProducts() {
  if (!products.length) {
    productGrid.innerHTML = `
      <div class="product-empty-state catalog-empty-state">
        <strong>등록된 상품이 없습니다.</strong>
        <p>관리자 상품 관리에서 상품을 추가하면 이 페이지에 표시됩니다.</p>
      </div>
    `;
    renderCatalogPagination(1);
    setupRevealAnimations();
    return;
  }

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
        <a class="product-card catalog-card reveal-on-scroll" href="${productUrl(index)}" aria-label="${escapeHtml(product.name)} 상세페이지로 이동" style="--reveal-delay: ${(visibleIndex % 4) * 70}ms">
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
  setupRevealAnimations();
}

function renderCatalogPagination(pageCount) {
  if (!catalogPagination) return;

  if (pageCount <= 1) {
    catalogPagination.innerHTML = "";
    return;
  }

  const pageButtons = Array.from(
    { length: pageCount },
    (_, index) => `
      <button
        class="catalog-page-number ${index === activeCatalogPage ? "is-active" : ""}"
        type="button"
        data-page-index="${index}"
        ${index === activeCatalogPage ? 'aria-current="page"' : ""}
      >${index + 1}</button>
    `,
  ).join("");

  catalogPagination.innerHTML = `
    ${pageButtons}
    <button class="catalog-page-next" type="button" data-page-action="next" aria-label="다음 상품 페이지" ${activeCatalogPage >= pageCount - 1 ? "disabled" : ""}>›</button>
  `;
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

catalogPagination.addEventListener("click", (event) => {
  const pageButton = event.target.closest("[data-page-index]");
  const actionButton = event.target.closest("[data-page-action]");
  if (!pageButton && !actionButton) return;

  activeCatalogPage = pageButton
    ? Number(pageButton.dataset.pageIndex)
    : activeCatalogPage + (actionButton.dataset.pageAction === "next" ? 1 : -1);

  renderProducts();
  document.querySelector("#collection").scrollIntoView({ behavior: "smooth", block: "start" });
});

catalogMobileQuery.addEventListener("change", () => {
  activeCatalogPage = 0;
  renderProducts();
});

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
  activeCatalogPage = 0;
  applySettings();
  renderProducts();
}

window.addEventListener("storage", (event) => {
  if (event.key === window.CASEFORM_STORAGE_KEY) refreshFromStorage();
});

window.addEventListener("focus", refreshFromStorage);

async function boot() {
  await hydrateProductSettings();
  applySettings();
  setupHeaderMenu();
  renderProducts();
}

boot().catch((error) => {
  console.warn("VELTIER catalog could not be prepared.", error);
  applySettings();
  setupHeaderMenu();
  renderProducts();
});
