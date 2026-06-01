let settings = window.CaseformConfig.load();
let products = settings.products;

const shop = window.CaseformShop;
const siteHeader = document.querySelector(".site-header");
const mobileMenuButton = document.querySelector("#mobile-menu-button");
const checkoutForm = document.querySelector("#checkout-form");
const checkoutItems = document.querySelector("#checkout-items");
const checkoutStatus = document.querySelector("#checkout-status");
const orderSubmit = document.querySelector("#order-submit");
const subtotalNode = document.querySelector("#checkout-subtotal");
const shippingNode = document.querySelector("#checkout-shipping");
const totalNode = document.querySelector("#checkout-total");
const paymentState = document.querySelector("#payment-state");
const { escapeHtml } = window.CaseformConfig;

function indexUrl(hash = "") {
  return `${window.CaseformConfig.urlFor("index.html", settings)}${hash}`;
}

function productsUrl() {
  return window.CaseformConfig.urlFor("products.html", settings);
}

async function hydrateProductSettings() {
  if (!shop?.getProductSettings) return;
  settings = await shop.getProductSettings(settings);
  products = settings.products;
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
    link.href = indexUrl("#support");
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

function fillMemberFields() {
  const member = shop.currentMember();
  if (!member) {
    orderSubmit.disabled = true;
    checkoutStatus.innerHTML = `로그인 후 주문할 수 있습니다. <a href="${shop.pageUrl("account.html", settings)}">마이페이지로 이동</a>`;
    return;
  }

  checkoutForm.elements.recipientName.value = member.name || "";
  checkoutForm.elements.phone.value = member.phone || "";
  checkoutForm.elements.email.value = member.email || "";
}

function renderSummary() {
  const cart = shop.getCart();
  const subtotal = shop.cartTotal();
  const shippingFee = subtotal >= 30000 || subtotal === 0 ? 0 : 3000;
  const total = subtotal + shippingFee;

  if (!cart.length) {
    checkoutItems.innerHTML = `<div class="account-empty">장바구니에 담긴 상품이 없습니다.</div>`;
    orderSubmit.disabled = true;
  } else {
    checkoutItems.innerHTML = cart
      .map((item) => {
        const product = products[Number(item.productIndex)] || {};
        const name = item.productName || product.name || "상품";
        return `
          <article class="checkout-item">
            <strong>${escapeHtml(name)}</strong>
            <span>${escapeHtml(item.device)} · ${Number(item.quantity || 1)}개 · ${shop.formatWon(item.price)}</span>
          </article>
        `;
      })
      .join("");
  }

  subtotalNode.textContent = shop.formatWon(subtotal);
  shippingNode.textContent = shippingFee ? shop.formatWon(shippingFee) : "무료";
  totalNode.textContent = shop.formatWon(total);
}

checkoutForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  checkoutStatus.textContent = "주문을 생성하는 중입니다.";
  orderSubmit.disabled = true;

  try {
    const order = await shop.createOrder(Object.fromEntries(new FormData(checkoutForm)));
    checkoutStatus.textContent = `주문 ${order.orderNumber}이 생성되었습니다.`;
    paymentState.textContent = `주문 ${order.orderNumber} · 결제 연결 대기`;
  } catch (error) {
    checkoutStatus.textContent = error.message || "주문을 생성하지 못했습니다.";
  } finally {
    orderSubmit.disabled = false;
  }
});

window.addEventListener("caseform:shop-updated", () => {
  fillMemberFields();
  renderSummary();
});

async function boot() {
  await hydrateProductSettings();
  applySettings();
  setupHeaderMenu();
  await shop.init(settings);
  fillMemberFields();
  renderSummary();
}

boot().catch((error) => {
  checkoutStatus.textContent = error.message || "주문서를 불러오지 못했습니다.";
});
