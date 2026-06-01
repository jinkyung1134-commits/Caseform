(function () {
  const keys = {
    members: "caseform-members-v1",
    session: "caseform-session-v1",
    cart: "caseform-cart-v1",
    reviews: "caseform-reviews-v1",
  };
  const productMediaBucket = "product-media";

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

  const supabaseConfig = window.CASEFORM_SUPABASE || {};
  const hasSupabaseConfig =
    Boolean(supabaseConfig.url && supabaseConfig.anonKey) &&
    !String(supabaseConfig.url).includes("YOUR_SUPABASE") &&
    !String(supabaseConfig.anonKey).includes("YOUR_SUPABASE");
  const client =
    hasSupabaseConfig && window.supabase
      ? window.supabase.createClient(supabaseConfig.url, supabaseConfig.anonKey, {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
          },
        })
      : null;

  let initPromise = null;
  let authUser = null;
  let profileCache = null;
  let cartCache = [];
  let reviewCache = null;
  let productCache = null;
  let orderCache = [];
  let authListenerReady = false;

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

  function isSupabaseEnabled() {
    return Boolean(client);
  }

  function dispatchShopUpdate() {
    window.dispatchEvent(new CustomEvent("caseform:shop-updated"));
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

  function localCurrentMember() {
    const session = currentSession();
    if (!session || !session.email) return null;
    const member = getMembers().find((item) => item.email === session.email) || null;
    return member ? { role: "customer", ...member } : null;
  }

  function currentMember() {
    if (isSupabaseEnabled()) return profileCache;
    return localCurrentMember();
  }

  function rowToCartItem(row) {
    return {
      id: row.id,
      productIndex: row.product_index,
      productName: row.product_name,
      productImage: row.product_image,
      price: Number(row.price || 0),
      device: row.device,
      quantity: Number(row.quantity || 1),
      addedAt: row.created_at,
    };
  }

  function rowToReview(row) {
    return {
      id: row.id,
      productIndex: row.product_index,
      userId: row.user_id,
      author: row.author || "VELTIER 회원",
      rating: Number(row.rating || 5),
      title: row.title,
      body: row.body,
      createdAt: row.created_at,
    };
  }

  function rowToProduct(row) {
    return {
      name: row.name,
      material: row.material || "",
      color: row.color || "#202124",
      price: Number(row.price || 0),
      mediaType: row.media_type === "video" ? "video" : "image",
      image: row.image || "",
      video: row.video || "",
      showInHero: Boolean(row.show_in_hero),
      isActive: row.is_active !== false,
      description: row.description || "",
    };
  }

  function productToRow(product, index) {
    return {
      product_index: index,
      name: String(product.name || `상품 ${index + 1}`),
      material: String(product.material || ""),
      color: String(product.color || "#202124"),
      price: Number(product.price || 0),
      media_type: product.mediaType === "video" ? "video" : "image",
      image: String(product.image || ""),
      video: String(product.video || ""),
      show_in_hero: Boolean(product.showInHero),
      is_active: product.isActive !== false,
      sort_order: index,
      description: String(product.description || ""),
    };
  }

  function rowToOrder(row) {
    return {
      id: row.id,
      orderNumber: row.order_number,
      status: row.status,
      paymentStatus: row.payment_status,
      recipientName: row.recipient_name,
      phone: row.phone,
      email: row.email,
      postalCode: row.postal_code,
      address1: row.address1,
      address2: row.address2,
      deliveryNote: row.delivery_note,
      subtotal: Number(row.subtotal || 0),
      shippingFee: Number(row.shipping_fee || 0),
      total: Number(row.total || 0),
      currency: row.currency || "KRW",
      createdAt: row.created_at,
      items: (row.order_items || []).map((item) => ({
        id: item.id,
        productIndex: item.product_index,
        productName: item.product_name,
        productImage: item.product_image,
        device: item.device,
        quantity: Number(item.quantity || 1),
        price: Number(item.price || 0),
        lineTotal: Number(item.line_total || 0),
      })),
    };
  }

  async function loadProfile() {
    if (!client || !authUser) {
      profileCache = null;
      return null;
    }

    const { data, error } = await client
      .from("profiles")
      .select("*")
      .eq("id", authUser.id)
      .maybeSingle();

    if (error) throw error;

    profileCache = data || {
      id: authUser.id,
      email: authUser.email,
      name: authUser.user_metadata?.name || authUser.email,
      phone: authUser.user_metadata?.phone || "",
      role: "customer",
    };
    profileCache.role = profileCache.role || "customer";
    return profileCache;
  }

  async function loadCart() {
    if (!client || !authUser) {
      cartCache = [];
      return cartCache;
    }

    const { data, error } = await client
      .from("cart_items")
      .select("id, product_index, product_name, product_image, price, device, quantity, created_at")
      .order("created_at", { ascending: false });

    if (error) throw error;
    cartCache = (data || []).map(rowToCartItem);
    return cartCache;
  }

  async function syncLocalCartToRemote() {
    if (!client || !authUser) return;
    const localCart = readJson(keys.cart, []);
    if (!Array.isArray(localCart) || !localCart.length) return;

    await loadCart();

    for (const item of localCart) {
      const existing = cartCache.find(
        (cartItem) =>
          Number(cartItem.productIndex) === Number(item.productIndex) &&
          cartItem.device === item.device,
      );

      if (existing) {
        await client
          .from("cart_items")
          .update({
            quantity: Number(existing.quantity || 1) + Number(item.quantity || 1),
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);
      } else {
        await client.from("cart_items").insert({
          user_id: authUser.id,
          product_index: Number(item.productIndex || 0),
          product_name: item.productName || "상품",
          product_image: item.productImage || "",
          price: Number(item.price || 0),
          device: item.device || "기종 미선택",
          quantity: Number(item.quantity || 1),
        });
      }
    }

    window.localStorage.removeItem(keys.cart);
    await loadCart();
  }

  async function loadReviews() {
    if (!client) {
      reviewCache = ensureLocalReviews();
      return reviewCache;
    }

    const { data, error } = await client
      .from("reviews")
      .select("id, product_index, user_id, author, rating, title, body, created_at")
      .order("created_at", { ascending: false });

    if (error) throw error;
    reviewCache = (data || []).map(rowToReview);
    return reviewCache;
  }

  async function loadProducts(settings) {
    const fallbackProducts = (settings && settings.products) || [];

    if (!client) {
      productCache = fallbackProducts;
      return productCache;
    }

    const { data, error } = await client
      .from("products")
      .select("product_index, name, material, color, price, media_type, image, video, show_in_hero, is_active, sort_order, description")
      .order("sort_order", { ascending: true })
      .order("product_index", { ascending: true });

    if (error) {
      console.warn("VELTIER products could not be loaded.", error);
      productCache = fallbackProducts;
      return productCache;
    }

    productCache = data && data.length ? data.map(rowToProduct) : fallbackProducts;
    return productCache;
  }

  async function getProductSettings(settings) {
    const baseSettings = window.CaseformConfig
      ? window.CaseformConfig.mergeSettings(window.CASEFORM_DEFAULTS, settings)
      : settings;
    const products = await loadProducts(baseSettings);
    return { ...baseSettings, products };
  }

  async function saveProducts(products) {
    if (!client) {
      productCache = products;
      return products;
    }

    if (!isAdmin()) throw new Error("상품 저장은 관리자 권한이 필요합니다.");

    const rows = products.map(productToRow);
    const { data, error } = await client
      .from("products")
      .upsert(rows, { onConflict: "product_index" })
      .select("product_index, name, material, color, price, media_type, image, video, show_in_hero, is_active, sort_order, description")
      .order("sort_order", { ascending: true });

    if (error) throw error;
    productCache = (data || rows).map(rowToProduct);
    return productCache;
  }

  function mediaFilePath(file, productIndex, mediaKind) {
    const extension = String(file.name || "")
      .split(".")
      .pop()
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "") || (mediaKind === "video" ? "mp4" : "png");
    const safeName = String(file.name || "product-media")
      .replace(/\.[^.]+$/, "")
      .toLowerCase()
      .replace(/[^a-z0-9가-힣_-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "product-media";

    return `products/${Number(productIndex || 0)}/${Date.now()}-${safeName}.${extension}`;
  }

  async function uploadProductMedia(file, { productIndex = 0, mediaKind = "image" } = {}) {
    if (!client) throw new Error("Supabase 연결 후 업로드할 수 있습니다.");
    if (!isAdmin()) throw new Error("상품 미디어 업로드는 관리자 권한이 필요합니다.");
    if (!file) throw new Error("업로드할 파일을 선택해주세요.");

    const path = mediaFilePath(file, productIndex, mediaKind);
    const { error } = await client.storage.from(productMediaBucket).upload(path, file, {
      upsert: true,
      contentType: file.type || undefined,
    });
    if (error) throw error;

    const { data } = client.storage.from(productMediaBucket).getPublicUrl(path);
    return data.publicUrl;
  }

  async function loadOrders() {
    if (!client || !authUser) {
      orderCache = [];
      return orderCache;
    }

    const { data, error } = await client
      .from("orders")
      .select("*, order_items(*)")
      .order("created_at", { ascending: false });

    if (error) {
      console.warn("VELTIER orders could not be loaded.", error);
      orderCache = [];
      return orderCache;
    }

    orderCache = (data || []).map(rowToOrder);
    return orderCache;
  }

  async function refreshRemote(settings) {
    if (!client) return;
    await Promise.all([
      authUser ? loadProfile() : Promise.resolve(null),
      authUser ? loadCart() : Promise.resolve([]),
      authUser ? loadOrders() : Promise.resolve([]),
      loadReviews(),
    ]);
    renderCartDrawer(settings || window.caseformActiveSettings);
    dispatchShopUpdate();
  }

  async function init(settings) {
    window.caseformActiveSettings = settings || window.caseformActiveSettings;

    if (!client) {
      reviewCache = ensureLocalReviews();
      return { mode: "local" };
    }

    if (initPromise) return initPromise;

    initPromise = (async () => {
      const { data, error } = await client.auth.getSession();
      if (error) throw error;

      authUser = data.session?.user || null;
      await refreshRemote(settings);

      if (!authListenerReady) {
        authListenerReady = true;
        client.auth.onAuthStateChange(async (_event, session) => {
          authUser = session?.user || null;
          profileCache = null;
          cartCache = [];
          await refreshRemote(window.caseformActiveSettings);
        });
      }

      return { mode: "supabase" };
    })();

    return initPromise;
  }

  async function signUp({ name, email, password, phone }) {
    const cleanEmail = normalizeEmail(email);
    const cleanName = String(name || "").trim();
    const cleanPassword = String(password || "");
    const cleanPhone = String(phone || "").trim();

    if (!cleanName) throw new Error("이름을 입력해주세요.");
    if (!cleanEmail || !cleanEmail.includes("@")) throw new Error("이메일을 확인해주세요.");
    if (cleanPassword.length < 4) throw new Error("비밀번호는 4자 이상 입력해주세요.");

    if (!client) {
      const members = getMembers();
      if (members.some((member) => member.email === cleanEmail)) throw new Error("이미 가입된 이메일입니다.");

      const member = {
        id: `member-${Date.now()}`,
        name: cleanName,
        email: cleanEmail,
        password: cleanPassword,
        phone: cleanPhone,
        role: "customer",
        createdAt: new Date().toISOString(),
      };

      members.push(member);
      setMembers(members);
      writeJson(keys.session, { email: cleanEmail, signedInAt: new Date().toISOString() });
      dispatchShopUpdate();
      return member;
    }

    const { data, error } = await client.auth.signUp({
      email: cleanEmail,
      password: cleanPassword,
      options: {
        data: { name: cleanName, phone: cleanPhone },
        emailRedirectTo: window.location.href,
      },
    });

    if (error) throw error;

    authUser = data.session?.user || null;
    if (authUser) {
      await loadProfile();
      await syncLocalCartToRemote();
      await loadCart();
    }

    dispatchShopUpdate();
    return {
      id: data.user?.id,
      name: cleanName,
      email: cleanEmail,
      phone: cleanPhone,
      role: "customer",
      needsEmailConfirmation: Boolean(data.user && !data.session),
    };
  }

  async function signIn({ email, password }) {
    const cleanEmail = normalizeEmail(email);

    if (!client) {
      const member = getMembers().find((item) => item.email === cleanEmail);
      if (!member || member.password !== String(password || "")) {
        throw new Error("이메일 또는 비밀번호를 확인해주세요.");
      }
      writeJson(keys.session, { email: cleanEmail, signedInAt: new Date().toISOString() });
      dispatchShopUpdate();
      return member;
    }

    const { data, error } = await client.auth.signInWithPassword({
      email: cleanEmail,
      password: String(password || ""),
    });
    if (error) throw new Error("이메일 또는 비밀번호를 확인해주세요.");

    authUser = data.user;
    await loadProfile();
    await syncLocalCartToRemote();
    await Promise.all([loadCart(), loadOrders()]);
    dispatchShopUpdate();
    return profileCache;
  }

  function oauthRedirectUrl() {
    const url = new URL(window.location.href);
    ["code", "state", "error", "error_code", "error_description"].forEach((key) => {
      url.searchParams.delete(key);
    });
    return url.toString();
  }

  async function signInWithGoogle() {
    if (!client) throw new Error("Supabase 연결 후 Google 로그인을 사용할 수 있습니다.");

    const { data, error } = await client.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: oauthRedirectUrl(),
        queryParams: {
          prompt: "select_account",
        },
      },
    });

    if (error) throw error;
    return data;
  }

  async function signOut() {
    if (!client) {
      window.localStorage.removeItem(keys.session);
      dispatchShopUpdate();
      return;
    }

    await client.auth.signOut();
    authUser = null;
    profileCache = null;
    cartCache = [];
    orderCache = [];
    renderCartDrawer(window.caseformActiveSettings);
    dispatchShopUpdate();
  }

  async function updateProfile({ name, phone }) {
    const member = currentMember();
    if (!member) throw new Error("로그인이 필요합니다.");

    const cleanName = String(name || "").trim() || member.name;
    const cleanPhone = String(phone || "").trim();

    if (!client) {
      const members = getMembers();
      const nextMembers = members.map((item) =>
        item.email === member.email ? { ...item, name: cleanName, phone: cleanPhone } : item,
      );
      setMembers(nextMembers);
      dispatchShopUpdate();
      return nextMembers.find((item) => item.email === member.email);
    }

    const { data, error } = await client
      .from("profiles")
      .upsert(
        {
          id: member.id,
          email: member.email,
          name: cleanName,
          phone: cleanPhone,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" },
      )
      .select("*")
      .single();

    if (error) throw error;
    await client.auth.updateUser({ data: { name: cleanName, phone: cleanPhone } });
    profileCache = { ...data, role: data.role || member.role || "customer" };
    dispatchShopUpdate();
    return profileCache;
  }

  function getCart() {
    if (client && authUser) return cartCache;
    return readJson(keys.cart, []);
  }

  function setLocalCart(cart) {
    writeJson(keys.cart, cart);
    renderCartCount();
  }

  async function addToCart({ productIndex, product, device }) {
    const index = Number(productIndex || 0);
    const selectedDevice = String(device || "기종 미선택");

    if (client && authUser) {
      const existing = cartCache.find((item) => Number(item.productIndex) === index && item.device === selectedDevice);

      if (existing) {
        const { error } = await client
          .from("cart_items")
          .update({ quantity: existing.quantity + 1, updated_at: new Date().toISOString() })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await client.from("cart_items").insert({
          user_id: authUser.id,
          product_index: index,
          product_name: product.name,
          product_image: product.image || "",
          price: Number(product.price || 0),
          device: selectedDevice,
          quantity: 1,
        });
        if (error) throw error;
      }

      await loadCart();
      renderCartDrawer(window.caseformActiveSettings);
      dispatchShopUpdate();
      return cartCache;
    }

    const cart = getCart();
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

    setLocalCart(cart);
    renderCartDrawer(window.caseformActiveSettings);
    dispatchShopUpdate();
    return cart;
  }

  async function removeCartItem(id) {
    if (client && authUser) {
      const { error } = await client.from("cart_items").delete().eq("id", id);
      if (error) throw error;
      await loadCart();
    } else {
      setLocalCart(getCart().filter((item) => item.id !== id));
    }

    renderCartDrawer(window.caseformActiveSettings);
    dispatchShopUpdate();
  }

  function cartCount() {
    return getCart().reduce((total, item) => total + Number(item.quantity || 0), 0);
  }

  function cartTotal() {
    return getCart().reduce((total, item) => total + Number(item.price || 0) * Number(item.quantity || 0), 0);
  }

  function getOrders() {
    return orderCache;
  }

  async function createOrder({ recipientName, phone, email, postalCode, address1, address2, deliveryNote }) {
    const member = currentMember();
    const items = getCart();

    if (!member) throw new Error("주문하려면 로그인이 필요합니다.");
    if (!client || !authUser) throw new Error("Supabase 연결 후 주문을 만들 수 있습니다.");
    if (!items.length) throw new Error("장바구니에 담긴 상품이 없습니다.");

    const subtotal = cartTotal();
    const shippingFee = subtotal >= 30000 ? 0 : 3000;
    const total = subtotal + shippingFee;

    const { data: order, error: orderError } = await client
      .from("orders")
      .insert({
        user_id: authUser.id,
        recipient_name: String(recipientName || member.name || "").trim(),
        phone: String(phone || member.phone || "").trim(),
        email: normalizeEmail(email || member.email),
        postal_code: String(postalCode || "").trim(),
        address1: String(address1 || "").trim(),
        address2: String(address2 || "").trim(),
        delivery_note: String(deliveryNote || "").trim(),
        subtotal,
        shipping_fee: shippingFee,
        total,
      })
      .select("*")
      .single();

    if (orderError) throw orderError;

    const orderItems = items.map((item) => ({
      order_id: order.id,
      product_index: Number(item.productIndex || 0),
      product_name: item.productName,
      product_image: item.productImage || "",
      device: item.device,
      quantity: Number(item.quantity || 1),
      price: Number(item.price || 0),
      line_total: Number(item.price || 0) * Number(item.quantity || 1),
    }));

    const { error: itemError } = await client.from("order_items").insert(orderItems);
    if (itemError) throw itemError;

    await loadOrders();
    dispatchShopUpdate();
    return orderCache.find((item) => item.id === order.id) || rowToOrder({ ...order, order_items: orderItems });
  }

  function ensureLocalReviews() {
    const saved = readJson(keys.reviews, null);
    if (Array.isArray(saved)) return saved;
    writeJson(keys.reviews, seededReviews);
    return seededReviews;
  }

  function getReviews(productIndex) {
    const source = client ? reviewCache || [] : ensureLocalReviews();
    return source
      .filter((review) => Number(review.productIndex) === Number(productIndex))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  function getMemberReviews(email) {
    const cleanEmail = normalizeEmail(email);
    const source = client ? reviewCache || [] : ensureLocalReviews();

    if (client) {
      return source
        .filter((review) => profileCache && review.userId === profileCache.id)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    return source
      .filter((review) => normalizeEmail(review.email) === cleanEmail)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  async function addReview({ productIndex, rating, title, body }) {
    const member = currentMember();
    if (!member) throw new Error("로그인 후 리뷰를 작성할 수 있습니다.");

    const cleanTitle = String(title || "").trim();
    const cleanBody = String(body || "").trim();
    const cleanRating = Math.min(Math.max(Number(rating || 5), 1), 5);

    if (!cleanTitle) throw new Error("리뷰 제목을 입력해주세요.");
    if (cleanBody.length < 8) throw new Error("리뷰 내용을 조금 더 자세히 입력해주세요.");

    if (client && authUser) {
      const { error } = await client.from("reviews").insert({
        product_index: Number(productIndex || 0),
        user_id: authUser.id,
        author: member.name || "VELTIER 회원",
        rating: cleanRating,
        title: cleanTitle,
        body: cleanBody,
      });
      if (error) throw error;
      await loadReviews();
      dispatchShopUpdate();
      return getReviews(productIndex)[0];
    }

    const reviews = ensureLocalReviews();
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
    reviewCache = reviews;
    dispatchShopUpdate();
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
      if (!getCart().length) {
        const status = document.createElement("p");
        status.className = "cart-empty";
        status.textContent = "장바구니에 담긴 상품이 없습니다.";
        drawer.querySelector("#cart-items").prepend(status);
        return;
      }

      window.location.href = currentMember()
        ? pageUrl("checkout.html", window.caseformActiveSettings)
        : pageUrl("account.html", window.caseformActiveSettings);
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
    init(settings).catch(() => {
      renderCartDrawer(settings);
    });

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

  function currentRole() {
    if (!isSupabaseEnabled()) return "admin";
    return currentMember()?.role || "guest";
  }

  function isAdmin() {
    return currentRole() === "admin";
  }

  window.CaseformShop = {
    keys,
    pageUrl,
    formatWon,
    isSupabaseEnabled,
    init,
    currentMember,
    currentRole,
    isAdmin,
    signUp,
    signIn,
    signInWithGoogle,
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
    getProductSettings,
    saveProducts,
    uploadProductMedia,
    getOrders,
    createOrder,
    setupHeaderActions,
    renderCartDrawer,
    openCartDrawer,
  };
})();
