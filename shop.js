(function () {
  const keys = {
    members: "caseform-members-v1",
    session: "caseform-session-v1",
    cart: "caseform-cart-v1",
    reviews: "caseform-reviews-v1",
  };

  const seededReviews = [
    {
      id: "seed-ivory-grid-1",
      productIndex: 0,
      author: "민서",
      rating: 5,
      title: "흰 배경에서도 존재감이 좋아요",
      body: "아이보리 톤이 너무 밝게 날리지 않고 골드 링이 은은해서 실제로 고급스러워 보입니다.",
      createdAt: "2026-06-01T08:30:00.000Z",
    },
    {
      id: "seed-ivory-grid-2",
      productIndex: 0,
      author: "지훈",
      rating: 4,
      title: "질감이 깔끔합니다",
      body: "격자 패턴이 과하지 않아서 데일리로 쓰기 좋고 버튼 포인트가 마음에 들어요.",
      createdAt: "2026-05-30T12:10:00.000Z",
    },
    {
      id: "seed-smoke-loop-1",
      productIndex: 1,
      author: "유나",
      rating: 5,
      title: "가볍고 분위기가 있어요",
      body: "스모크 컬러라 투명 케이스보다 차분하고, 루프 포인트가 사진보다 더 예쁩니다.",
      createdAt: "2026-05-29T10:15:00.000Z",
    },
  ];

  function readJson(key, fallback) {
    try {
      const value = window.localStorage.getItem(key);
      return value ? JSON.parse(value) : fallback;
    } catch (error) {
      return fallback;
    }
  }

  function writeJson(key, value) {
    window.localStorage.setItem(key, JSON.stringify(value));
  }

  function escapeHtml(value) {
    return window.CaseformConfig
      ? window.CaseformConfig.escapeHtml(String(value || ""))
      : String(value || "").replace(/[&<>"']/g, (char) => ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[char]);
  }

  function normalizeEmail(email) {
    return String(email || "").trim().toLowerCase();
  }

  function formatWon(value) {
    return `${Number(value || 0).toLocaleString("ko-KR")}원`;
  }

  function pageUrl(page, settings, params) {
    if (window.CaseformConfig && settings) return window.CaseformConfig.urlFor(page, settings, params);
    const query = params ? `?${new URLSearchParams(params).toString()}` : "";
    return `${page}${query}`;
  }

  function getMembers() {
    return readJson(keys.members, []);
  }

  function setMembers(members) {
    writeJson(keys.members, members);
  }

  function currentSession() {
    return readJson(keys.session, null);
  }

  function currentMember() {
    const session = currentSession();
    if (!session || !session.email) return null;
    return getMembers().find((member) => member.email === session.email) || null;
  }

  function signUp({ name, email, password, phone }) {
    const cleanEmail = normalizeEmail(email);
    const cleanName = String(name || "").trim();
    const cleanPassword = String(password || "");
    const members = getMembers();

    if (!cleanName) throw new Error("이름을 입력해주세요.");
    if (!cleanEmail || !cleanEmail.includes("@")) throw new Error("이메일을 확인해주세요.");
    if (cleanPassword.length < 4) throw new Error("비밀번호는 4자 이상 입력해주세요.");
    if (members.some((member) => member.email === cleanEmail)) throw new Error("이미 가입된 이메일입니다.");

    const member = {
      id: `member-${Date.now()}`,
      name: cleanName,
      email: cleanEmail,
      password: cleanPassword,
      phone: String(phone || "").trim(),
      createdAt: new Date().toISOString(),
    };

    members.push(member);
    setMembers(members);
    writeJson(keys.session, { email: cleanEmail, signedInAt: new Date().toISOString() });
    return member;
  }

  function signIn({ email, password }) {
    const cleanEmail = normalizeEmail(email);
    const member = getMembers().find((item) => item.email === cleanEmail);
    if (!member || member.password !== String(password || "")) {
      throw new Error("이메일 또는 비밀번호를 확인해주세요.");
    }
    writeJson(keys.session, { email: cleanEmail, signedInAt: new Date().toISOString() });
    return member;
  }

  function signOut() {
    window.localStorage.removeItem(keys.session);
  }

  function updateProfile({ name, phone }) {
    const member = currentMember();
    if (!member) throw new Error("로그인이 필요합니다.");

    const members = getMembers();
    const nextMembers = members.map((item) =>
      item.email === member.email
        ? { ...item, name: String(name || "").trim() || item.name, phone: String(phone || "").trim() }
        : item,
    );
    setMembers(nextMembers);
    return nextMembers.find((item) => item.email === member.email);
  }

  function getCart() {
    return readJson(keys.cart, []);
  }

  function setCart(cart) {
    writeJson(keys.cart, cart);
    renderCartCount();
  }

  function addToCart({ productIndex, product, device }) {
    const cart = getCart();
    const index = Number(productIndex || 0);
    const selectedDevice = String(device || "기종 미선택");
    const existing = cart.find((item) => Number(item.productIndex) === index && item.device === selectedDevice);

    if (existing) {
      existing.quantity += 1;
    } else {
      cart.push({
        id: `cart-${Date.now()}`,
        productIndex: index,
        productName: product.name,
        productImage: product.image,
        price: Number(product.price || 0),
        device: selectedDevice,
        quantity: 1,
        addedAt: new Date().toISOString(),
      });
    }

    setCart(cart);
    renderCartDrawer(window.caseformActiveSettings);
    return cart;
  }

  function removeCartItem(id) {
    setCart(getCart().filter((item) => item.id !== id));
    renderCartDrawer(window.caseformActiveSettings);
  }

  function cartCount() {
    return getCart().reduce((total, item) => total + Number(item.quantity || 0), 0);
  }

  function cartTotal() {
    return getCart().reduce((total, item) => total + Number(item.price || 0) * Number(item.quantity || 0), 0);
  }

  function ensureReviews() {
    const saved = readJson(keys.reviews, null);
    if (Array.isArray(saved)) return saved;
    writeJson(keys.reviews, seededReviews);
    return seededReviews;
  }

  function getReviews(productIndex) {
    return ensureReviews()
      .filter((review) => Number(review.productIndex) === Number(productIndex))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  function getMemberReviews(email) {
    const cleanEmail = normalizeEmail(email);
    return ensureReviews()
      .filter((review) => normalizeEmail(review.email) === cleanEmail)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  function addReview({ productIndex, rating, title, body }) {
    const member = currentMember();
    if (!member) throw new Error("로그인 후 리뷰를 작성할 수 있습니다.");

    const cleanTitle = String(title || "").trim();
    const cleanBody = String(body || "").trim();
    const cleanRating = Math.min(Math.max(Number(rating || 5), 1), 5);

    if (!cleanTitle) throw new Error("리뷰 제목을 입력해주세요.");
    if (cleanBody.length < 8) throw new Error("리뷰 내용을 조금 더 자세히 입력해주세요.");

    const reviews = ensureReviews();
    const review = {
      id: `review-${Date.now()}`,
      productIndex: Number(productIndex || 0),
      email: member.email,
      author: member.name,
      rating: cleanRating,
      title: cleanTitle,
      body: cleanBody,
      createdAt: new Date().toISOString(),
    };

    reviews.push(review);
    writeJson(keys.reviews, reviews);
    return review;
  }

  function renderCartCount() {
    const count = cartCount();
    document.querySelectorAll(".mobile-icon-button.is-bag").forEach((button) => {
      let badge = button.querySelector(".cart-count");
      if (!badge) {
        badge = document.createElement("span");
        badge.className = "cart-count";
        button.appendChild(badge);
      }
      badge.textContent = String(count);
      badge.hidden = count === 0;
    });
  }

  function ensureCartDrawer() {
    let drawer = document.querySelector("#cart-drawer");
    if (drawer) return drawer;

    drawer = document.createElement("aside");
    drawer.className = "cart-drawer";
    drawer.id = "cart-drawer";
    drawer.setAttribute("aria-hidden", "true");
    drawer.innerHTML = `
      <button class="cart-backdrop" type="button" data-cart-close aria-label="장바구니 닫기"></button>
      <div class="cart-panel" role="dialog" aria-modal="true" aria-labelledby="cart-title">
        <div class="cart-header">
          <h2 id="cart-title">장바구니</h2>
          <button class="cart-remove" type="button" data-cart-close>닫기</button>
        </div>
        <div class="cart-items" id="cart-items"></div>
        <div class="cart-footer">
          <div>
            <small>합계</small>
            <strong id="cart-total">0원</strong>
          </div>
          <button class="button primary checkout" type="button" id="cart-checkout">구매하기</button>
        </div>
      </div>
    `;
    document.body.appendChild(drawer);

    drawer.querySelectorAll("[data-cart-close]").forEach((button) => {
      button.addEventListener("click", closeCartDrawer);
    });
    drawer.querySelector("#cart-items").addEventListener("click", (event) => {
      const removeButton = event.target.closest("[data-cart-remove]");
      if (!removeButton) return;
      removeCartItem(removeButton.dataset.cartRemove);
    });
    drawer.querySelector("#cart-checkout").addEventListener("click", () => {
      const status = document.createElement("p");
      status.className = "cart-empty";
      status.textContent = currentMember()
        ? "실제 결제 연결은 다음 단계에서 붙일 수 있습니다."
        : "로그인 후 구매 흐름을 연결할 수 있습니다.";
      drawer.querySelector("#cart-items").prepend(status);
    });

    return drawer;
  }

  function renderCartDrawer(settings) {
    const drawer = ensureCartDrawer();
    const items = getCart();
    const products = (settings && settings.products) || [];
    const list = drawer.querySelector("#cart-items");

    if (!items.length) {
      list.innerHTML = `<p class="cart-empty">담긴 상품이 없습니다.</p>`;
    } else {
      list.innerHTML = items
        .map((item) => {
          const product = products[Number(item.productIndex)] || {};
          const image = item.productImage || product.image || "";
          const imageMarkup = image
            ? `<img src="${escapeHtml(image)}" alt="" loading="lazy" />`
            : `<span aria-hidden="true"></span>`;
          return `
            <article class="cart-item">
              <span class="cart-thumb">${imageMarkup}</span>
              <span>
                <strong>${escapeHtml(item.productName || product.name || "상품")}</strong>
                <small>${escapeHtml(item.device)} · ${Number(item.quantity || 1)}개 · ${formatWon(item.price)}</small>
              </span>
              <button class="cart-remove" type="button" data-cart-remove="${escapeHtml(item.id)}">삭제</button>
            </article>
          `;
        })
        .join("");
    }

    drawer.querySelector("#cart-total").textContent = formatWon(cartTotal());
    renderCartCount();
  }

  function openCartDrawer() {
    const drawer = ensureCartDrawer();
    renderCartDrawer(window.caseformActiveSettings);
    drawer.classList.add("is-open");
    drawer.setAttribute("aria-hidden", "false");
  }

  function closeCartDrawer() {
    const drawer = document.querySelector("#cart-drawer");
    if (!drawer) return;
    drawer.classList.remove("is-open");
    drawer.setAttribute("aria-hidden", "true");
  }

  function setupHeaderActions(settings) {
    window.caseformActiveSettings = settings;

    document.querySelectorAll("[data-account-link]").forEach((link) => {
      link.href = pageUrl("account.html", settings);
    });

    document.querySelectorAll(".mobile-icon-button.is-account").forEach((button) => {
      if (!button.dataset.accountBound) {
        button.dataset.accountBound = "true";
        button.addEventListener("click", () => {
          window.location.href = pageUrl("account.html", settings);
        });
      }
      const member = currentMember();
      button.setAttribute("aria-label", member ? `${member.name} 마이페이지` : "마이페이지");
    });

    document.querySelectorAll(".mobile-icon-button.is-bag").forEach((button) => {
      if (!button.dataset.cartBound) {
        button.dataset.cartBound = "true";
        button.addEventListener("click", openCartDrawer);
      }
    });

    renderCartDrawer(settings);
  }

  window.CaseformShop = {
    keys,
    pageUrl,
    formatWon,
    currentMember,
    signUp,
    signIn,
    signOut,
    updateProfile,
    getCart,
    addToCart,
    removeCartItem,
    cartCount,
    cartTotal,
    getReviews,
    getMemberReviews,
    addReview,
    setupHeaderActions,
    renderCartDrawer,
    openCartDrawer,
  };
})();
