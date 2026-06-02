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
const addressForm = document.querySelector("#address-form");
const addressStatus = document.querySelector("#address-status");
const accountCartList = document.querySelector("#account-cart-list");
const accountOrderList = document.querySelector("#account-order-list");
const accountReviewList = document.querySelector("#account-review-list");
const accountAddressList = document.querySelector("#account-address-list");
const accountLoginLink = document.querySelector("#account-login-link");

function productUrl(index) {
  return window.CaseformConfig.urlFor("product.html", settings, { id: String(index) });
}

function indexUrl(hash = "") {
  return `${window.CaseformConfig.urlFor("index.html", settings)}${hash}`;
}

function productsUrl() {
  return window.CaseformConfig.urlFor("products.html", settings);
}

function policyUrl(hash = "") {
  return `${window.CaseformConfig.urlFor("policies.html", settings)}${hash}`;
}

function escapeHtml(value) {
  return window.CaseformConfig.escapeHtml(String(value || ""));
}

function countryLabel(countryCode = "KR") {
  const labels = {
    KR: "대한민국",
    US: "미국",
    JP: "일본",
    CN: "중국",
    TW: "대만",
    HK: "홍콩",
    SG: "싱가포르",
    AU: "호주",
    CA: "캐나다",
    GB: "영국",
    FR: "프랑스",
    DE: "독일",
  };
  return labels[String(countryCode || "KR").toUpperCase()] || String(countryCode || "KR").toUpperCase();
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
    link.href = policyUrl("#shipping");
  });
  if (accountLoginLink) accountLoginLink.href = shop.authUrl(settings, shop.pageUrl("account.html", settings));
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
  if (authPanel) authPanel.classList.toggle("is-hidden", Boolean(member));
  profilePanel.classList.toggle("is-hidden", !member);
  if (googleAuthButton) googleAuthButton.hidden = Boolean(member) || !shop.isSupabaseEnabled();

  if (member) {
    document.querySelector("#member-name").textContent = `${member.name}님`;
    document.querySelector("#member-role").textContent = roleLabel(member.role);
    if (profileForm.elements.email) profileForm.elements.email.value = member.email || "";
    profileForm.elements.name.value = member.name || "";
    profileForm.elements.phone.value = member.phone || "";
  }

  renderCartSummary();
  renderOrderSummary();
  renderAddressSummary();
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

