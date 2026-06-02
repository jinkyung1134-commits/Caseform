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
const paymentProvider = document.querySelector("#payment-provider");
const paymentCopy = document.querySelector("#payment-copy");
const { escapeHtml } = window.CaseformConfig;
const TOSS_SCRIPT_URL = "https://js.tosspayments.com/v2/standard";
let tossScriptPromise = null;

function indexUrl(hash = "") {
  return `${window.CaseformConfig.urlFor("index.html", settings)}${hash}`;
}

function productsUrl() {
  return window.CaseformConfig.urlFor("products.html", settings);
}

function accountSectionUrl(section = "orders") {
  const url = new URL(shop.pageUrl("account.html", settings), window.location.href);
  url.searchParams.set("section", section);
  return url.href;
}

function policyUrl(hash = "") {
  return `${window.CaseformConfig.urlFor("policies.html", settings)}${hash}`;
}

function paymentReturnUrl(state) {
  const url = new URL("payment-return.html", window.location.href);
  url.searchParams.set("provider", "toss");
  url.searchParams.set("state", state);
  return url.href;
}

function getTossClientKey() {
  return String(
    window.CASEFORM_PAYMENTS?.tossClientKey ||
      settings.integrations?.tossClientKey ||
      "",
  ).trim();
}

function getCustomerKey() {
  const member = shop.currentMember();
  const source = member?.id || member?.email || "guest";
  return `veltier-${String(source).replace(/[^a-z0-9_-]/gi, "").slice(0, 42) || "guest"}`;
}

function loadTossScript() {
  if (window.TossPayments) return Promise.resolve();
  if (tossScriptPromise) return tossScriptPromise;

  tossScriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = TOSS_SCRIPT_URL;
    script.async = true;
    script.addEventListener("load", resolve, { once: true });
    script.addEventListener("error", () => reject(new Error("Toss Payments 스크립트를 불러오지 못했습니다.")), {
      once: true,
    });
    document.head.appendChild(script);
  });

  return tossScriptPromise;
}

function orderName(order) {
  const items = order.items || shop.getCart();
  const firstItem = items[0];
  const base = firstItem?.productName || "VELTIER Case";
  return items.length > 1 ? `${base} 외 ${items.length - 1}건` : base;
}

async function startTossPayment(order) {
  const clientKey = getTossClientKey();
  if (!clientKey) {
    paymentState.textContent = "Toss 테스트 키 필요";
    paymentCopy.textContent = "payments-config.js 또는 관리자 설정에 Toss Client Key를 넣으면 테스트 결제창이 열립니다.";
    checkoutStatus.innerHTML = `
      주문 ${escapeHtml(order.orderNumber)}이 결제 전 상태로 생성되었습니다.
      <a href="${accountSectionUrl("orders")}">주문 내역 보기</a>
    `;
    return false;
  }

  await loadTossScript();
  const tossPayments = window.TossPayments(clientKey);
  const payment = tossPayments.payment({ customerKey: getCustomerKey() });
  await payment.requestPayment({
    method: "CARD",
    amount: {
      currency: order.currency || "KRW",
      value: Math.round(Number(order.total || 0)),
    },
    orderId: order.orderNumber,
    orderName: orderName(order),
    successUrl: paymentReturnUrl("success"),
    failUrl: paymentReturnUrl("fail"),
    customerEmail: order.email,
    customerName: order.recipientName,
  });
  return true;
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
    link.href = policyUrl("#shipping");
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
    checkoutStatus.innerHTML = `로그인 후 주문할 수 있습니다. <a href="${shop.authUrl(settings, shop.pageUrl("checkout.html", settings))}">로그인 페이지로 이동</a> 비회원 주문은 PG와 주문 조회 정책 확정 후 열 예정입니다.`;
    paymentState.textContent = "회원 주문만 지원";
    paymentCopy.textContent = "현재 테스트 단계에서는 회원 주문으로 장바구니, 주문 내역, 배송지를 연결합니다.";
    return;
  }

  checkoutForm.elements.recipientName.value = member.name || "";
  checkoutForm.elements.phone.value = member.phone || "";
  checkoutForm.elements.email.value = member.email || "";
  if (checkoutForm.elements.countryCode) checkoutForm.elements.countryCode.value = "KR";
  const address = shop.getDefaultAddress ? shop.getDefaultAddress() : null;
  if (address) {
    checkoutForm.elements.recipientName.value = address.recipientName || checkoutForm.elements.recipientName.value;
    checkoutForm.elements.phone.value = address.phone || checkoutForm.elements.phone.value;
    if (checkoutForm.elements.countryCode) checkoutForm.elements.countryCode.value = address.countryCode || "KR";
    checkoutForm.elements.postalCode.value = address.postalCode || "";
    checkoutForm.elements.address1.value = address.address1 || "";
    checkoutForm.elements.address2.value = address.address2 || "";
    checkoutForm.elements.deliveryNote.value = address.deliveryNote || "";
  }
  checkoutForm.elements.countryCode?.dispatchEvent(new Event("change"));
  orderSubmit.disabled = !shop.getCart().length;
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
    orderSubmit.disabled = !shop.currentMember();
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

