const form = document.querySelector("#settings-form");
const productHost = document.querySelector("#admin-products");
const statusText = document.querySelector("#save-status");
const resetButton = document.querySelector("#reset-button");
const adminGate = document.querySelector("#admin-gate");
const adminApp = document.querySelector("#admin-app");
const adminLoginForm = document.querySelector("#admin-login-form");
const adminGoogleAuthButton = document.querySelector("#admin-google-auth-button");
const adminGateCopy = document.querySelector("#admin-gate-copy");
const adminAuthStatus = document.querySelector("#admin-auth-status");
const adminSignout = document.querySelector("#admin-signout");
const adminSaveButton = document.querySelector("#admin-save-button");
const adminProductCount = document.querySelector("#admin-product-count");
const adminHeroCount = document.querySelector("#admin-hero-count");
const adminReviewMode = document.querySelector("#admin-review-mode");
const adminRoleName = document.querySelector("#admin-role-name");
const adminOrderCount = document.querySelector("#admin-order-count");
const adminLowStockCount = document.querySelector("#admin-low-stock-count");
const adminOrderFilter = document.querySelector("#admin-order-filter");
const adminRefreshOrders = document.querySelector("#admin-refresh-orders");
const adminOrders = document.querySelector("#admin-orders");
const inventoryProductSelect = document.querySelector("#inventory-product-select");
const inventorySeedButton = document.querySelector("#inventory-seed-button");
const inventorySaveButton = document.querySelector("#inventory-save-button");
const inventoryGrid = document.querySelector("#inventory-grid");
const inventoryStatus = document.querySelector("#inventory-status");
const lowStockList = document.querySelector("#low-stock-list");
const adminReviewList = document.querySelector("#admin-review-list");
const notificationList = document.querySelector("#notification-list");
const notificationSendButton = document.querySelector("#notification-send-button");
const emailTemplateList = document.querySelector("#email-template-list");
const opsChecklist = document.querySelector("#ops-checklist");
const opsStatus = document.querySelector("#ops-status");
const adminExportButton = document.querySelector("#admin-export-button");
const adminMenuButtons = [...document.querySelectorAll("[data-admin-view]")];
const adminPanels = [...document.querySelectorAll("[data-admin-panel]")];
const adminWorkspaceTitle = document.querySelector("#admin-workspace-title");
const adminWorkspaceCopy = document.querySelector("#admin-workspace-copy");
const adminCustomerList = document.querySelector("#admin-customer-list");
const previewFrame = document.querySelector("#admin-preview-frame");
const previewSlideImage = document.querySelector("#preview-slide-image");
const previewSlideProduct = document.querySelector("#preview-slide-product");
const previewSlideDevice = document.querySelector("#preview-slide-device");
const previewModeButtons = [...document.querySelectorAll("[data-preview-mode]")];
const uiDeviceTabButtons = [...document.querySelectorAll("[data-ui-device-tab]")];
const uiDevicePanels = [...document.querySelectorAll("[data-ui-device-panel]")];
const productAddButton = document.querySelector("#product-add-button");
const productSaveDraftButton = document.querySelector("#product-save-draft-button");
const productClearButton = document.querySelector("#product-clear-button");
const heroSlideList = document.querySelector("#hero-slide-list");
const heroSlideAddButton = document.querySelector("#hero-slide-add-button");
const imagePreset = form.elements.heroImagePreset || null;
const homeLinks = [...document.querySelectorAll('a[href="index.html"]')];
const { escapeHtml, mediaSource, productHasMedia, productMediaKind, productMediaMarkup } = window.CaseformConfig;
const shop = window.CaseformShop || null;
const MAX_IMAGE_SIZE = 1400;
const IMAGE_QUALITY = 0.82;

let settings = window.CaseformConfig.load();
let adminReady = false;
let adminBootPromise = null;

const orderStatuses = {
  pending_payment: "결제 대기",
  paid: "결제 완료",
  preparing: "상품 준비",
  shipped: "배송 중",
  delivered: "배송 완료",
  cancelled: "취소",
};

const paymentStatuses = {
  not_started: "결제 전",
  ready: "결제 준비",
  paid: "결제 완료",
  failed: "결제 실패",
  cancelled: "결제 취소",
  refunded: "환불 완료",
};

const paymentProviders = {
  manual: "관리자 확인",
  toss: "Toss Payments",
  paypal: "PayPal",
  stripe: "Stripe",
};

const emailTemplates = [
  {
    title: "회원가입 환영",
    subject: "[VELTIER] 가입을 환영합니다",
    body: "VELTIER에 가입해주셔서 감사합니다. 마이페이지에서 주문 내역과 리뷰를 확인할 수 있습니다.",
  },
  {
    title: "주문 접수",
    subject: "[VELTIER] 주문이 접수되었습니다",
    body: "주문이 정상적으로 접수되었습니다. 관리자가 결제 및 재고 상태를 확인한 뒤 다음 상태로 변경합니다.",
  },
  {
    title: "배송 시작",
    subject: "[VELTIER] 상품이 발송되었습니다",
    body: "주문하신 상품이 발송되었습니다. 마이페이지에서 송장번호와 배송조회 링크를 확인해주세요.",
  },
  {
    title: "리뷰 요청",
    subject: "[VELTIER] 사용감은 어떠셨나요?",
    body: "상품을 받아보신 뒤 상세페이지에서 리뷰를 남겨주세요. 실제 사용감은 다음 고객에게 큰 도움이 됩니다.",
  },
];

function roleLabel(role) {
  const labels = {
    admin: "관리자",
    manager: "운영 매니저",
    customer: "고객",
    guest: "비로그인",
  };
  return labels[role] || role || "확인 전";
}

const adminViewMeta = {
  dashboard: {
    title: "대시보드",
    copy: "오늘 확인할 주문, 상품, 재고, 권한 상태를 한 번에 봅니다.",
  },
  orders: {
    title: "주문 관리",
    copy: "주문 상태, 결제 상태, 송장 정보를 운영 단계별로 관리합니다.",
  },
  products: {
    title: "상품 관리",
    copy: "상품명, 가격, 대표 이미지와 영상 파일을 등록하고 판매 노출 상태를 정합니다.",
  },
  inventory: {
    title: "재고 관리",
    copy: "핸드폰 기종별 SKU와 재고 수량, 품절 여부를 관리합니다.",
  },
  customers: {
    title: "고객 관리",
    copy: "회원과 구매 고객 정보를 주문 데이터 기준으로 빠르게 확인합니다.",
  },
  reviews: {
    title: "리뷰 관리",
    copy: "구매자가 남긴 리뷰를 확인하고 필요할 때 숨기거나 삭제합니다.",
  },
  email: {
    title: "알림 관리",
    copy: "주문, 배송, 리뷰 요청에 필요한 이메일 대기열과 템플릿을 확인합니다.",
  },
  ui: {
    title: "사이트 UI 관리",
    copy: "첫 화면 문구, 색상, 이미지 표시 방식을 바꾸면서 실시간으로 분위기를 확인합니다.",
  },
  settings: {
    title: "사이트 설정",
    copy: "브랜드명, 도메인, 지도 API, 결제 공개 키처럼 사이트 운영에 필요한 값을 관리합니다.",
  },
  operations: {
    title: "운영 점검",
    copy: "판매 전 확인해야 할 보안, 결제, 백업 상태를 점검합니다.",
  },
};

function initialAdminView() {
  const hashView = window.location.hash.replace("#", "");
  return adminViewMeta[hashView] ? hashView : "dashboard";
}

function setAdminView(view, options = {}) {
  const nextView = adminViewMeta[view] ? view : "dashboard";
  const meta = adminViewMeta[nextView];

  adminMenuButtons.forEach((button) => {
    const isActive = button.dataset.adminView === nextView;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-selected", isActive ? "true" : "false");
  });

  adminPanels.forEach((panel) => {
    const isActive = panel.dataset.adminPanel === nextView;
    panel.classList.toggle("is-active", isActive);
    panel.hidden = !isActive;
  });

  if (adminWorkspaceTitle) adminWorkspaceTitle.textContent = meta.title;
  if (adminWorkspaceCopy) adminWorkspaceCopy.textContent = meta.copy;

  if (options.updateHash !== false && window.location.hash !== `#${nextView}`) {
    history.replaceState(null, "", `#${nextView}`);
  }
}

function setPreviewMode(mode, options = {}) {
  if (!previewFrame) return;
  const nextMode = mode === "mobile" ? "mobile" : "desktop";
  previewFrame.dataset.previewMode = nextMode;
  previewModeButtons.forEach((button) => {
    const isActive = button.dataset.previewMode === nextMode;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", isActive ? "true" : "false");
  });
  if (options.syncTab !== false) setUiDevicePanel(nextMode, { syncPreview: false });
  if (options.refresh !== false && form) updatePreview();
}