function paymentStatusLabel(status) {
  const labels = {
    not_started: "결제 전",
    ready: "결제 준비",
    paid: "결제 완료",
    failed: "결제 실패",
    cancelled: "결제 취소",
    refunded: "환불 완료",
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
        <div class="account-list-item account-order-item">
          <strong>${escapeHtml(order.orderNumber)} · ${orderStatusLabel(order.status)}</strong>
          <span>${new Date(order.createdAt).toLocaleDateString("ko-KR")} · ${shop.formatWon(order.total)} · ${paymentStatusLabel(order.paymentStatus)}</span>
          <small>${(order.items || [])
            .map((item) => `${escapeHtml(item.productName)} / ${escapeHtml(item.device)} ${Number(item.quantity || 1)}개`)
            .join(" · ")}</small>
          ${
            order.trackingNumber
              ? `<small>송장번호 ${escapeHtml(order.trackingNumber)}${order.trackingUrl ? ` · <a href="${escapeHtml(order.trackingUrl)}" target="_blank" rel="noopener">배송조회</a>` : ""}</small>`
              : `<small>배송 준비 전입니다.</small>`
          }
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

function fillAddressForm(address = null) {
  if (!addressForm) return;
  const member = shop.currentMember();
  addressForm.elements.id.value = address?.id || "";
  addressForm.elements.label.value = address?.label || "기본 배송지";
  addressForm.elements.recipientName.value = address?.recipientName || member?.name || "";
  addressForm.elements.phone.value = address?.phone || member?.phone || "";
  if (addressForm.elements.countryCode) addressForm.elements.countryCode.value = address?.countryCode || "KR";
  addressForm.elements.postalCode.value = address?.postalCode || "";
  addressForm.elements.address1.value = address?.address1 || "";
  addressForm.elements.address2.value = address?.address2 || "";
  addressForm.elements.deliveryNote.value = address?.deliveryNote || "";
  addressForm.elements.isDefault.checked = address ? Boolean(address.isDefault) : true;
  addressForm.elements.countryCode?.dispatchEvent(new Event("change"));
}

function renderAddressSummary() {
  if (!accountAddressList || !addressForm) return;
  const member = shop.currentMember();
  addressForm.classList.toggle("is-hidden", !member);

  if (!member) {
    accountAddressList.innerHTML = `<div class="account-empty">로그인하면 배송지를 저장할 수 있습니다.</div>`;
    return;
  }

  const addresses = shop.getAddresses ? shop.getAddresses() : [];
  if (!addressForm.elements.address1.value && addresses.length) {
    fillAddressForm(addresses.find((address) => address.isDefault) || addresses[0]);
  }

  if (!addresses.length) {
    accountAddressList.innerHTML = `<div class="account-empty">저장된 배송지가 없습니다.</div>`;
    return;
  }

  accountAddressList.innerHTML = addresses
    .map(
      (address) => `
        <div class="account-list-item address-item" data-address-id="${escapeHtml(address.id)}">
          <strong>${escapeHtml(address.label)}${address.isDefault ? " · 기본" : ""}</strong>
          <span>${escapeHtml(address.recipientName)} · ${escapeHtml(address.phone)}</span>
          <small>${escapeHtml([countryLabel(address.countryCode), address.postalCode, address.address1, address.address2].filter(Boolean).join(" "))}</small>
          ${address.deliveryNote ? `<small>${escapeHtml(address.deliveryNote)}</small>` : ""}
          <div class="account-inline-actions">
            <button class="button secondary" type="button" data-address-edit>수정</button>
            <button class="button secondary" type="button" data-address-delete>삭제</button>
          </div>
        </div>
      `,
    )
    .join("");
}

function setAuthTab(tabName) {
  if (!loginForm || !signupForm) return;
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

loginForm?.addEventListener("submit", async (event) => {
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

signupForm?.addEventListener("submit", async (event) => {
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

if (addressForm) {
  addressForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    addressStatus.textContent = "배송지를 저장하는 중입니다.";
    try {
      await shop.saveAddress(Object.fromEntries(new FormData(addressForm)));
      addressStatus.textContent = "배송지가 저장되었습니다.";
      fillAddressForm();
      renderAccount();
    } catch (error) {
      addressStatus.textContent = error.message || "배송지를 저장하지 못했습니다.";
    }
  });
}

if (accountAddressList) {
  accountAddressList.addEventListener("click", async (event) => {
    const item = event.target.closest("[data-address-id]");
    if (!item) return;
    const address = shop.getAddresses().find((entry) => entry.id === item.dataset.addressId);

    if (event.target.closest("[data-address-edit]")) {
      fillAddressForm(address);
      addressStatus.textContent = "배송지 내용을 수정한 뒤 저장하세요.";
      return;
    }

    if (event.target.closest("[data-address-delete]")) {
      addressStatus.textContent = "배송지를 삭제하는 중입니다.";
      try {
        await shop.deleteAddress(item.dataset.addressId);
        addressStatus.textContent = "배송지를 삭제했습니다.";
        fillAddressForm();
        renderAccount();
      } catch (error) {
        addressStatus.textContent = error.message || "배송지를 삭제하지 못했습니다.";
      }
    }
  });
}

document.querySelector("#signout-action").addEventListener("click", async () => {
  await shop.signOut();
  profileStatus.textContent = "";
  renderAccount();
});

window.addEventListener("storage", renderAccount);
window.addEventListener("caseform:shop-updated", renderAccount);

async function boot() {
  window.CaseformAddressSearch?.bindAddressForm(addressForm, { statusNode: addressStatus });
  await hydrateProductSettings();
  await applySettings();
  setupHeaderMenu();
  renderAccount();
}

boot().catch((error) => {
  if (!authStatus) {
    console.warn("VELTIER account could not be prepared.", error);
    setupHeaderMenu();
    renderAccount();
    return;
  }
  authStatus.textContent = error.message || "회원 기능을 불러오지 못했습니다.";
  setupHeaderMenu();
  renderAccount();
});