function updatePaymentCopy() {
  const tossReady = Boolean(getTossClientKey());
  const labels = {
    manual: ["관리자 확인 결제", "관리자가 주문을 확인한 뒤 결제 상태를 변경합니다."],
    toss: tossReady
      ? ["Toss Payments 테스트 결제", "주문 생성 후 Toss 테스트 결제창으로 이동합니다."]
      : ["Toss Payments 키 필요", "Toss 테스트 Client Key를 넣으면 결제창을 열 수 있습니다."],
    paypal: ["PayPal 준비", "해외 결제 보조 수단입니다. 실제 연결은 사업자/계정 준비 후 진행합니다."],
  };
  const [title, copy] = labels[paymentProvider?.value] || labels.manual;
  paymentState.textContent = title;
  paymentCopy.textContent = copy;
  orderSubmit.textContent = paymentProvider?.value === "toss" ? "주문 후 Toss 결제" : "주문 생성";
}

checkoutForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  checkoutStatus.textContent = "주문을 생성하는 중입니다.";
  orderSubmit.disabled = true;

  try {
    const formValues = Object.fromEntries(new FormData(checkoutForm));
    if (formValues.saveProfileInfo && shop.updateProfile) {
      await shop.updateProfile({
        name: formValues.recipientName,
        phone: formValues.phone,
      });
    }
    const order = await shop.createOrder(formValues);
    const savedTargets = [];
    if (formValues.saveProfileInfo) savedTargets.push("회원정보");
    if (formValues.saveAddress && shop.saveAddress) {
      await shop.saveAddress({
        label: "기본 배송지",
        recipientName: formValues.recipientName,
        phone: formValues.phone,
        countryCode: formValues.countryCode,
        postalCode: formValues.postalCode,
        address1: formValues.address1,
        address2: formValues.address2,
        deliveryNote: formValues.deliveryNote,
        isDefault: true,
      });
      savedTargets.push("기본 배송지");
    }
    const savedCopy = savedTargets.length ? ` ${savedTargets.join(", ")}도 저장했습니다.` : "";
    checkoutStatus.innerHTML = `
      주문 ${escapeHtml(order.orderNumber)}이 결제 전 상태로 생성되었습니다.${escapeHtml(savedCopy)}
      <a href="${accountSectionUrl("orders")}">주문 내역 보기</a>
    `;
    paymentState.textContent = `주문 ${order.orderNumber} · 결제 전`;
    if (formValues.paymentProvider === "toss") {
      const started = await startTossPayment(order);
      if (started) {
        checkoutStatus.textContent = "Toss 결제창으로 이동합니다.";
      }
    }
    renderSummary();
  } catch (error) {
    checkoutStatus.textContent = error.message || "주문을 생성하지 못했습니다.";
  } finally {
    orderSubmit.disabled = !shop.currentMember() || !shop.getCart().length;
  }
});

if (paymentProvider) {
  paymentProvider.addEventListener("change", updatePaymentCopy);
}

window.addEventListener("caseform:shop-updated", () => {
  fillMemberFields();
  renderSummary();
});

async function boot() {
  window.CaseformAddressSearch?.bindAddressForm(checkoutForm, { statusNode: checkoutStatus });
  await hydrateProductSettings();
  applySettings();
  setupHeaderMenu();
  await shop.init(settings);
  fillMemberFields();
  renderSummary();
  updatePaymentCopy();
}

boot().catch((error) => {
  checkoutStatus.textContent = error.message || "주문서를 불러오지 못했습니다.";
});