function setUiDevicePanel(device, options = {}) {
  const nextDevice = device === "mobile" ? "mobile" : "desktop";
  uiDeviceTabButtons.forEach((button) => {
    const isActive = button.dataset.uiDeviceTab === nextDevice;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-selected", isActive ? "true" : "false");
  });
  uiDevicePanels.forEach((panel) => {
    const isActive = panel.dataset.uiDevicePanel === nextDevice;
    panel.classList.toggle("is-active", isActive);
    panel.hidden = !isActive;
  });
  if (options.syncPreview !== false) setPreviewMode(nextDevice, { syncTab: false });
}

function setAdminAuthStatus(message, tone = "neutral") {
  if (!adminAuthStatus) return;
  adminAuthStatus.textContent = message;
  adminAuthStatus.dataset.tone = tone;
}

function updateAdminDashboard() {
  const heroSlides = (settings.heroSlides || []).filter((slide) => slide.isActive !== false);
  const inventory = shop?.getInventory?.() || [];
  const lowStockItems = inventory.filter(
    (item) => item.isAvailable && Number(item.stockQuantity || 0) <= Number(item.lowStockThreshold || 0),
  );
  if (adminProductCount) adminProductCount.textContent = String(settings.products.length);
  if (adminHeroCount) adminHeroCount.textContent = String(heroSlides.length);
  if (adminReviewMode) adminReviewMode.textContent = shop?.isSupabaseEnabled() ? "Supabase" : "Local";
  if (adminRoleName) adminRoleName.textContent = roleLabel(shop?.currentRole?.() || "admin");
  if (adminOrderCount) adminOrderCount.textContent = String(shop?.getOrders?.().length || 0);
  if (adminLowStockCount) adminLowStockCount.textContent = String(lowStockItems.length);
}

function statusOptions(source, selected) {
  return Object.entries(source)
    .map(([value, label]) => `<option value="${value}"${value === selected ? " selected" : ""}>${label}</option>`)
    .join("");
}

function orderStatusLabel(status) {
  return orderStatuses[status] || status || "확인 중";
}

function paymentStatusLabel(status) {
  return paymentStatuses[status] || status || "확인 중";
}

function paymentProviderLabel(provider) {
  return paymentProviders[provider] || provider || "관리자 확인";
}

function dateLabel(value) {
  return value ? new Date(value).toLocaleString("ko-KR") : "기록 없음";
}

function commerceConfigStatus() {
  const tossClientKey = settings.integrations?.tossClientKey || window.CASEFORM_PAYMENTS?.tossClientKey || "";
  return {
    tossClientKey: tossClientKey ? "입력됨" : "미입력",
    supportEmail: settings.integrations?.supportEmail || "미입력",
    customDomain: settings.integrations?.customDomain || "도메인 선택 전",
  };
}

function renderAdminOrders() {
  if (!adminOrders || !shop?.getOrders) return;

  const filter = adminOrderFilter?.value || "all";
  const orders = shop
    .getOrders()
    .filter((order) => filter === "all" || order.status === filter)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  if (!orders.length) {
    adminOrders.innerHTML = `<div class="admin-empty">표시할 주문이 없습니다.</div>`;
    return;
  }

  adminOrders.innerHTML = orders
    .map(
      (order) => `
        <article class="admin-order-card" data-order-id="${escapeHtml(order.id)}">
          <div class="admin-order-head">
            <div>
              <strong>${escapeHtml(order.orderNumber)}</strong>
              <span>${new Date(order.createdAt).toLocaleString("ko-KR")} · ${escapeHtml(order.recipientName)} · ${shop.formatWon(order.total)}</span>
            </div>
            <span class="status-pill">${orderStatusLabel(order.status)} · ${paymentStatusLabel(order.paymentStatus)}</span>
          </div>
          <div class="admin-order-items">
            ${(order.items || [])
              .map(
                (item) => `
                  <span>${escapeHtml(item.productName)} / ${escapeHtml(item.device)} · ${Number(item.quantity || 1)}개</span>
                `,
              )
              .join("")}
          </div>
          <div class="admin-order-meta">
            <span>${escapeHtml(order.phone)}</span>
            <span>${escapeHtml(order.email)}</span>
            <span>${escapeHtml([order.countryCode || "KR", order.postalCode, order.address1, order.address2].filter(Boolean).join(" "))}</span>
          </div>
          <div class="admin-order-meta">
            <span>결제 요청: ${escapeHtml(dateLabel(order.paymentRequestedAt))}</span>
            <span>결제 승인: ${escapeHtml(dateLabel(order.paymentApprovedAt || order.paidAt))}</span>
            ${
              order.paymentFailureMessage
                ? `<span>실패: ${escapeHtml([order.paymentFailureCode, order.paymentFailureMessage].filter(Boolean).join(" / "))}</span>`
                : `<span>실패 기록 없음</span>`
            }
          </div>
          <div class="admin-order-controls">
            <label>
              <span>주문 상태</span>
              <select data-order-field="status">${statusOptions(orderStatuses, order.status)}</select>
            </label>
            <label>
              <span>결제 상태</span>
              <select data-order-field="paymentStatus">${statusOptions(paymentStatuses, order.paymentStatus)}</select>
            </label>
            <label>
              <span>결제 방식</span>
              <select data-order-field="paymentProvider">
                ${statusOptions(paymentProviders, order.paymentProvider || "manual")}
              </select>
            </label>
            <label>
              <span>결제 ID</span>
              <input data-order-field="providerPaymentId" type="text" value="${escapeHtml(order.providerPaymentId)}" placeholder="payment id" />
            </label>
            <label>
              <span>송장번호</span>
              <input data-order-field="trackingNumber" type="text" value="${escapeHtml(order.trackingNumber)}" placeholder="송장번호" />
            </label>
            <label>
              <span>배송조회 URL</span>
              <input data-order-field="trackingUrl" type="url" value="${escapeHtml(order.trackingUrl)}" placeholder="https://..." />
            </label>
            <label class="wide-field">
              <span>관리 메모</span>
              <textarea data-order-field="adminNote" rows="2">${escapeHtml(order.adminNote)}</textarea>
            </label>
            <button class="button primary" type="button" data-order-save>주문 저장</button>
          </div>
          <p class="admin-helper">
            ${escapeHtml(paymentProviderLabel(order.paymentProvider))} · ${order.deliveryNote ? `배송 메모: ${escapeHtml(order.deliveryNote)}` : "배송 메모 없음"}
          </p>
        </article>
      `,
    )
    .join("");
}

function selectedInventoryIndex() {
  return Number(inventoryProductSelect?.value || 0);
}

function renderInventorySelector() {
  if (!inventoryProductSelect) return;
  const current = inventoryProductSelect.value;
  inventoryProductSelect.innerHTML = settings.products
    .map((product, index) => `<option value="${index}">${index + 1}. ${escapeHtml(product.name)}</option>`)
    .join("");
  if (current && Number(current) < settings.products.length) inventoryProductSelect.value = current;
}

function renderInventoryGrid() {
  if (!inventoryGrid || !shop?.getDeviceOptions) return;

  const productIndex = selectedInventoryIndex();
  const inventory = shop.getProductInventory(productIndex);
  const byDevice = new Map(inventory.map((item) => [item.device, item]));

  inventoryGrid.innerHTML = shop
    .getDeviceOptions()
    .map((device) => {
      const item = byDevice.get(device) || {
        productIndex,
        device,
        sku: `VT-${String(productIndex + 1).padStart(3, "0")}-${device.replace(/[^A-Z0-9]/gi, "").toUpperCase()}`,
        stockQuantity: 12,
        lowStockThreshold: 3,
        isAvailable: true,
      };
      return `
        <div class="inventory-row" data-device="${escapeHtml(device)}">
          <strong>${escapeHtml(device)}</strong>
          <label>
            <span>SKU</span>
            <input data-inventory-field="sku" type="text" value="${escapeHtml(item.sku)}" />
          </label>
          <label>
            <span>재고</span>
            <input data-inventory-field="stockQuantity" type="number" min="0" step="1" value="${Number(item.stockQuantity || 0)}" />
          </label>
          <label>
            <span>주의 기준</span>
            <input data-inventory-field="lowStockThreshold" type="number" min="0" step="1" value="${Number(item.lowStockThreshold || 0)}" />
          </label>
          <label class="admin-toggle">
            <input data-inventory-field="isAvailable" type="checkbox"${item.isAvailable ? " checked" : ""} />
            <span>판매</span>
          </label>
        </div>
      `;
    })
    .join("");
}

