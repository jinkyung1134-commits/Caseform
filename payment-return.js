let settings = window.CaseformConfig.load();
const shop = window.CaseformShop;
const siteHeader = document.querySelector(".site-header");
const mobileMenuButton = document.querySelector("#mobile-menu-button");
const resultTitle = document.querySelector("#payment-result-title");
const resultMessage = document.querySelector("#payment-result-message");
const resultMeta = document.querySelector("#payment-result-meta");
const returnCopy = document.querySelector("#payment-return-copy");
const providerNode = document.querySelector("#payment-return-provider");
const { escapeHtml } = window.CaseformConfig;

function indexUrl(hash = "") {
  return `${window.CaseformConfig.urlFor("index.html", settings)}${hash}`;
}

function productsUrl() {
  return window.CaseformConfig.urlFor("products.html", settings);
}

function accountUrl() {
  return window.CaseformConfig.urlFor("account.html", settings);
}

async function hydrateProductSettings() {
  if (!shop?.getProductSettings) return;
  settings = await shop.getProductSettings(settings);
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
  document.querySelectorAll("[data-account-link]").forEach((link) => {
    link.href = accountUrl();
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
}

function renderMeta(items) {
  resultMeta.innerHTML = Object.entries(items)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .map(
      ([label, value]) => `
        <div>
          <span>${escapeHtml(label)}</span>
          <strong>${escapeHtml(value)}</strong>
        </div>
      `,
    )
    .join("");
}

function renderFailure(params) {
  const orderId = params.get("orderId") || "";
  const code = params.get("code") || "";
  const message = params.get("message") || "결제가 완료되지 않았습니다.";
  resultTitle.textContent = "결제가 완료되지 않았습니다.";
  resultMessage.textContent = message;
  returnCopy.textContent = "주문은 결제 전 상태로 남아 있습니다. 다시 결제하거나 관리자에게 문의해주세요.";
  renderMeta({
    주문번호: orderId,
    실패코드: code,
  });
}

async function confirmTossPayment(params) {
  const paymentKey = params.get("paymentKey");
  const orderId = params.get("orderId");
  const amount = params.get("amount");
  if (!paymentKey || !orderId || !amount) {
    throw new Error("결제 승인 정보가 부족합니다.");
  }

  resultTitle.textContent = "결제 승인 확인 중";
  resultMessage.textContent = "Toss Payments 승인 결과를 서버에서 확인하고 있습니다.";
  renderMeta({ 주문번호: orderId, 결제금액: `${Number(amount).toLocaleString("ko-KR")}원` });

  const data = await shop.invokeFunction("confirm-toss-payment", {
    paymentKey,
    orderId,
    amount: Number(amount),
  });

  resultTitle.textContent = "결제가 완료되었습니다.";
  resultMessage.textContent = "주문 결제 상태가 결제 완료로 변경되었습니다.";
  returnCopy.textContent = "마이페이지에서 주문 내역과 배송 상태를 확인할 수 있습니다.";
  renderMeta({
    주문번호: data.orderNumber || orderId,
    결제ID: data.paymentKey || paymentKey,
    승인시각: data.approvedAt || "",
  });
}

async function boot() {
  await hydrateProductSettings();
  applySettings();
  setupHeaderMenu();
  await shop.init(settings);

  const params = new URLSearchParams(window.location.search);
  const provider = params.get("provider") || "toss";
  const state = params.get("state") || "";
  providerNode.textContent = provider === "toss" ? "Toss Payments" : provider;

  if (state === "fail" || params.has("code")) {
    renderFailure(params);
    return;
  }

  try {
    await confirmTossPayment(params);
  } catch (error) {
    resultTitle.textContent = "결제 확인이 필요합니다.";
    resultMessage.textContent = error.message || "결제 승인 확인 중 오류가 발생했습니다.";
    returnCopy.textContent = "관리자 화면에서 결제 상태를 확인한 뒤 주문을 처리해주세요.";
  }
}

boot().catch((error) => {
  resultTitle.textContent = "결제 확인 화면을 불러오지 못했습니다.";
  resultMessage.textContent = error.message || "잠시 후 다시 시도해주세요.";
});
