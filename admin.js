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
const emailTemplateList = document.querySelector("#email-template-list");
const opsChecklist = document.querySelector("#ops-checklist");
const opsStatus = document.querySelector("#ops-status");
const adminExportButton = document.querySelector("#admin-export-button");
const productAddButton = document.querySelector("#product-add-button");
const productSaveDraftButton = document.querySelector("#product-save-draft-button");
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

function setAdminAuthStatus(message, tone = "neutral") {
  if (!adminAuthStatus) return;
  adminAuthStatus.textContent = message;
  adminAuthStatus.dataset.tone = tone;
}

function updateAdminDashboard() {
  const heroProducts = settings.products.filter((product) => product.showInHero);
  const inventory = shop?.getInventory?.() || [];
  const lowStockItems = inventory.filter(
    (item) => item.isAvailable && Number(item.stockQuantity || 0) <= Number(item.lowStockThreshold || 0),
  );
  if (adminProductCount) adminProductCount.textContent = String(settings.products.length);
  if (adminHeroCount) adminHeroCount.textContent = String(heroProducts.length);
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
            <span>${escapeHtml([order.postalCode, order.address1, order.address2].filter(Boolean).join(" "))}</span>
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
  const checks = [
    ["Supabase 연결", shop?.isSupabaseEnabled?.() ? "완료" : "로컬 모드"],
    ["관리자 권한", shop?.isAdmin?.() ? "확인됨" : "확인 필요"],
    ["상품 수", `${settings.products.length}개`],
    ["메인 노출", `${settings.products.filter((product) => product.showInHero).length}개`],
    ["재고 주의", `${shop?.getInventory?.().filter((item) => item.isAvailable && Number(item.stockQuantity || 0) <= Number(item.lowStockThreshold || 0)).length || 0}개`],
    ["운영 정책", policyHasPlaceholders ? "사업자 정보 입력 전" : "완료"],
    ["PG 연결", "나중에 진행"],
    ["이메일 자동발송", "템플릿 준비됨"],
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

function renderOperationPanels() {
  renderAdminOrders();
  renderInventorySelector();
  renderInventoryGrid();
  renderLowStockList();
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
          settings = await shop.getProductSettings(settings);
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
            <input name="product-${index}-showInHero" type="checkbox"${product.showInHero ? " checked" : ""} />
            <span>메인 상품 슬라이드에 표시</span>
          </label>
          <label class="admin-toggle wide-field">
            <input name="product-${index}-isActive" type="checkbox"${product.isActive !== false ? " checked" : ""} />
            <span>판매 화면에 노출</span>
          </label>
          <label class="wide-field">
            <span>이미지 경로</span>
            <input name="product-${index}-image" type="text" value="${escapeHtml(product.image)}" placeholder="assets/product.png" />
          </label>
          <label>
            <span>이미지 파일</span>
            <input name="product-${index}-imageFile" type="file" accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp,image/*" data-product-index="${index}" data-media-kind="image" />
          </label>
          <label class="wide-field">
            <span>동영상 경로</span>
            <input name="product-${index}-video" type="text" value="${escapeHtml(product.video)}" placeholder="assets/product.mp4" />
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

function syncImagePreset() {
  if (!imagePreset) return;
  const options = [...imagePreset.options].map((option) => option.value);
  imagePreset.value = options.includes(settings.heroImage) ? settings.heroImage : "custom";
}

function updatePreview() {
  const accent = form.elements.accent.value;
  const accentSoft = form.elements.accentSoft.value;
  const accentWarm = form.elements.accentWarm.value;

  document.documentElement.style.setProperty("--gold", accent);
  document.documentElement.style.setProperty("--accent", accent);
  document.documentElement.style.setProperty("--gold-soft", accentSoft);
  document.documentElement.style.setProperty("--accent-dark", accentSoft);
  document.documentElement.style.setProperty("--gold-dark", accentWarm);

  document.body.classList.toggle("gold-finish", form.elements.goldFinish.checked);
  const previewSettings = collectSettingsSafe();
  applyHeroMediaVars(previewSettings);
  const previewProduct =
    previewSettings.products.find((product) => product.showInHero) || previewSettings.products[0];
  const previewPhoto = document.querySelector("#preview-photo");
  document.querySelector("#preview-title-text").textContent = previewProduct.name;
  document.querySelector("#preview-subtitle").textContent = previewProduct.description;
  previewPhoto.dataset.mediaMode = previewSettings.heroMediaMode || "blend";
  previewPhoto.classList.toggle("has-product-media", productHasMedia(previewProduct));
  previewPhoto.innerHTML = `
    ${previewMediaBackdropMarkup(previewProduct)}
    <span></span>
    ${productMediaMarkup(previewProduct, {
      mediaClass: "product-media preview-product-media",
      caseClass: "preview-product-case",
    })}
  `;
  updateProductPreviews();
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
  setField("brandName", settings.brandName);
  setField("pageTitle", settings.pageTitle);
  setField("heroTitle", settings.heroTitle);
  setField("heroSubtitle", settings.heroSubtitle);
  setField("heroSpecs", settings.heroSpecs.join(", "));
  setField("heroSlideInterval", settings.heroSlideInterval);
  setField("heroTransitionDuration", settings.heroTransitionDuration);
  setField("heroMediaMode", settings.heroMediaMode);
  setField("heroMediaDarkness", settings.heroMediaDarkness);
  setField("heroMediaFade", settings.heroMediaFade);
  setField("heroImage", settings.heroImage);
  setField("goldFinish", settings.goldFinish);
  setField("accent", settings.colors.accent);
  setField("accentSoft", settings.colors.accentSoft);
  setField("accentWarm", settings.colors.accentWarm);
  setField("primaryCta", settings.primaryCta);
  setField("secondaryCta", settings.secondaryCta);
  setField("collectionTitle", settings.collectionTitle);
  renderProductFields();
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
    showInHero: form.elements[`product-${index}-showInHero`].checked,
    isActive: form.elements[`product-${index}-isActive`].checked,
    description:
      form.elements[`product-${index}-description`].value.trim() || product.description,
  }));
}

function createBlankProduct() {
  return {
    name: `New Case ${settings.products.length + 1}`,
    material: "소재 입력",
    color: "#f3eadb",
    price: 39000,
    mediaType: "image",
    image: "",
    video: "",
    showInHero: false,
    isActive: false,
    description: "새 상품 설명을 입력하세요.",
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
    if (products.length <= 1) {
      statusText.textContent = "상품은 최소 1개가 필요합니다.";
      return;
    }
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

function collectSettings() {
  const heroSpecs = form.elements.heroSpecs
    ? form.elements.heroSpecs.value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    : settings.heroSpecs;

  return {
    ...settings,
    brandName: form.elements.brandName.value.trim(),
    pageTitle: form.elements.pageTitle.value.trim(),
    heroImage: form.elements.heroImage ? form.elements.heroImage.value.trim() : settings.heroImage,
    goldFinish: form.elements.goldFinish.checked,
    colors: {
      accent: form.elements.accent.value,
      accentSoft: form.elements.accentSoft.value,
      accentWarm: form.elements.accentWarm.value,
    },
    heroEyebrow: settings.heroEyebrow,
    heroTitle: form.elements.heroTitle ? form.elements.heroTitle.value.trim() : settings.heroTitle,
    heroSubtitle: form.elements.heroSubtitle
      ? form.elements.heroSubtitle.value.trim()
      : settings.heroSubtitle,
    heroSpecs,
    heroSlideInterval: Number(form.elements.heroSlideInterval.value) || settings.heroSlideInterval,
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
    primaryCta: form.elements.primaryCta.value.trim(),
    secondaryCta: form.elements.secondaryCta.value.trim(),
    priceNote: settings.priceNote,
    collectionTitle: form.elements.collectionTitle.value.trim(),
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
          mediaKind === "image" ? await optimizeImageDataUrl(file, normalized) : normalized;
      }

      mediaTypeField.value = mediaKind;
      updatePreview();
      saveMediaDraft();
    } catch (error) {
      const normalized = normalizeDataUrl(file, reader.result, mediaKind);
      targetField.value =
        mediaKind === "image" ? await optimizeImageDataUrl(file, normalized) : normalized;
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

bootAdmin();

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

if (productAddButton) {
  productAddButton.addEventListener("click", () => {
    syncSettingsFromInputs();
    replaceProducts([...settings.products, createBlankProduct()], "새 상품을 추가했습니다.");
  });
}

if (productSaveDraftButton) {
  productSaveDraftButton.addEventListener("click", () => {
    syncSettingsFromInputs();
    populate();
    statusText.textContent = "현재 입력을 임시 저장했습니다.";
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