function renderLowStockList() {
  if (!lowStockList || !shop?.getInventory) return;
  const inventory = shop
    .getInventory()
    .filter((item) => item.isAvailable && Number(item.stockQuantity || 0) <= Number(item.lowStockThreshold || 0))
    .slice(0, 10);

  if (!inventory.length) {
    lowStockList.innerHTML = `<div class="admin-empty">재고 주의 상품이 없습니다.</div>`;
    return;
  }

  lowStockList.innerHTML = inventory
    .map((item) => {
      const product = settings.products[Number(item.productIndex)] || {};
      return `
        <div class="admin-subitem">
          <strong>${escapeHtml(product.name || `상품 ${Number(item.productIndex) + 1}`)} / ${escapeHtml(item.device)}</strong>
          <span>남은 재고 ${Number(item.stockQuantity || 0)}개 · 주의 기준 ${Number(item.lowStockThreshold || 0)}개</span>
        </div>
      `;
    })
    .join("");
}

function collectInventoryRows() {
  const productIndex = selectedInventoryIndex();
  return [...inventoryGrid.querySelectorAll(".inventory-row")].map((row) => ({
    productIndex,
    device: row.dataset.device,
    sku: row.querySelector('[data-inventory-field="sku"]').value.trim(),
    stockQuantity: Number(row.querySelector('[data-inventory-field="stockQuantity"]').value) || 0,
    lowStockThreshold: Number(row.querySelector('[data-inventory-field="lowStockThreshold"]').value) || 0,
    isAvailable: row.querySelector('[data-inventory-field="isAvailable"]').checked,
  }));
}

function seedInventoryRows() {
  if (!inventoryGrid) return;
  inventoryGrid.querySelectorAll(".inventory-row").forEach((row) => {
    row.querySelector('[data-inventory-field="stockQuantity"]').value = "12";
    row.querySelector('[data-inventory-field="lowStockThreshold"]').value = "3";
    row.querySelector('[data-inventory-field="isAvailable"]').checked = true;
  });
  inventoryStatus.textContent = "기본 재고가 입력되었습니다. 저장을 눌러 반영하세요.";
}

function renderNotifications() {
  if (!notificationList || !shop?.getNotifications) return;

  const notifications = shop.getNotifications();
  if (!notifications.length) {
    notificationList.innerHTML = `<div class="admin-empty">아직 알림 대기열이 없습니다.</div>`;
    return;
  }

  notificationList.innerHTML = notifications
    .slice(0, 8)
    .map(
      (event) => `
        <article class="notification-item" data-notification-id="${escapeHtml(event.id)}">
          <strong>${escapeHtml(event.subject)}</strong>
          <span>${escapeHtml(event.recipientEmail)} · ${escapeHtml(event.status)} · ${new Date(event.createdAt).toLocaleString("ko-KR")}</span>
          <p>${escapeHtml(event.body)}</p>
          <div class="admin-inline-actions">
            <button class="button secondary" type="button" data-notification-status="sent">발송 완료</button>
            <button class="button secondary" type="button" data-notification-status="skipped">건너뜀</button>
          </div>
        </article>
      `,
    )
    .join("");
}

function renderAdminReviews() {
  if (!adminReviewList || !shop?.getAllReviews) return;
  const reviews = shop.getAllReviews();

  if (!reviews.length) {
    adminReviewList.innerHTML = `<div class="admin-empty">등록된 리뷰가 없습니다.</div>`;
    return;
  }

  adminReviewList.innerHTML = reviews
    .slice(0, 12)
    .map((review) => {
      const product = settings.products[Number(review.productIndex)] || {};
      return `
        <div class="admin-subitem" data-review-id="${escapeHtml(review.id)}">
          <strong>${"★".repeat(Number(review.rating || 0))} ${escapeHtml(review.title)}</strong>
          <span>${escapeHtml(product.name || "상품")} · ${escapeHtml(review.author)} · ${new Date(review.createdAt).toLocaleDateString("ko-KR")}</span>
          <p>${escapeHtml(review.body)}</p>
          <div class="admin-inline-actions">
            <button class="button secondary" type="button" data-review-delete>리뷰 삭제</button>
          </div>
        </div>
      `;
    })
    .join("");
}

function renderEmailTemplates() {
  if (!emailTemplateList) return;
  emailTemplateList.innerHTML = emailTemplates
    .map(
      (template, index) => `
        <article class="email-template-card">
          <strong>${escapeHtml(template.title)}</strong>
          <span>${escapeHtml(template.subject)}</span>
          <p>${escapeHtml(template.body)}</p>
          <button class="button secondary" type="button" data-template-copy="${index}">문구 복사</button>
        </article>
      `,
    )
    .join("");
}

function renderOpsChecklist() {
  if (!opsChecklist) return;
  const policyHasPlaceholders = true;
  const commerceStatus = commerceConfigStatus();
  const pendingNotifications = shop?.getNotifications?.().filter((event) => event.status === "pending").length || 0;
  const checks = [
    ["Supabase 연결", shop?.isSupabaseEnabled?.() ? "완료" : "로컬 모드"],
    ["관리자 권한", shop?.isAdmin?.() ? "확인됨" : "확인 필요"],
    ["상품 수", `${settings.products.length}개`],
    ["메인 슬라이드", `${(settings.heroSlides || []).filter((slide) => slide.isActive !== false).length}개`],
    ["재고 주의", `${shop?.getInventory?.().filter((item) => item.isAvailable && Number(item.stockQuantity || 0) <= Number(item.lowStockThreshold || 0)).length || 0}개`],
    ["운영 정책", policyHasPlaceholders ? "사업자 정보 입력 전" : "완료"],
    ["Toss Client Key", commerceStatus.tossClientKey],
    ["이메일 대기열", `${pendingNotifications}건 대기`],
    ["고객센터 이메일", commerceStatus.supportEmail],
    ["도메인", commerceStatus.customDomain],
  ];

  opsChecklist.innerHTML = checks
    .map(
      ([label, value]) => `
        <div class="ops-check">
          <span>${escapeHtml(label)}</span>
          <strong>${escapeHtml(value)}</strong>
        </div>
      `,
    )
    .join("");
}

