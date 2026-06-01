const form = document.querySelector("#settings-form");
const productHost = document.querySelector("#admin-products");
const statusText = document.querySelector("#save-status");
const resetButton = document.querySelector("#reset-button");
const adminGate = document.querySelector("#admin-gate");
const adminApp = document.querySelector("#admin-app");
const adminLoginForm = document.querySelector("#admin-login-form");
const adminGateCopy = document.querySelector("#admin-gate-copy");
const adminAuthStatus = document.querySelector("#admin-auth-status");
const adminSignout = document.querySelector("#admin-signout");
const adminSaveButton = document.querySelector("#admin-save-button");
const adminProductCount = document.querySelector("#admin-product-count");
const adminHeroCount = document.querySelector("#admin-hero-count");
const adminReviewMode = document.querySelector("#admin-review-mode");
const adminRoleName = document.querySelector("#admin-role-name");
const imagePreset = form.elements.heroImagePreset || null;
const homeLinks = [...document.querySelectorAll('a[href="index.html"]')];
const { escapeHtml, mediaSource, productHasMedia, productMediaKind, productMediaMarkup } = window.CaseformConfig;
const shop = window.CaseformShop || null;
const MAX_IMAGE_SIZE = 1400;
const IMAGE_QUALITY = 0.82;

let settings = window.CaseformConfig.load();
let adminReady = false;
let adminBootPromise = null;

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
  if (adminProductCount) adminProductCount.textContent = String(settings.products.length);
  if (adminHeroCount) adminHeroCount.textContent = String(heroProducts.length);
  if (adminReviewMode) adminReviewMode.textContent = shop?.isSupabaseEnabled() ? "Supabase" : "Local";
  if (adminRoleName) adminRoleName.textContent = roleLabel(shop?.currentRole?.() || "admin");
}

function renderAdminAccess(access) {
  const allowed = Boolean(access.allowed);
  const member = access.member || null;
  const role = shop?.currentRole?.() || access.role || "guest";

  adminApp.classList.toggle("is-hidden", !allowed);
  adminSaveButton.hidden = !allowed;
  adminSaveButton.disabled = !allowed;
  adminLoginForm.hidden = allowed || access.reason === "forbidden";
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
        if (!adminReady) {
          populate();
          adminReady = true;
        } else {
          updateAdminDashboard();
        }
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
    description:
      form.elements[`product-${index}-description`].value.trim() || product.description,
  }));
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
    console.warn("Caseform media could not be saved.", error);
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
    const normalized = normalizeDataUrl(file, reader.result, mediaKind);
    targetField.value =
      mediaKind === "image" ? await optimizeImageDataUrl(file, normalized) : normalized;
    mediaTypeField.value = mediaKind;
    updatePreview();
    saveMediaDraft();
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

form.addEventListener("submit", (event) => {
  event.preventDefault();
  settings = window.CaseformConfig.mergeSettings(window.CASEFORM_DEFAULTS, collectSettings());
  try {
    window.CaseformConfig.save(settings);
    updateHomeLinks(settings);
    updateProductPreviews(settings);
    updateAdminDashboard();
    statusText.textContent = "저장됨";
  } catch (error) {
    console.warn("Caseform settings could not be saved.", error);
    statusText.textContent = "저장 공간 부족";
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
