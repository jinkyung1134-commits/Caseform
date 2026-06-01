let settings = window.CaseformConfig.load();
let products = settings.products;
const shop = window.CaseformShop;
const siteHeader = document.querySelector(".site-header");
const mobileMenuButton = document.querySelector("#mobile-menu-button");
const authPanel = document.querySelector("#auth-panel");
const profilePanel = document.querySelector("#profile-panel");
const loginForm = document.querySelector("#login-form");
const signupForm = document.querySelector("#signup-form");
const profileForm = document.querySelector("#profile-form");
const googleAuthButton = document.querySelector("#google-auth-button");
const authStatus = document.querySelector("#auth-status");
const profileStatus = document.querySelector("#profile-status");
const accountCartList = document.querySelector("#account-cart-list");
const accountOrderList = document.querySelector("#account-order-list");
const accountReviewList = document.querySelector("#account-review-list");

function productUrl(index) {
  return window.CaseformConfig.urlFor("product.html", settings, { id: String(index) });
}

function indexUrl(hash = "") {
  return `${window.CaseformConfig.urlFor("index.html", settings)}${hash}`;
}

function productsUrl() {
  return window.CaseformConfig.urlFor("products.html", settings);
}

function escapeHtml(value) {
  return window.CaseformConfig.escapeHtml(String(value || ""));
}

function roleLabel(role) {
  const labels = {
    admin: "관리자 계정",
    manager: "운영 매니저",
    customer: "고객 계정",
  };
  return labels[role] || "고객 계정";
}

async function applySettings() {
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
  await shop.init(settings);
}

async function hydrateProductSettings() {
  if (!shop?.getProductSettings) return;
  settings = await shop.getProductSettings(settings);
  products = settings.products;
}

function renderAccount() {
  const member = shop.currentMember();
  document.body.classList.toggle("is-signed-in", Boolean(member));
  authPanel.classList.toggle("is-hidden", Boolean(member));
  profilePanel.classList.toggle("is-hidden", !member);
  if (googleAuthButton) googleAuthButton.hidden = Boolean(member) || !shop.isSupabaseEnabled();

  if (member) {
    document.querySelector("#member-name").textContent = `${member.name}님`;
    document.querySelector("#member-role").textContent = roleLabel(member.role);
    profileForm.elements.name.value = member.name || "";
    profileForm.elements.phone.value = member.phone || "";
  }

  renderCartSummary();
  renderOrderSummary();
  renderReviewSummary();
  shop.setupHeaderActions(settings);
}

function renderCartSummary() {
  const cart = shop.getCart();
  if (!cart.length) {
    accountCartList.innerHTML = `<div class="account-empty">아직 담긴 상품이 없습니다.</div>`;
    return;
  }

  accountCartList.innerHTML = cart
    .map((item) => {
      const product = products[Number(item.productIndex)] || {};
      return `
        <a class="account-list-item" href="${productUrl(item.productIndex)}">
          <strong>${escapeHtml(item.productName || product.name || "상품")}</strong>
          <span>${escapeHtml(item.device)} · ${Number(item.quantity || 1)}개 · ${shop.formatWon(item.price)}</span>
        </a>
      `;
    })
    .join("");
}

function orderStatusLabel(status) {
  const labels = {
    pending_payment: "결제 대기",
    paid: "결제 완료",
    preparing: "상품 준비",
    shipped: "배송 중",
    delivered: "배송 완료",
    cancelled: "취소",
  };
  return labels[status] || status || "확인 중";
}

function renderOrderSummary() {
  const member = shop.currentMember();
  if (!member) {
    accountOrderList.innerHTML = `<div class="account-empty">로그인하면 주문 내역이 표시됩니다.</div>`;
    return;
  }

  const orders = shop.getOrders ? shop.getOrders() : [];
  if (!orders.length) {
    accountOrderList.innerHTML = `<div class="account-empty">아직 주문 내역이 없습니다.</div>`;
    return;
  }

  accountOrderList.innerHTML = orders
    .map(
      (order) => `
        <div class="account-list-item">
          <strong>${escapeHtml(order.orderNumber)} · ${orderStatusLabel(order.status)}</strong>
          <span>${new Date(order.createdAt).toLocaleDateString("ko-KR")} · ${shop.formatWon(order.total)}</span>
        </div>
      `,
    )
    .join("");
}

