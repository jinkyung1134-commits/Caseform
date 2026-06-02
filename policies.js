let settings = window.CaseformConfig.load();
const shop = window.CaseformShop;
const siteHeader = document.querySelector(".site-header");
const mobileMenuButton = document.querySelector("#mobile-menu-button");

function indexUrl(hash = "") {
  return `${window.CaseformConfig.urlFor("index.html", settings)}${hash}`;
}

function productsUrl() {
  return window.CaseformConfig.urlFor("products.html", settings);
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
  shop.setupHeaderActions(settings);
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

async function hydrateProductSettings() {
  if (!shop?.getProductSettings) return;
  settings = await shop.getProductSettings(settings);
}

async function boot() {
  await hydrateProductSettings();
  applySettings();
  setupHeaderMenu();
}

boot().catch(() => {
  applySettings();
  setupHeaderMenu();
});