function downloadOperationalBackup() {
  const payload = {
    exportedAt: new Date().toISOString(),
    settings: collectSettingsSafe(),
    orders: shop?.getOrders?.() || [],
    inventory: shop?.getInventory?.() || [],
    reviews: shop?.getAllReviews?.() || [],
    notifications: shop?.getNotifications?.() || [],
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `veltier-backup-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(link.href);
  if (opsStatus) opsStatus.textContent = "운영 데이터 파일을 생성했습니다.";
}

function renderCustomers() {
  if (!adminCustomerList || !shop?.getOrders) return;

  const customers = new Map();
  shop.getOrders().forEach((order) => {
    const key = order.email || order.phone || order.recipientName || order.id;
    const previous = customers.get(key) || {
      name: order.recipientName || "이름 없음",
      email: order.email || "이메일 없음",
      phone: order.phone || "연락처 없음",
      total: 0,
      orderCount: 0,
      lastOrderAt: order.createdAt,
    };

    previous.total += Number(order.total || 0);
    previous.orderCount += 1;
    previous.lastOrderAt =
      new Date(order.createdAt) > new Date(previous.lastOrderAt) ? order.createdAt : previous.lastOrderAt;
    customers.set(key, previous);
  });

  const rows = [...customers.values()].sort((a, b) => new Date(b.lastOrderAt) - new Date(a.lastOrderAt));

  if (!rows.length) {
    adminCustomerList.innerHTML = `<div class="admin-empty">아직 주문 고객 데이터가 없습니다.</div>`;
    return;
  }

  adminCustomerList.innerHTML = rows
    .slice(0, 20)
    .map(
      (customer) => `
        <article class="customer-card">
          <strong>${escapeHtml(customer.name)}</strong>
          <span>${escapeHtml(customer.email)} · ${escapeHtml(customer.phone)}</span>
          <p>주문 ${customer.orderCount}건 · 누적 ${shop.formatWon(customer.total)} · 최근 ${new Date(customer.lastOrderAt).toLocaleDateString("ko-KR")}</p>
        </article>
      `,
    )
    .join("");
}

function renderOperationPanels() {
  renderAdminOrders();
  renderInventorySelector();
  renderInventoryGrid();
  renderLowStockList();
  renderCustomers();
  renderAdminReviews();
  renderNotifications();
  renderEmailTemplates();
  renderOpsChecklist();
  updateAdminDashboard();
}

function renderAdminAccess(access) {
  const allowed = Boolean(access.allowed);
  const member = access.member || null;
  const role = shop?.currentRole?.() || access.role || "guest";

  adminApp.classList.toggle("is-hidden", !allowed);
  adminSaveButton.hidden = !allowed;
  adminSaveButton.disabled = !allowed;
  adminLoginForm.hidden = allowed || access.reason === "forbidden";
  if (adminGoogleAuthButton) adminGoogleAuthButton.hidden = allowed || !shop?.isSupabaseEnabled();
  adminSignout.hidden = !member;
  adminGate.classList.toggle("is-verified", allowed);

  if (allowed) {
    adminGateCopy.textContent = access.mode === "local"
      ? "Supabase 미연결 로컬 관리자 모드입니다. 실제 배포에서는 Supabase 권한으로 보호됩니다."
      : `${member?.name || member?.email || "관리자"} 계정의 관리자 권한이 확인되었습니다.`;
    setAdminAuthStatus(`현재 권한: ${roleLabel(role)}`, "success");
    return;
  }

  if (access.reason === "forbidden") {
    adminGateCopy.textContent = `${member?.email || "현재 계정"}은 ${roleLabel(role)} 권한입니다. 관리자 페이지는 admin 권한 계정만 열 수 있습니다.`;
    setAdminAuthStatus("Supabase에서 해당 계정의 profiles.role 값을 admin으로 지정해야 합니다.", "warning");
    return;
  }

  adminGateCopy.textContent = "관리자 계정으로 로그인하면 운영 콘솔이 열립니다.";
  setAdminAuthStatus("로그인이 필요합니다.", "neutral");
}

async function resolveAdminAccess() {
  if (!shop) return { allowed: true, mode: "legacy", role: "admin" };

  await shop.init(settings);

  if (!shop.isSupabaseEnabled()) {
    return { allowed: true, mode: "local", member: shop.currentMember(), role: "admin" };
  }

  const member = shop.currentMember();
  if (!member) return { allowed: false, reason: "signed-out", role: "guest" };
  if (!shop.isAdmin()) return { allowed: false, reason: "forbidden", member };
  return { allowed: true, mode: "supabase", member };
}

async function bootAdmin() {
  if (adminBootPromise) return adminBootPromise;

  adminBootPromise = (async () => {
    try {
      const access = await resolveAdminAccess();
      renderAdminAccess(access);

      if (access.allowed) {
        if (shop?.getProductSettings) {
          settings = await shop.getProductSettings(settings, { includeInactive: true });
        }

        if (!adminReady) {
          populate();
          adminReady = true;
        } else {
          updateAdminDashboard();
        }

        renderOperationPanels();
      }
    } catch (error) {
      adminApp.classList.add("is-hidden");
      adminSaveButton.disabled = true;
      adminLoginForm.hidden = false;
      adminSignout.hidden = true;
      adminGateCopy.textContent = "관리자 권한을 확인하지 못했습니다.";
      setAdminAuthStatus(error.message || "다시 로그인해주세요.", "warning");
    } finally {
      adminBootPromise = null;
    }
  })();

  return adminBootPromise;
}

function setField(name, value) {
  if (!form.elements[name]) return;

  if (form.elements[name].type === "checkbox") {
    form.elements[name].checked = Boolean(value);
    return;
  }

  form.elements[name].value = value ?? "";
}

function clampNumber(value, fallback, min, max) {
  const number = Number(value);
  const resolved = Number.isFinite(number) ? number : fallback;
  return Math.min(Math.max(resolved, min), max);
}

function responsiveProfile(sourceSettings, device) {
  const fallback = window.CASEFORM_DEFAULTS.responsive?.[device] || {};
  return {
    ...fallback,
    ...(sourceSettings.responsive?.[device] || {}),
  };
}

function applyHeroMediaVars(sourceSettings) {
  const mediaDarkness = clampNumber(sourceSettings.heroMediaDarkness, 58, 0, 90);
  const mediaFade = clampNumber(sourceSettings.heroMediaFade, 72, 0, 100);
  const transitionDuration = clampNumber(sourceSettings.heroTransitionDuration, 650, 150, 1800);

  document.documentElement.style.setProperty("--hero-media-dim", (mediaDarkness / 100).toFixed(2));
  document.documentElement.style.setProperty("--hero-media-edge", `${(8 + mediaFade * 0.22).toFixed(1)}%`);
  document.documentElement.style.setProperty("--hero-media-backdrop-opacity", (0.24 + mediaFade * 0.004).toFixed(2));
  document.documentElement.style.setProperty("--hero-transition-duration", `${transitionDuration}ms`);
}

function previewMediaBackdropMarkup(product) {
  const kind = productMediaKind(product);

  if (kind === "image") {
    const source = mediaSource(product.image);
    return `<img class="preview-media-backdrop" src="${escapeHtml(source)}" alt="" aria-hidden="true" />`;
  }

  if (kind === "video") {
    const source = mediaSource(product.video);
    return `<video class="preview-media-backdrop preview-media-backdrop-video" src="${escapeHtml(source)}" autoplay muted loop playsinline aria-hidden="true"></video>`;
  }

  return "";
}

function renderProductFields() {
  if (!settings.products.length) {
    productHost.innerHTML = `
      <div class="admin-empty product-admin-empty">
        <strong>등록된 상품이 없습니다.</strong>
        <p>상품 추가를 눌러 실제 판매할 상품명, 가격, 업로드 파일을 등록하세요.</p>
      </div>
    `;
    return;
  }

  productHost.innerHTML = settings.products
    .map(
      (product, index) => `
        <fieldset class="admin-product" data-product-index="${index}">
          <legend>상품 ${index + 1}</legend>
          <div class="product-admin-actions">
            <button class="button secondary" type="button" data-product-action="duplicate" data-product-index="${index}">복제</button>
            <button class="button secondary" type="button" data-product-action="up" data-product-index="${index}">위로</button>
            <button class="button secondary" type="button" data-product-action="down" data-product-index="${index}">아래로</button>
            <button class="button secondary" type="button" data-product-action="delete" data-product-index="${index}">삭제</button>
          </div>
          <label>
            <span>상품명</span>
            <input name="product-${index}-name" type="text" value="${escapeHtml(product.name)}" />
          </label>
          <label>
            <span>소재</span>
            <input name="product-${index}-material" type="text" value="${escapeHtml(product.material)}" />
          </label>
          <label>
            <span>가격</span>
            <input name="product-${index}-price" type="number" min="0" step="1000" value="${escapeHtml(product.price)}" />
          </label>
          <label>
            <span>색상</span>
            <input name="product-${index}-color" type="color" value="${escapeHtml(product.color)}" />
          </label>
          <label class="wide-field">
            <span>설명</span>
            <textarea name="product-${index}-description" rows="2">${escapeHtml(product.description)}</textarea>
          </label>
          <label>
            <span>대표 미디어</span>
            <select name="product-${index}-mediaType">
              <option value="image"${product.mediaType !== "video" ? " selected" : ""}>이미지</option>
              <option value="video"${product.mediaType === "video" ? " selected" : ""}>동영상</option>
            </select>
          </label>
          <label class="admin-toggle wide-field">
            <input name="product-${index}-isActive" type="checkbox"${product.isActive !== false ? " checked" : ""} />
            <span>판매 화면에 노출</span>
          </label>
          <label class="wide-field">
            <span>이미지 경로</span>
            <input name="product-${index}-image" type="text" value="${escapeHtml(product.image)}" placeholder="업로드하면 자동으로 입력됩니다" />
          </label>
          <label>
            <span>이미지/움직이는 이미지</span>
            <input name="product-${index}-imageFile" type="file" accept=".png,.jpg,.jpeg,.webp,.gif,image/png,image/jpeg,image/webp,image/gif,image/*" data-product-index="${index}" data-media-kind="image" />
          </label>
          <label class="wide-field">
            <span>동영상 경로</span>
            <input name="product-${index}-video" type="text" value="${escapeHtml(product.video)}" placeholder="업로드하면 자동으로 입력됩니다" />
          </label>
          <label>
            <span>동영상 파일</span>
            <input name="product-${index}-videoFile" type="file" accept="video/*" data-product-index="${index}" data-media-kind="video" />
          </label>
          <div class="product-preview-row">
            <div class="product-preview-card">
              <span>카드</span>
              <div class="product-visual" data-card-preview="${index}"></div>
            </div>
            <div class="product-preview-detail">
              <span>상세</span>
              <div class="admin-detail-media" data-detail-preview="${index}"></div>
              <a class="button secondary" data-detail-link="${index}" href="product.html?id=${index}" target="_blank" rel="noopener">상세 열기</a>
            </div>
          </div>
        </fieldset>
      `,
    )
    .join("");
}

function heroSlideImageForMode(slide, mode = "desktop") {
  if (!slide) return "";
  const desktopImage = mediaSource(slide.desktopImage);
  const mobileImage = mediaSource(slide.mobileImage);
  return mode === "mobile" ? mobileImage || desktopImage : desktopImage || mobileImage;
}

function heroSlideProductOptions(selectedIndex) {
  if (!settings.products.length) {
    return `<option value="-1" selected disabled>먼저 상품을 추가하세요</option>`;
  }

  return settings.products
    .map((product, index) => {
      const selected = Number(selectedIndex) === index ? " selected" : "";
      return `<option value="${index}"${selected}>${index + 1}. ${escapeHtml(product.name || "상품명 미입력")}</option>`;
    })
    .join("");
}

function createBlankHeroSlide() {
  return {
    id: `hero-slide-${Date.now()}`,
    desktopImage: "",
    mobileImage: "",
    productIndex: 0,
    isActive: true,
  };
}

function renderHeroSlideFields() {
  if (!heroSlideList) return;

  const slides = Array.isArray(settings.heroSlides) ? settings.heroSlides : [];
  if (!slides.length) {
    heroSlideList.innerHTML = `
      <div class="hero-slide-empty">
        <strong>등록된 메인 슬라이드가 없습니다.</strong>
        <p>완성된 PC/모바일 배너 이미지를 준비한 뒤 슬라이드 추가를 눌러 연결 상품을 지정하세요.</p>
      </div>
    `;
    return;
  }

  heroSlideList.innerHTML = slides
    .map((slide, index) => {
      const productIndex = Number(slide.productIndex) || 0;
      const product = settings.products[productIndex] || settings.products[0] || {};
      const thumbSource = heroSlideImageForMode(slide, "desktop");
      const slideName = product.name || "연결 상품 없음";

      return `
        <fieldset class="hero-slide-card" data-hero-slide-card="${index}">
          <legend>슬라이드 ${index + 1}</legend>
          <div class="hero-slide-card-head">
            <div class="hero-slide-thumb">
              ${
                thumbSource
                  ? `<img src="${escapeHtml(thumbSource)}" alt="${escapeHtml(slideName)} 슬라이드 미리보기" />`
                  : "<span>이미지 없음</span>"
              }
            </div>
            <div>
              <strong>${escapeHtml(slideName)}</strong>
              <p>PC와 모바일에 각각 완성 이미지를 넣을 수 있습니다.</p>
            </div>
          </div>
          <div class="hero-slide-fields">
            <label>
              <span>연결 상품</span>
              <select name="hero-slide-${index}-productIndex">
                ${heroSlideProductOptions(productIndex)}
              </select>
            </label>
            <label class="admin-toggle">
              <input name="hero-slide-${index}-isActive" type="checkbox"${slide.isActive !== false ? " checked" : ""} />
              <span>메인에 표시</span>
            </label>
            <label class="wide-field">
              <span>PC 이미지 경로</span>
              <input name="hero-slide-${index}-desktopImage" type="text" value="${escapeHtml(slide.desktopImage)}" placeholder="assets/main-slide-desktop.jpg" />
            </label>
            <label>
              <span>PC 이미지 업로드</span>
              <input name="hero-slide-${index}-desktopFile" type="file" accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp,image/*" data-hero-slide-index="${index}" data-hero-slide-target="desktopImage" />
            </label>
            <label class="wide-field">
              <span>모바일 이미지 경로</span>
              <input name="hero-slide-${index}-mobileImage" type="text" value="${escapeHtml(slide.mobileImage)}" placeholder="assets/main-slide-mobile.jpg" />
            </label>
            <label>
              <span>모바일 이미지 업로드</span>
              <input name="hero-slide-${index}-mobileFile" type="file" accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp,image/*" data-hero-slide-index="${index}" data-hero-slide-target="mobileImage" />
            </label>
          </div>
          <div class="hero-slide-actions">
            <button class="button secondary" type="button" data-hero-slide-action="duplicate" data-hero-slide-index="${index}">복제</button>
            <button class="button secondary" type="button" data-hero-slide-action="up" data-hero-slide-index="${index}">위로</button>
            <button class="button secondary" type="button" data-hero-slide-action="down" data-hero-slide-index="${index}">아래로</button>
            <button class="button secondary" type="button" data-hero-slide-action="delete" data-hero-slide-index="${index}">삭제</button>
          </div>
        </fieldset>
      `;
    })
    .join("");
}

function collectHeroSlides() {
  const slides = Array.isArray(settings.heroSlides) ? settings.heroSlides : [];
  return slides.map((slide, index) => {
    const productIndexField = form.elements[`hero-slide-${index}-productIndex`];
    const desktopImageField = form.elements[`hero-slide-${index}-desktopImage`];
    const mobileImageField = form.elements[`hero-slide-${index}-mobileImage`];
    const activeField = form.elements[`hero-slide-${index}-isActive`];

    const desktopImage = desktopImageField ? desktopImageField.value.trim() : slide.desktopImage || "";
    const mobileImage = mobileImageField ? mobileImageField.value.trim() : slide.mobileImage || desktopImage;
    const productIndex = productIndexField ? Number(productIndexField.value) : Number(slide.productIndex) || 0;

    return {
      id: slide.id || `hero-slide-${index + 1}`,
      desktopImage,
      mobileImage: mobileImage || desktopImage,
      productIndex,
      isActive: activeField ? activeField.checked : slide.isActive !== false,
    };
  });
}

function replaceHeroSlides(nextSlides, message) {
  settings = window.CaseformConfig.mergeSettings(window.CASEFORM_DEFAULTS, {
    ...settings,
    heroSlides: nextSlides,
  });
  window.CaseformConfig.save(settings);
  populate();
  statusText.textContent = message;
}

function handleHeroSlideAction(action, index) {
  syncSettingsFromInputs();
  const slides = [...(settings.heroSlides || [])];
  const slide = slides[index];

  if (action === "add") {
    if (!settings.products.length) {
      statusText.textContent = "메인 슬라이드 연결을 위해 먼저 상품을 추가해주세요.";
      setAdminView("products");
      return;
    }

    replaceHeroSlides([...slides, createBlankHeroSlide()], "메인 슬라이드가 추가되었습니다.");
    return;
  }

  if (!slide) return;

  if (action === "duplicate") {
    slides.splice(index + 1, 0, { ...slide, id: `hero-slide-${Date.now()}`, isActive: true });
    replaceHeroSlides(slides, "메인 슬라이드를 복제했습니다.");
    return;
  }

  if (action === "delete") {
    slides.splice(index, 1);
    replaceHeroSlides(slides, "메인 슬라이드를 삭제했습니다.");
    return;
  }

  if (action === "up" && index > 0) {
    [slides[index - 1], slides[index]] = [slides[index], slides[index - 1]];
    replaceHeroSlides(slides, "메인 슬라이드 순서를 변경했습니다.");
    return;
  }

  if (action === "down" && index < slides.length - 1) {
    [slides[index + 1], slides[index]] = [slides[index], slides[index + 1]];
    replaceHeroSlides(slides, "메인 슬라이드 순서를 변경했습니다.");
  }
}

function syncImagePreset() {
  if (!imagePreset) return;
  const options = [...imagePreset.options].map((option) => option.value);
  imagePreset.value = options.includes(settings.heroImage) ? settings.heroImage : "custom";
}

function updatePreview() {
  const previewSettings = collectSettingsSafe();
  const accent = previewSettings.colors?.accent || settings.colors.accent;
  const accentSoft = previewSettings.colors?.accentSoft || settings.colors.accentSoft;
  const accentWarm = previewSettings.colors?.accentWarm || settings.colors.accentWarm;

  document.documentElement.style.setProperty("--gold", accent);
  document.documentElement.style.setProperty("--accent", accent);
  document.documentElement.style.setProperty("--gold-soft", accentSoft);
  document.documentElement.style.setProperty("--accent-dark", accentSoft);
  document.documentElement.style.setProperty("--gold-dark", accentWarm);

  document.body.classList.toggle("gold-finish", Boolean(previewSettings.goldFinish));
  const previewMode = previewFrame?.dataset.previewMode === "mobile" ? "mobile" : "desktop";
  applyHeroMediaVars(previewSettings);
  const slides = Array.isArray(previewSettings.heroSlides) ? previewSettings.heroSlides : [];
  const previewSlide =
    slides.find((slide) => slide.isActive !== false && heroSlideImageForMode(slide, previewMode)) ||
    slides.find((slide) => heroSlideImageForMode(slide, previewMode)) ||
    null;
  const previewProduct =
    previewSlide && previewSettings.products[Number(previewSlide.productIndex)]
      ? previewSettings.products[Number(previewSlide.productIndex)]
      : previewSettings.products[0];
  const previewImage = heroSlideImageForMode(previewSlide, previewMode);

  if (previewFrame) {
    previewFrame.classList.toggle("is-empty", !previewImage);
  }

  if (previewSlideImage) {
    previewSlideImage.classList.toggle("has-image", Boolean(previewImage));
    previewSlideImage.innerHTML = previewImage
      ? `<img src="${escapeHtml(previewImage)}" alt="${escapeHtml(previewProduct?.name || "메인 슬라이드")}" />`
      : "<span>슬라이드 이미지 없음</span>";
  }

  if (previewSlideProduct) {
    previewSlideProduct.textContent = previewSlide
      ? previewProduct?.name || "연결 상품 없음"
      : "슬라이드를 추가하세요";
  }

  if (previewSlideDevice) {
    previewSlideDevice.textContent = previewMode === "mobile" ? "모바일 미리보기" : "PC 미리보기";
  }

  updateProductPreviews(previewSettings);
}

function updateHomeLinks(sourceSettings = collectSettingsSafe()) {
  const href = window.CaseformConfig.urlFor("index.html", sourceSettings);
  homeLinks.forEach((link) => {
    link.href = href;
  });
}

function collectSettingsSafe() {
  try {
    return window.CaseformConfig.mergeSettings(window.CASEFORM_DEFAULTS, collectSettings());
  } catch (error) {
    return settings;
  }
}

function populate() {
  const desktopProfile = responsiveProfile(settings, "desktop");
  const mobileProfile = responsiveProfile(settings, "mobile");
  setField("brandName", settings.brandName);
  setField("pageTitle", settings.pageTitle);
  setField("googleMapsApiKey", settings.integrations?.googleMapsApiKey || "");
  setField("tossClientKey", settings.integrations?.tossClientKey || window.CASEFORM_PAYMENTS?.tossClientKey || "");
  setField("supportEmail", settings.integrations?.supportEmail || "");
  setField("customDomain", settings.integrations?.customDomain || "");
  setField("heroTitle", settings.heroTitle);
  setField("heroSubtitle", settings.heroSubtitle);
  setField("heroSpecs", settings.heroSpecs.join(", "));
  setField("heroSlideInterval", settings.heroSlideInterval);
  setField("heroTransitionDuration", settings.heroTransitionDuration);
  setField("heroMediaMode", settings.heroMediaMode);
  setField("heroMediaDarkness", settings.heroMediaDarkness);
  setField("heroMediaFade", settings.heroMediaFade);
  setField("desktopHeroLayout", desktopProfile.heroLayout);
  setField("desktopHeroTextAlign", desktopProfile.heroTextAlign);
  setField("desktopHeroMediaScale", desktopProfile.heroMediaScale);
  setField("desktopProductPreviewCount", desktopProfile.productPreviewCount);
  setField("mobileHeroLayout", mobileProfile.heroLayout);
  setField("mobileHeroTextAlign", mobileProfile.heroTextAlign);
  setField("mobileHeroMediaScale", mobileProfile.heroMediaScale);
  setField("mobileProductPreviewCount", mobileProfile.productPreviewCount);
  setField("heroImage", settings.heroImage);
  setField("goldFinish", settings.goldFinish);
  setField("accent", settings.colors.accent);
  setField("accentSoft", settings.colors.accentSoft);
  setField("accentWarm", settings.colors.accentWarm);
  setField("primaryCta", settings.primaryCta);
  setField("secondaryCta", settings.secondaryCta);
  setField("collectionTitle", settings.collectionTitle);
  renderProductFields();
  renderHeroSlideFields();
  syncImagePreset();
  updatePreview();
  updateHomeLinks(settings);
  updateAdminDashboard();
}

function collectProducts() {
  return settings.products.map((product, index) => ({
    name: form.elements[`product-${index}-name`].value.trim() || product.name,
    material: form.elements[`product-${index}-material`].value.trim() || product.material,
    price: Number(form.elements[`product-${index}-price`].value) || product.price,
    color: form.elements[`product-${index}-color`].value || product.color,
    mediaType: form.elements[`product-${index}-mediaType`].value === "video" ? "video" : "image",
    image: form.elements[`product-${index}-image`].value.trim(),
    video: form.elements[`product-${index}-video`].value.trim(),
    showInHero: false,
    isActive: form.elements[`product-${index}-isActive`].checked,
    description:
      form.elements[`product-${index}-description`].value.trim() || product.description,
  }));
}

function createBlankProduct() {
  return {
    name: `New Product ${settings.products.length + 1}`,
    material: "",
    color: "#f3eadb",
    price: 0,
    mediaType: "image",
    image: "",
    video: "",
    showInHero: false,
    isActive: true,
    description: "",
  };
}

function syncSettingsFromInputs() {
  settings = window.CaseformConfig.mergeSettings(window.CASEFORM_DEFAULTS, collectSettingsSafe());
  window.CaseformConfig.save(settings);
}

function replaceProducts(nextProducts, message) {
  settings = { ...settings, products: nextProducts };
  window.CaseformConfig.save(settings);
  populate();
  renderOperationPanels();
  statusText.textContent = message;
}

function handleProductAction(action, index) {
  syncSettingsFromInputs();
  const products = [...settings.products];
  const product = products[index];
  if (!product) return;

  if (action === "duplicate") {
    products.splice(index + 1, 0, { ...product, name: `${product.name} Copy`, showInHero: false, isActive: false });
    replaceProducts(products, "상품을 복제했습니다.");
    return;
  }

  if (action === "delete") {
    products.splice(index, 1);
    replaceProducts(products, "상품을 삭제했습니다. 설정 저장을 누르면 Supabase에 반영됩니다.");
    return;
  }

  if (action === "up" && index > 0) {
    [products[index - 1], products[index]] = [products[index], products[index - 1]];
    replaceProducts(products, "상품 순서를 변경했습니다.");
    return;
  }

  if (action === "down" && index < products.length - 1) {
    [products[index + 1], products[index]] = [products[index], products[index + 1]];
    replaceProducts(products, "상품 순서를 변경했습니다.");
  }
}

function updateProductPreviews(sourceSettings = collectSettingsSafe()) {
  sourceSettings.products.forEach((product, index) => {
    const cardPreview = document.querySelector(`[data-card-preview="${index}"]`);
    const detailPreview = document.querySelector(`[data-detail-preview="${index}"]`);
    const detailLink = document.querySelector(`[data-detail-link="${index}"]`);

    if (cardPreview) {
      cardPreview.classList.toggle("has-product-media", productHasMedia(product));
      cardPreview.innerHTML = productMediaMarkup(product, {
        mediaClass: "product-media product-card-media",
      });
    }

    if (detailPreview) {
      detailPreview.classList.toggle("has-product-media", productHasMedia(product));
      detailPreview.innerHTML = productMediaMarkup(product, {
        mediaClass: "product-media admin-detail-product-media",
        caseClass: "product-case",
      });
    }

    if (detailLink) {
      detailLink.href = window.CaseformConfig.urlFor("product.html", sourceSettings, {
        id: String(index),
      });
    }
  });
}

function collectResponsiveProfile(device) {
  const prefix = device === "mobile" ? "mobile" : "desktop";
  const fallback = responsiveProfile(settings, device);
  return {
    heroLayout: form.elements[`${prefix}HeroLayout`]?.value || fallback.heroLayout,
    heroTextAlign: form.elements[`${prefix}HeroTextAlign`]?.value || fallback.heroTextAlign,
    heroMediaScale: Number(form.elements[`${prefix}HeroMediaScale`]?.value) || fallback.heroMediaScale,
    productPreviewCount:
      Number(form.elements[`${prefix}ProductPreviewCount`]?.value) || fallback.productPreviewCount,
  };
}

function collectSettings() {
  const heroSpecs = form.elements.heroSpecs
    ? form.elements.heroSpecs.value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    : settings.heroSpecs;

  return {
    ...settings,
    brandName: form.elements.brandName?.value.trim() || settings.brandName,
    pageTitle: form.elements.pageTitle?.value.trim() || settings.pageTitle,
    heroImage: form.elements.heroImage ? form.elements.heroImage.value.trim() : settings.heroImage,
    heroSlides: collectHeroSlides(),
    goldFinish: form.elements.goldFinish ? form.elements.goldFinish.checked : settings.goldFinish,
    colors: {
      accent: form.elements.accent?.value || settings.colors.accent,
      accentSoft: form.elements.accentSoft?.value || settings.colors.accentSoft,
      accentWarm: form.elements.accentWarm?.value || settings.colors.accentWarm,
    },
    integrations: {
      googleMapsApiKey: form.elements.googleMapsApiKey?.value.trim() || "",
      tossClientKey: form.elements.tossClientKey?.value.trim() || "",
      supportEmail: form.elements.supportEmail?.value.trim() || "",
      customDomain: form.elements.customDomain?.value.trim() || "",
    },
    responsive: {
      desktop: collectResponsiveProfile("desktop"),
      mobile: collectResponsiveProfile("mobile"),
    },
    heroEyebrow: settings.heroEyebrow,
    heroTitle: form.elements.heroTitle ? form.elements.heroTitle.value.trim() : settings.heroTitle,
    heroSubtitle: form.elements.heroSubtitle
      ? form.elements.heroSubtitle.value.trim()
      : settings.heroSubtitle,
    heroSpecs,
    heroSlideInterval: Number(form.elements.heroSlideInterval?.value) || settings.heroSlideInterval,
    heroTransitionDuration: form.elements.heroTransitionDuration
      ? Number(form.elements.heroTransitionDuration.value)
      : settings.heroTransitionDuration,
    heroMediaMode: form.elements.heroMediaMode ? form.elements.heroMediaMode.value : settings.heroMediaMode,
    heroMediaDarkness: form.elements.heroMediaDarkness
      ? Number(form.elements.heroMediaDarkness.value)
      : settings.heroMediaDarkness,
    heroMediaFade: form.elements.heroMediaFade
      ? Number(form.elements.heroMediaFade.value)
      : settings.heroMediaFade,
    primaryCta: form.elements.primaryCta?.value.trim() || settings.primaryCta,
    secondaryCta: form.elements.secondaryCta?.value.trim() || settings.secondaryCta,
    priceNote: settings.priceNote,
    collectionTitle: form.elements.collectionTitle?.value.trim() || settings.collectionTitle,
    products: collectProducts(),
  };
}

function inferImageType(file) {
  if (file.type && file.type.startsWith("image/")) return file.type;

  const extension = file.name.split(".").pop().toLowerCase();
  const types = {
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    webp: "image/webp",
    gif: "image/gif",
  };

  return types[extension] || "image/png";
}

function normalizeDataUrl(file, result, mediaKind) {
  const value = String(result || "");
  if (!value.startsWith("data:")) return value;

  if (mediaKind === "image" && value.startsWith("data:;base64,")) {
    return value.replace("data:;base64,", `data:${inferImageType(file)};base64,`);
  }

  return value;
}

function shouldPreserveImageFile(file) {
  const name = String(file?.name || "").toLowerCase();
  const type = String(file?.type || "").toLowerCase();
  return type === "image/gif" || type === "image/webp" || /\.(gif|webp)$/.test(name);
}

async function localImageValue(file, result) {
  const normalized = normalizeDataUrl(file, result, "image");
  return shouldPreserveImageFile(file) ? normalized : optimizeImageDataUrl(file, normalized);
}

function optimizeImageDataUrl(file, dataUrl) {
  return new Promise((resolve) => {
    const image = new Image();

    image.addEventListener("load", () => {
      const scale = Math.min(1, MAX_IMAGE_SIZE / Math.max(image.naturalWidth, image.naturalHeight));
      if (scale === 1 && dataUrl.length < 900000) {
        resolve(dataUrl);
        return;
      }

      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      const context = canvas.getContext("2d");
      context.drawImage(image, 0, 0, canvas.width, canvas.height);

      const webp = canvas.toDataURL("image/webp", IMAGE_QUALITY);
      if (webp.startsWith("data:image/webp")) {
        resolve(webp);
        return;
      }

      resolve(canvas.toDataURL(inferImageType(file)));
    });

    image.addEventListener("error", () => resolve(dataUrl));
    image.src = dataUrl;
  });
}

function saveMediaDraft() {
  const draft = window.CaseformConfig.mergeSettings(window.CASEFORM_DEFAULTS, collectSettings());

  try {
    window.CaseformConfig.save(draft);
    settings = draft;
    renderHeroSlideFields();
    updateHomeLinks(draft);
    updateProductPreviews(draft);
    updateAdminDashboard();
    statusText.textContent = "파일 등록됨";
  } catch (error) {
    console.warn("VELTIER media could not be saved.", error);
    updateProductPreviews(draft);
    statusText.textContent = "이미지 용량이 큼";
  }
}

function readProductFile(input) {
  const file = input.files && input.files[0];
  if (!file) return;

  const index = input.dataset.productIndex;
  const mediaKind = input.dataset.mediaKind;
  const targetField = form.elements[`product-${index}-${mediaKind}`];
  const mediaTypeField = form.elements[`product-${index}-mediaType`];
  const reader = new FileReader();

  statusText.textContent = mediaKind === "image" ? "이미지 읽는 중" : "영상 읽는 중";

  reader.addEventListener("load", async () => {
    try {
      if (shop?.isSupabaseEnabled() && shop.isAdmin()) {
        statusText.textContent = mediaKind === "image" ? "이미지 업로드 중" : "영상 업로드 중";
        targetField.value = await shop.uploadProductMedia(file, {
          productIndex: index,
          mediaKind,
        });
      } else {
        const normalized = normalizeDataUrl(file, reader.result, mediaKind);
        targetField.value =
          mediaKind === "image" ? await localImageValue(file, reader.result) : normalized;
      }

      mediaTypeField.value = mediaKind;
      updatePreview();
      saveMediaDraft();
    } catch (error) {
      const normalized = normalizeDataUrl(file, reader.result, mediaKind);
      targetField.value =
        mediaKind === "image" ? await localImageValue(file, reader.result) : normalized;
      mediaTypeField.value = mediaKind;
      updatePreview();
      statusText.textContent = error.message || "업로드 실패";
    }
  });

  reader.addEventListener("error", () => {
    statusText.textContent = "파일 읽기 실패";
  });

  reader.readAsDataURL(file);
}

function readHeroSlideFile(input) {
  const file = input.files && input.files[0];
  if (!file) return;

  const index = Number(input.dataset.heroSlideIndex);
  const target = input.dataset.heroSlideTarget === "mobileImage" ? "mobileImage" : "desktopImage";
  const targetField = form.elements[`hero-slide-${index}-${target}`];
  const productIndex = Number(form.elements[`hero-slide-${index}-productIndex`]?.value) || 0;
  const reader = new FileReader();

  if (!targetField) return;
  statusText.textContent = "슬라이드 이미지를 읽는 중입니다.";

  reader.addEventListener("load", async () => {
    try {
      if (shop?.isSupabaseEnabled() && shop.isAdmin()) {
        statusText.textContent = "슬라이드 이미지를 업로드하는 중입니다.";
        targetField.value = await shop.uploadProductMedia(file, {
          productIndex,
          mediaKind: "hero-slide",
        });
      } else {
        targetField.value = await localImageValue(file, reader.result);
      }

      updatePreview();
      saveMediaDraft();
    } catch (error) {
      targetField.value = await localImageValue(file, reader.result);
      updatePreview();
      statusText.textContent = error.message || "슬라이드 이미지 업로드에 실패했습니다.";
    }
  });

  reader.addEventListener("error", () => {
    statusText.textContent = "슬라이드 이미지 파일을 읽지 못했습니다.";
  });

  reader.readAsDataURL(file);
}

setAdminView(initialAdminView(), { updateHash: false });
setUiDevicePanel("desktop", { syncPreview: false });
setPreviewMode(previewFrame?.dataset.previewMode || "desktop", { refresh: false });
bootAdmin();

adminMenuButtons.forEach((button) => {
  button.addEventListener("click", () => setAdminView(button.dataset.adminView));
});

previewModeButtons.forEach((button) => {
  button.addEventListener("click", () => setPreviewMode(button.dataset.previewMode));
});

uiDeviceTabButtons.forEach((button) => {
  button.addEventListener("click", () => setUiDevicePanel(button.dataset.uiDeviceTab));
});

window.addEventListener("hashchange", () => {
  setAdminView(initialAdminView(), { updateHash: false });
});

adminLoginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!shop) return;

  setAdminAuthStatus("로그인 중입니다.", "neutral");

  try {
    await shop.signIn(Object.fromEntries(new FormData(adminLoginForm)));
    adminLoginForm.reset();
    adminReady = false;
    await bootAdmin();
  } catch (error) {
    setAdminAuthStatus(error.message || "로그인 정보를 확인해주세요.", "warning");
  }
});

if (adminGoogleAuthButton) {
  adminGoogleAuthButton.addEventListener("click", async () => {
    if (!shop) return;

    setAdminAuthStatus("Google 로그인 화면으로 이동합니다.", "neutral");
    adminGoogleAuthButton.disabled = true;

    try {
      await shop.signInWithGoogle();
    } catch (error) {
      adminGoogleAuthButton.disabled = false;
      setAdminAuthStatus(error.message || "Google 로그인을 시작하지 못했습니다.", "warning");
    }
  });
}

adminSignout.addEventListener("click", async () => {
  if (!shop) return;
  await shop.signOut();
  adminReady = false;
  await bootAdmin();
});

form.addEventListener("input", () => {
  statusText.textContent = "수정 중";
  updatePreview();
  updateHomeLinks();
});

if (imagePreset) {
  imagePreset.addEventListener("change", () => {
    if (imagePreset.value !== "custom") {
      form.elements.heroImage.value = imagePreset.value;
      statusText.textContent = "수정 중";
      updatePreview();
      updateHomeLinks();
    }
  });
}

productHost.addEventListener("change", (event) => {
  if (event.target.matches('input[type="file"][data-product-index]')) {
    readProductFile(event.target);
    return;
  }

  statusText.textContent = "수정 중";
  updatePreview();
  updateHomeLinks();
});

productHost.addEventListener("click", (event) => {
  const actionButton = event.target.closest("[data-product-action]");
  if (!actionButton) return;
  handleProductAction(actionButton.dataset.productAction, Number(actionButton.dataset.productIndex));
});

if (heroSlideAddButton) {
  heroSlideAddButton.addEventListener("click", () => handleHeroSlideAction("add", -1));
}

if (heroSlideList) {
  heroSlideList.addEventListener("change", (event) => {
    if (event.target.matches('input[type="file"][data-hero-slide-index]')) {
      readHeroSlideFile(event.target);
      return;
    }

    statusText.textContent = "수정 중";
    updatePreview();
    updateHomeLinks();
  });

  heroSlideList.addEventListener("click", (event) => {
    const actionButton = event.target.closest("[data-hero-slide-action]");
    if (!actionButton) return;
    handleHeroSlideAction(actionButton.dataset.heroSlideAction, Number(actionButton.dataset.heroSlideIndex));
  });
}

if (productAddButton) {
  productAddButton.addEventListener("click", () => {
    syncSettingsFromInputs();
    replaceProducts([...settings.products, createBlankProduct()], "새 상품을 추가했습니다. 상품 파일을 업로드해주세요.");
  });
}

if (productSaveDraftButton) {
  productSaveDraftButton.addEventListener("click", () => {
    syncSettingsFromInputs();
    populate();
    statusText.textContent = "현재 입력을 임시 저장했습니다.";
  });
}

if (productClearButton) {
  productClearButton.addEventListener("click", () => {
    settings = { ...settings, products: [] };
    window.CaseformConfig.save(settings);
    populate();
    renderOperationPanels();
    statusText.textContent = "상품 목록을 비웠습니다. 설정 저장을 누르면 Supabase에도 반영됩니다.";
  });
}

if (adminOrderFilter) {
  adminOrderFilter.addEventListener("change", renderAdminOrders);
}

if (adminRefreshOrders) {
  adminRefreshOrders.addEventListener("click", async () => {
    setAdminAuthStatus("주문을 다시 불러오는 중입니다.", "neutral");
    await bootAdmin();
  });
}

if (adminOrders) {
  adminOrders.addEventListener("click", async (event) => {
    const saveButton = event.target.closest("[data-order-save]");
    if (!saveButton || !shop) return;

    const card = saveButton.closest("[data-order-id]");
    const orderId = card.dataset.orderId;
    const fields = {};
    card.querySelectorAll("[data-order-field]").forEach((field) => {
      fields[field.dataset.orderField] = field.value;
    });

    saveButton.disabled = true;
    saveButton.textContent = "저장 중";
    try {
      await shop.updateOrder(orderId, fields);
      setAdminAuthStatus("주문 상태가 저장되었습니다.", "success");
      renderOperationPanels();
    } catch (error) {
      setAdminAuthStatus(error.message || "주문 저장에 실패했습니다.", "warning");
    } finally {
      saveButton.disabled = false;
      saveButton.textContent = "주문 저장";
    }
  });
}

if (adminReviewList) {
  adminReviewList.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-review-delete]");
    if (!button || !shop) return;
    const item = button.closest("[data-review-id]");

    button.disabled = true;
    button.textContent = "삭제 중";
    try {
      await shop.deleteReview(item.dataset.reviewId);
      setAdminAuthStatus("리뷰를 삭제했습니다.", "success");
      renderOperationPanels();
    } catch (error) {
      setAdminAuthStatus(error.message || "리뷰 삭제에 실패했습니다.", "warning");
      button.disabled = false;
      button.textContent = "리뷰 삭제";
    }
  });
}

if (notificationList) {
  notificationList.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-notification-status]");
    if (!button || !shop?.updateNotificationStatus) return;
    const item = button.closest("[data-notification-id]");

    button.disabled = true;
    try {
      await shop.updateNotificationStatus(item.dataset.notificationId, button.dataset.notificationStatus);
      setAdminAuthStatus("알림 상태를 변경했습니다.", "success");
      renderOperationPanels();
    } catch (error) {
      setAdminAuthStatus(error.message || "알림 상태 변경에 실패했습니다.", "warning");
      button.disabled = false;
    }
  });
}

if (notificationSendButton) {
  notificationSendButton.addEventListener("click", async () => {
    if (!shop?.invokeFunction) return;
    notificationSendButton.disabled = true;
    notificationSendButton.textContent = "발송 시도 중";
    try {
      const result = await shop.invokeFunction("send-notification-email", { limit: 10 });
      await shop.refresh(settings);
      renderOperationPanels();
      opsStatus.textContent = `이메일 ${Number(result.sent || 0)}건을 발송 처리했습니다.`;
    } catch (error) {
      opsStatus.textContent = error.message || "이메일 자동 발송을 실행하지 못했습니다.";
    } finally {
      notificationSendButton.disabled = false;
      notificationSendButton.textContent = "자동 발송 시도";
    }
  });
}

if (emailTemplateList) {
  emailTemplateList.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-template-copy]");
    if (!button) return;
    const template = emailTemplates[Number(button.dataset.templateCopy)];
    const text = `제목: ${template.subject}\n\n${template.body}`;

    try {
      await navigator.clipboard.writeText(text);
      button.textContent = "복사됨";
      setTimeout(() => {
        button.textContent = "문구 복사";
      }, 1400);
    } catch (error) {
      setAdminAuthStatus("브라우저에서 복사를 허용하지 않았습니다. 문구를 직접 선택해주세요.", "warning");
    }
  });
}

if (adminExportButton) {
  adminExportButton.addEventListener("click", downloadOperationalBackup);
}

if (inventoryProductSelect) {
  inventoryProductSelect.addEventListener("change", renderInventoryGrid);
}

if (inventorySeedButton) {
  inventorySeedButton.addEventListener("click", seedInventoryRows);
}

if (inventorySaveButton) {
  inventorySaveButton.addEventListener("click", async () => {
    if (!shop) return;
    inventorySaveButton.disabled = true;
    inventoryStatus.textContent = "재고를 저장하는 중입니다.";
    try {
      await shop.saveInventory(selectedInventoryIndex(), collectInventoryRows());
      inventoryStatus.textContent = "재고가 저장되었습니다.";
      renderOperationPanels();
    } catch (error) {
      inventoryStatus.textContent =
        error.message || "재고 저장에 실패했습니다. Supabase 확장 SQL을 먼저 실행했는지 확인해주세요.";
    } finally {
      inventorySaveButton.disabled = false;
    }
  });
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  settings = window.CaseformConfig.mergeSettings(window.CASEFORM_DEFAULTS, collectSettings());
  try {
    window.CaseformConfig.save(settings);
    if (shop?.isSupabaseEnabled() && shop.isAdmin()) {
      statusText.textContent = "Supabase에 저장 중";
      settings = { ...settings, products: await shop.saveProducts(settings.products) };
      window.CaseformConfig.save(settings);
    }
    updateHomeLinks(settings);
    updateProductPreviews(settings);
    updateAdminDashboard();
    statusText.textContent = shop?.isSupabaseEnabled() ? "Supabase 저장됨" : "저장됨";
  } catch (error) {
    console.warn("VELTIER settings could not be saved.", error);
    statusText.textContent = error.message || "저장 실패";
  }
});

resetButton.addEventListener("click", () => {
  settings = window.CaseformConfig.reset();
  populate();
  statusText.textContent = "초기화됨";
});

window.addEventListener("caseform:shop-updated", () => {
  bootAdmin();
});