function renderReviewSummary() {
  const member = shop.currentMember();
  if (!member) {
    accountReviewList.innerHTML = `<div class="account-empty">로그인하면 내가 남긴 리뷰가 표시됩니다.</div>`;
    return;
  }

  const reviews = shop.getMemberReviews(member.email);
  if (!reviews.length) {
    accountReviewList.innerHTML = `<div class="account-empty">아직 작성한 리뷰가 없습니다.</div>`;
    return;
  }

  accountReviewList.innerHTML = reviews
    .map((review) => {
      const product = products[Number(review.productIndex)] || {};
      return `
        <a class="account-list-item" href="${productUrl(review.productIndex)}#reviews">
          <strong>${"★".repeat(review.rating)} ${escapeHtml(review.title)}</strong>
          <span>${escapeHtml(product.name || "상품")} · ${new Date(review.createdAt).toLocaleDateString("ko-KR")}</span>
        </a>
      `;
    })
    .join("");
}

function setAuthTab(tabName) {
  document.querySelectorAll("[data-auth-tab]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.authTab === tabName);
  });
  loginForm.classList.toggle("is-hidden", tabName !== "login");
  signupForm.classList.toggle("is-hidden", tabName !== "signup");
  authStatus.textContent = "";
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

document.querySelectorAll("[data-auth-tab]").forEach((button) => {
  button.addEventListener("click", () => setAuthTab(button.dataset.authTab));
});

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  authStatus.textContent = "로그인 중입니다.";
  try {
    await shop.signIn(Object.fromEntries(new FormData(loginForm)));
    authStatus.textContent = "로그인되었습니다.";
    loginForm.reset();
    renderAccount();
  } catch (error) {
    authStatus.textContent = error.message;
  }
});

signupForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  authStatus.textContent = "가입을 처리하고 있습니다.";
  try {
    const result = await shop.signUp(Object.fromEntries(new FormData(signupForm)));
    authStatus.textContent = result.needsEmailConfirmation
      ? "가입 메일을 확인한 뒤 로그인해주세요."
      : "가입이 완료되었습니다.";
    signupForm.reset();
    renderAccount();
  } catch (error) {
    authStatus.textContent = error.message;
  }
});

if (googleAuthButton) {
  googleAuthButton.addEventListener("click", async () => {
    authStatus.textContent = "Google 로그인 화면으로 이동합니다.";
    googleAuthButton.disabled = true;
    try {
      await shop.signInWithGoogle();
    } catch (error) {
      googleAuthButton.disabled = false;
      authStatus.textContent = error.message || "Google 로그인을 시작하지 못했습니다.";
    }
  });
}

profileForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  profileStatus.textContent = "저장 중입니다.";
  try {
    await shop.updateProfile(Object.fromEntries(new FormData(profileForm)));
    profileStatus.textContent = "저장되었습니다.";
    renderAccount();
  } catch (error) {
    profileStatus.textContent = error.message;
  }
});

document.querySelector("#signout-action").addEventListener("click", async () => {
  await shop.signOut();
  profileStatus.textContent = "";
  renderAccount();
});

window.addEventListener("storage", renderAccount);
window.addEventListener("caseform:shop-updated", renderAccount);

async function boot() {
  await hydrateProductSettings();
  await applySettings();
  setupHeaderMenu();
  renderAccount();
}

boot().catch((error) => {
  authStatus.textContent = error.message || "회원 기능을 불러오지 못했습니다.";
  setupHeaderMenu();
  renderAccount();
});
