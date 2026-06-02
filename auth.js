let settings = window.CaseformConfig.load();

const shop = window.CaseformShop;
const siteHeader = document.querySelector(".site-header");
const mobileMenuButton = document.querySelector("#mobile-menu-button");
const otpForm = document.querySelector("#otp-form");
const loginForm = document.querySelector("#login-form");
const signupForm = document.querySelector("#signup-form");
const authStatus = document.querySelector("#auth-status");
const providerButtons = [...document.querySelectorAll("[data-oauth-provider]")];

function pageUrl(page, params) {
  return window.CaseformConfig.urlFor(page, settings, params);
}

function nextUrl() {
  const fallback = new URL(pageUrl("account.html"), window.location.href);
  const rawNext = new URLSearchParams(window.location.search).get("next");
  if (!rawNext) return fallback.href;

  try {
    const url = new URL(rawNext, window.location.href);
    return url.origin === window.location.origin ? url.href : fallback.href;
  } catch (error) {
    return fallback.href;
  }
}

function cleanAuthRedirectUrl() {
  const url = new URL(window.location.href);
  ["code", "state", "error", "error_code", "error_description"].forEach((key) => {
    url.searchParams.delete(key);
  });
  if (!url.searchParams.get("next")) {
    url.searchParams.set("next", nextUrl());
  }
  return url.href;
}

function providerLabel(provider) {
  const labels = {
    google: "Google",
    apple: "Apple",
    kakao: "Kakao",
  };
  return labels[provider] || provider;
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
    link.href = pageUrl("index.html");
  });
  document.querySelectorAll("[data-products-link]").forEach((link) => {
    link.href = pageUrl("products.html");
  });
  document.querySelectorAll("[data-support-link]").forEach((link) => {
    link.href = `${pageUrl("policies.html")}#shipping`;
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

function setAuthTab(tabName) {
  document.querySelectorAll("[data-auth-tab]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.authTab === tabName);
  });
  otpForm.classList.toggle("is-hidden", tabName !== "otp");
  loginForm.classList.toggle("is-hidden", tabName !== "password");
  signupForm.classList.toggle("is-hidden", tabName !== "signup");
  authStatus.textContent = "";
}

function redirectIfSignedIn() {
  if (!shop.currentMember()) return false;
  window.location.href = nextUrl();
  return true;
}

document.querySelectorAll("[data-auth-tab]").forEach((button) => {
  button.addEventListener("click", () => setAuthTab(button.dataset.authTab));
});

providerButtons.forEach((button) => {
  button.addEventListener("click", async () => {
    const provider = button.dataset.oauthProvider;
    authStatus.textContent = `${providerLabel(provider)} 로그인 화면으로 이동합니다.`;
    providerButtons.forEach((item) => {
      item.disabled = true;
    });

    try {
      await shop.signInWithProvider(provider, { redirectTo: cleanAuthRedirectUrl() });
    } catch (error) {
      providerButtons.forEach((item) => {
        item.disabled = false;
      });
      authStatus.textContent = error.message || `${providerLabel(provider)} 로그인을 시작하지 못했습니다.`;
    }
  });
});

otpForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  authStatus.textContent = "인증 링크를 보내는 중입니다.";
  try {
    await shop.signInWithOtp({
      ...Object.fromEntries(new FormData(otpForm)),
      redirectTo: cleanAuthRedirectUrl(),
    });
    otpForm.reset();
    authStatus.textContent = "이메일로 인증 링크를 보냈습니다. 메일함에서 링크를 눌러주세요.";
  } catch (error) {
    authStatus.textContent = error.message || "이메일 인증을 시작하지 못했습니다.";
  }
});

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  authStatus.textContent = "로그인 중입니다.";
  try {
    await shop.signIn(Object.fromEntries(new FormData(loginForm)));
    authStatus.textContent = "로그인되었습니다.";
    loginForm.reset();
    window.location.href = nextUrl();
  } catch (error) {
    authStatus.textContent = error.message || "로그인하지 못했습니다.";
  }
});

signupForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  authStatus.textContent = "가입을 처리하고 있습니다.";
  try {
    const result = await shop.signUp(Object.fromEntries(new FormData(signupForm)));
    signupForm.reset();
    if (result.needsEmailConfirmation) {
      authStatus.textContent = "가입 확인 메일을 보냈습니다. 메일함에서 인증 후 로그인해주세요.";
      setAuthTab("password");
      return;
    }
    window.location.href = nextUrl();
  } catch (error) {
    authStatus.textContent = error.message || "가입하지 못했습니다.";
  }
});

window.addEventListener("caseform:shop-updated", redirectIfSignedIn);

async function boot() {
  applySettings();
  setupHeaderMenu();
  await shop.init(settings);

  const params = new URLSearchParams(window.location.search);
  if (params.get("error") || params.get("error_description")) {
    authStatus.textContent = params.get("error_description") || "로그인을 완료하지 못했습니다.";
  }

  redirectIfSignedIn();
}

boot().catch((error) => {
  authStatus.textContent = error.message || "로그인 화면을 준비하지 못했습니다.";
  setupHeaderMenu();
});
