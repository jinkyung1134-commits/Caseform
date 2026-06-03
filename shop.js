(function () {
  const keys = {
    members: "caseform-members-v1",
    session: "caseform-session-v1",
    cart: "caseform-cart-v1",
    reviews: "caseform-reviews-v1",
    addresses: "caseform-addresses-v1",
  };
  const productMediaBucket = "product-media";
  const deviceOptions = [
    "iPhone 16 Pro",
    "iPhone 16",
    "iPhone 15 Pro",
    "iPhone 15",
    "iPhone 14 Pro",
    "iPhone 14",
    "Galaxy S25",
    "Galaxy S24",
  ];

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
  let inventoryCache = [];
  let notificationCache = [];
  let addressCache = [];
  let inventoryRemoteReady = false;
  let notificationRemoteReady = false;
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

  function authErrorMessage(error) {
    const code = String(error?.code || "").toLowerCase();
    const message = String(error?.message || "").toLowerCase();

    if (code.includes("email_not_confirmed") || message.includes("email not confirmed")) {
      return "이메일 인증이 아직 완료되지 않았어요. 가입 확인 메일에서 인증 후 다시 로그인해주세요.";
    }
    if (message.includes("invalid login credentials") || message.includes("invalid credentials")) {
      return "이메일 또는 비밀번호를 확인해주세요.";
    }
    if (message.includes("too many") || message.includes("rate limit")) {
      return "로그인 요청이 잠시 제한됐어요. 잠시 후 다시 시도해주세요.";
    }
    if (message.includes("auth code") && message.includes("code verifier")) {
      return "로그인 확인 정보가 만료되었습니다. 로그인 버튼을 눌러 다시 시도해주세요.";
    }
    if (message.includes("invalid jwt") || message.includes("jwt")) {
      return "로그인 토큰을 확인하지 못했습니다. 로그인 버튼을 눌러 다시 시도해주세요.";
    }
    if (message.includes("user not found")) {
      return "가입되지 않은 이메일입니다. 회원가입 후 다시 로그인해주세요.";
    }

    return error?.message || "로그인하지 못했습니다.";
  }

  function normalizeCountryCode(value) {
    const code = String(value || "KR").trim().toUpperCase();
    return /^[A-Z]{2}$/.test(code) ? code : "KR";
  }

  function isMissingColumn(error, columnName) {
    const message = `${error?.message || ""} ${error?.details || ""} ${error?.hint || ""}`;
    return error?.code === "42703" || message.includes(columnName);
  }

  function formatWon(value) {
    return `${Number(value || 0).toLocaleString("ko-KR")}원`;
  }

  function pageUrl(page, settings, params) {
    if (window.CaseformConfig && settings) return window.CaseformConfig.urlFor(page, settings, params);
    const query = params ? `?${new URLSearchParams(params).toString()}` : "";
    return `${page}${query}`;
  }

  function authUrl(settings, next = "account.html") {
    return pageUrl("auth.html", settings || window.caseformActiveSettings, { next });
  }

  function accountUrl(settings) {
    return pageUrl("account.html", settings || window.caseformActiveSettings);
  }

  function accountDestinationUrl(settings) {
    return currentMember() ? accountUrl(settings) : authUrl(settings, accountUrl(settings));
  }

  function checkoutDestinationUrl(settings) {
    return currentMember()
      ? pageUrl("checkout.html", settings || window.caseformActiveSettings)
      : authUrl(settings, pageUrl("checkout.html", settings || window.caseformActiveSettings));
  }

  function updateHeaderAccountLinks(settings) {
    const target = accountDestinationUrl(settings);
    document.querySelectorAll("[data-account-link], [data-account-icon]").forEach((link) => {
      link.href = target;
    });
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

  function isLegacySampleProductList(products = []) {
    return Boolean(window.CaseformConfig?.isLegacySampleProductList?.(products));
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
      show_in_hero: false,
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
      countryCode: row.country_code || "KR",
      postalCode: row.postal_code,
      address1: row.address1,
      address2: row.address2,
      deliveryNote: row.delivery_note,
      subtotal: Number(row.subtotal || 0),
      shippingFee: Number(row.shipping_fee || 0),
      total: Number(row.total || 0),
      currency: row.currency || "KRW",
      paymentProvider: row.payment_provider || "",
      providerPaymentId: row.provider_payment_id || "",
      paymentRequestedAt: row.payment_requested_at || "",
      paymentApprovedAt: row.payment_approved_at || row.paid_at || "",
      paymentFailureCode: row.payment_failure_code || "",
      paymentFailureMessage: row.payment_failure_message || "",
      trackingNumber: row.tracking_number || "",
      trackingUrl: row.tracking_url || "",
      adminNote: row.admin_note || "",
      paidAt: row.paid_at || "",
      shippedAt: row.shipped_at || "",
      createdAt: row.created_at,
      updatedAt: row.updated_at,
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

  function rowToInventory(row) {
    return {
      id: row.id,
      productIndex: Number(row.product_index || 0),
      device: row.device,
      sku: row.sku || "",
      stockQuantity: Number(row.stock_quantity || 0),
      lowStockThreshold: Number(row.low_stock_threshold || 3),
      isAvailable: row.is_available !== false,
      updatedAt: row.updated_at,
    };
  }

  function inventoryToRow(item) {
    return {
      product_index: Number(item.productIndex || 0),
      device: String(item.device || "기종 미선택"),
      sku: String(item.sku || ""),
      stock_quantity: Math.max(0, Number(item.stockQuantity || 0)),
      low_stock_threshold: Math.max(0, Number(item.lowStockThreshold || 0)),
      is_available: item.isAvailable !== false,
      updated_at: new Date().toISOString(),
    };
  }

  function defaultInventoryForProducts(products = []) {
    return products.flatMap((product, productIndex) =>
      deviceOptions.map((device) => ({
        productIndex,
        device,
        sku: `VT-${String(productIndex + 1).padStart(3, "0")}-${device.replace(/[^A-Z0-9]/gi, "").toUpperCase()}`,
        stockQuantity: product?.isActive === false ? 0 : 12,
        lowStockThreshold: 3,
        isAvailable: product?.isActive !== false,
      })),
    );
  }

  function rowToNotification(row) {
    return {
      id: row.id,
      orderId: row.order_id,
      userId: row.user_id,
      eventType: row.event_type,
      recipientEmail: row.recipient_email,
      subject: row.subject,
      body: row.body,
      status: row.status,
      createdAt: row.created_at,
      sentAt: row.sent_at,
    };
  }

  function rowToAddress(row) {
    return {
      id: row.id,
      userId: row.user_id,
      label: row.label || "배송지",
      recipientName: row.recipient_name || "",
      phone: row.phone || "",
      countryCode: row.country_code || "KR",
      postalCode: row.postal_code || "",
      address1: row.address1 || "",
      address2: row.address2 || "",
      deliveryNote: row.delivery_note || "",
      isDefault: Boolean(row.is_default),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  function addressToRow(address) {
    return {
      label: String(address.label || "배송지").trim(),
      recipient_name: String(address.recipientName || "").trim(),
      phone: String(address.phone || "").trim(),
      country_code: normalizeCountryCode(address.countryCode),
      postal_code: String(address.postalCode || "").trim(),
      address1: String(address.address1 || "").trim(),
      address2: String(address.address2 || "").trim(),
      delivery_note: String(address.deliveryNote || "").trim(),
      is_default: Boolean(address.isDefault),
      updated_at: new Date().toISOString(),
    };
  }

  async function loadProfile() {
    if (!client || !authUser) {
      profileCache = null;
      return null;
    }

    const fallbackProfile = {
      id: authUser.id,
      email: authUser.email,
      name: authUser.user_metadata?.name || authUser.email,
      phone: authUser.user_metadata?.phone || "",
      role: "customer",
    };

    const { data, error } = await client
      .from("profiles")
      .select("*")
      .eq("id", authUser.id)
      .maybeSingle();

    if (error) {
      console.warn("VELTIER profile could not be loaded.", error);
      profileCache = fallbackProfile;
      return profileCache;
    }

    profileCache = data || fallbackProfile;
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

    if (error) {
      console.warn("VELTIER cart could not be loaded.", error);
      cartCache = [];
      return cartCache;
    }
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

    if (error) {
      console.warn("VELTIER reviews could not be loaded.", error);
      reviewCache = seededReviews;
      return reviewCache;
    }
    reviewCache = (data || []).map(rowToReview);
    return reviewCache;
  }

  async function loadProducts(settings, options = {}) {
    const includeInactive = Boolean(options.includeInactive);
    const savedProducts = (settings && settings.products) || [];
    const fallbackProducts = includeInactive
      ? savedProducts
      : savedProducts.filter((product) => product.isActive !== false);

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

    const loadedProducts = data && data.length ? data.map(rowToProduct) : [];
    productCache = loadedProducts.length
      ? isLegacySampleProductList(loadedProducts)
        ? []
        : includeInactive
          ? loadedProducts
          : loadedProducts.filter((product) => product.isActive !== false)
      : fallbackProducts;
    return productCache;
  }

  async function loadInventory(settings) {
    const products = productCache || (settings && settings.products) || [];
    const fallbackInventory = defaultInventoryForProducts(products);

    if (!client) {
      inventoryCache = fallbackInventory;
      inventoryRemoteReady = false;
      return inventoryCache;
    }

    const { data, error } = await client
      .from("product_variants")
      .select("id, product_index, device, sku, stock_quantity, low_stock_threshold, is_available, updated_at")
      .order("product_index", { ascending: true })
      .order("device", { ascending: true });

    if (error) {
      console.warn("VELTIER inventory could not be loaded.", error);
      inventoryCache = fallbackInventory;
      inventoryRemoteReady = false;
      return inventoryCache;
    }

    inventoryRemoteReady = true;
    inventoryCache = data && data.length ? data.map(rowToInventory) : fallbackInventory;
    return inventoryCache;
  }

  async function getProductSettings(settings, options = {}) {
    const baseSettings = window.CaseformConfig
      ? window.CaseformConfig.mergeSettings(window.CASEFORM_DEFAULTS, settings)
      : settings;
    const products = await loadProducts(baseSettings, options);
    await loadInventory({ ...baseSettings, products });
    return { ...baseSettings, products };
  }

  async function saveProducts(products) {
    if (!client) {
      productCache = products;
      return products;
    }

    if (!isAdmin()) throw new Error("상품 저장은 관리자 권한이 필요합니다.");

    if (!products.length) {
      const { error } = await client
        .from("products")
        .update({ is_active: false, show_in_hero: false, updated_at: new Date().toISOString() })
        .gte("product_index", 0);

      if (error) throw error;
      productCache = [];
      return productCache;
    }

    const rows = products.map(productToRow);
    const { data, error } = await client
      .from("products")
      .upsert(rows, { onConflict: "product_index" })
      .select("product_index, name, material, color, price, media_type, image, video, show_in_hero, is_active, sort_order, description")
      .order("sort_order", { ascending: true });

    if (error) throw error;
    await client
      .from("products")
      .update({ is_active: false, show_in_hero: false, updated_at: new Date().toISOString() })
      .gte("product_index", products.length);
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

  async function loadNotifications() {
    if (!client || !authUser || !isAdmin()) {
      notificationCache = [];
      return notificationCache;
    }

    const { data, error } = await client
      .from("notification_events")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.warn("VELTIER notifications could not be loaded.", error);
      notificationCache = [];
      notificationRemoteReady = false;
      return notificationCache;
    }

    notificationRemoteReady = true;
    notificationCache = (data || []).map(rowToNotification);
    return notificationCache;
  }

  async function loadAddresses() {
    if (!client || !authUser) {
      addressCache = [];
      return addressCache;
    }

    let { data, error } = await client
      .from("user_addresses")
      .select("id, user_id, label, recipient_name, phone, country_code, postal_code, address1, address2, delivery_note, is_default, created_at, updated_at")
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: true });

    if (isMissingColumn(error, "country_code")) {
      const retry = await client
        .from("user_addresses")
        .select("id, user_id, label, recipient_name, phone, postal_code, address1, address2, delivery_note, is_default, created_at, updated_at")
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: true });
      data = retry.data;
      error = retry.error;
    }

    if (error) {
      console.warn("VELTIER addresses could not be loaded.", error);
      addressCache = [];
      return addressCache;
    }

    addressCache = (data || []).map(rowToAddress);
    return addressCache;
  }

  async function refreshRemote(settings) {
    if (!client) return;
    if (authUser) {
      await loadProfile();
    } else {
      profileCache = null;
    }

    const results = await Promise.allSettled([
      authUser ? loadCart() : Promise.resolve([]),
      authUser ? loadOrders() : Promise.resolve([]),
      authUser ? loadAddresses() : Promise.resolve([]),
      authUser && isAdmin() ? loadNotifications() : Promise.resolve([]),
      loadInventory(settings || window.caseformActiveSettings),
      loadReviews(),
    ]);
    results
      .filter((result) => result.status === "rejected")
      .forEach((result) => console.warn("VELTIER remote data could not be refreshed.", result.reason));
    renderCartDrawer(settings || window.caseformActiveSettings);
    updateHeaderAccountLinks(settings || window.caseformActiveSettings);
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

  async function signUp({ name, email, password, phone, redirectTo }) {
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
        emailRedirectTo: redirectTo || oauthRedirectUrl(),
      },
    });

    if (error) throw error;

    authUser = data.session?.user || null;
    if (authUser) {
      await loadProfile();
      await syncLocalCartToRemote().catch((cartError) => {
        console.warn("VELTIER local cart could not be synced.", cartError);
      });
      await Promise.allSettled([loadCart(), loadAddresses()]);
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
    const cleanPassword = String(password || "");

    if (!cleanEmail || !cleanEmail.includes("@")) throw new Error("이메일을 확인해주세요.");
    if (!cleanPassword) throw new Error("비밀번호를 입력해주세요.");

    if (!client) {
      const member = getMembers().find((item) => item.email === cleanEmail);
      if (!member || member.password !== cleanPassword) {
        throw new Error("이메일 또는 비밀번호를 확인해주세요.");
      }
      writeJson(keys.session, { email: cleanEmail, signedInAt: new Date().toISOString() });
      dispatchShopUpdate();
      return member;
    }

    const { data, error } = await client.auth.signInWithPassword({
      email: cleanEmail,
      password: cleanPassword,
    });
    if (error) throw new Error(authErrorMessage(error));

    authUser = data.user;
    await loadProfile();
    await syncLocalCartToRemote().catch((cartError) => {
      console.warn("VELTIER local cart could not be synced.", cartError);
    });
    await Promise.allSettled([loadCart(), loadOrders(), loadAddresses()]);
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

  async function signInWithProvider(provider, options = {}) {
    const cleanProvider = String(provider || "").trim().toLowerCase();
    const labels = {
      google: "Google",
      apple: "Apple",
      kakao: "Kakao",
    };

    if (!labels[cleanProvider]) throw new Error("지원하지 않는 로그인 방식입니다.");
    if (!client) throw new Error(`${labels[cleanProvider]} 로그인은 Supabase 연결 후 사용할 수 있습니다.`);

    const { data, error } = await client.auth.signInWithOAuth({
      provider: cleanProvider,
      options: {
        redirectTo: options.redirectTo || oauthRedirectUrl(),
        queryParams:
          cleanProvider === "google"
            ? {
                prompt: "select_account",
              }
            : undefined,
      },
    });

    if (error) throw error;
    return data;
  }

  function hasAuthCallbackParams() {
    const params = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(String(window.location.hash || "").replace(/^#/, ""));
    return Boolean(
      params.get("code") ||
        hashParams.get("access_token") ||
        hashParams.get("refresh_token") ||
        hashParams.get("error") ||
        hashParams.get("error_description"),
    );
  }

  async function completeAuthFromUrl(settings) {
    window.caseformActiveSettings = settings || window.caseformActiveSettings;

    if (!client || !hasAuthCallbackParams()) return null;

    const params = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(String(window.location.hash || "").replace(/^#/, ""));
    const code = params.get("code");
    const accessToken = hashParams.get("access_token");
    const refreshToken = hashParams.get("refresh_token");
    const hashError = hashParams.get("error_description") || hashParams.get("error");
    let sessionData = null;

    if (hashError) {
      throw new Error(hashError);
    }

    if (accessToken) {
      if (!refreshToken) throw new Error("로그인 확인 정보가 부족합니다. 다시 로그인해주세요.");
      const { data, error } = await client.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      if (error) throw new Error(authErrorMessage(error));
      sessionData = data;
    } else if (code && typeof client.auth.exchangeCodeForSession === "function") {
      const { data, error } = await client.auth.exchangeCodeForSession(code);
      if (error) throw new Error(authErrorMessage(error));
      sessionData = data;
    } else {
      const { data, error } = await client.auth.getSession();
      if (error) throw new Error(authErrorMessage(error));
      sessionData = data;
    }

    authUser = sessionData?.session?.user || sessionData?.user || authUser;
    if (!authUser) {
      const { data, error } = await client.auth.getUser();
      if (error) throw new Error(authErrorMessage(error));
      authUser = data?.user || null;
    }

    if (authUser) {
      profileCache = null;
      await refreshRemote(window.caseformActiveSettings);
    }

    return sessionData;
  }

  async function signInWithOtp({ email, redirectTo } = {}) {
    const cleanEmail = normalizeEmail(email);
    if (!cleanEmail || !cleanEmail.includes("@")) throw new Error("이메일을 확인해주세요.");
    if (!client) throw new Error("이메일 인증 로그인은 Supabase 연결 후 사용할 수 있습니다.");

    const { data, error } = await client.auth.signInWithOtp({
      email: cleanEmail,
      options: {
        emailRedirectTo: redirectTo || oauthRedirectUrl(),
        shouldCreateUser: true,
      },
    });

    if (error) throw error;
    return data;
  }

  async function sendPasswordReset({ email, redirectTo } = {}) {
    const cleanEmail = normalizeEmail(email);
    if (!cleanEmail || !cleanEmail.includes("@")) throw new Error("이메일을 확인해주세요.");
    if (!client) throw new Error("비밀번호 재설정은 Supabase 연결 후 사용할 수 있습니다.");

    const { data, error } = await client.auth.resetPasswordForEmail(cleanEmail, {
      redirectTo: redirectTo || oauthRedirectUrl(),
    });
    if (error) throw error;
    return data;
  }

  async function updatePassword({ password } = {}) {
    const cleanPassword = String(password || "");
    if (cleanPassword.length < 6) throw new Error("새 비밀번호는 6자 이상 입력해주세요.");

    if (!client) {
      const member = localCurrentMember();
      if (!member) throw new Error("로그인 후 비밀번호를 변경할 수 있습니다.");
      const members = getMembers().map((item) =>
        item.email === member.email ? { ...item, password: cleanPassword } : item,
      );
      setMembers(members);
      dispatchShopUpdate();
      return true;
    }

    const { data, error } = await client.auth.updateUser({ password: cleanPassword });
    if (error) throw error;
    authUser = data.user || authUser;
    await loadProfile();
    dispatchShopUpdate();
    return data;
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
    addressCache = [];
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

  function getLocalAddressStore() {
    return readJson(keys.addresses, []);
  }

  function setLocalAddressStore(addresses) {
    writeJson(keys.addresses, addresses);
  }

  function getAddresses() {
    const member = currentMember();
    if (!member) return [];
    if (client && authUser) return addressCache;
    return getLocalAddressStore()
      .filter((address) => normalizeEmail(address.email) === normalizeEmail(member.email))
      .sort((a, b) => Number(b.isDefault) - Number(a.isDefault));
  }

  function getDefaultAddress() {
    return getAddresses().find((address) => address.isDefault) || getAddresses()[0] || null;
  }

  async function saveAddress(address) {
    const member = currentMember();
    if (!member) throw new Error("로그인 후 배송지를 저장할 수 있습니다.");

    const payload = {
      id: address.id || "",
      label: String(address.label || "기본 배송지").trim(),
      recipientName: String(address.recipientName || member.name || "").trim(),
      phone: String(address.phone || member.phone || "").trim(),
      countryCode: normalizeCountryCode(address.countryCode),
      postalCode: String(address.postalCode || "").trim(),
      address1: String(address.address1 || "").trim(),
      address2: String(address.address2 || "").trim(),
      deliveryNote: String(address.deliveryNote || "").trim(),
      isDefault: Boolean(address.isDefault),
    };

    if (!payload.recipientName) throw new Error("받는 분을 입력해주세요.");
    if (!payload.phone) throw new Error("연락처를 입력해주세요.");
    if (!payload.address1) throw new Error("주소를 입력해주세요.");

    if (!client) {
      const email = normalizeEmail(member.email);
      const outside = getLocalAddressStore().filter((item) => normalizeEmail(item.email) !== email);
      const own = getAddresses()
        .filter((item) => item.id !== payload.id)
        .map((item) => (payload.isDefault ? { ...item, isDefault: false } : item));
      const nextAddress = {
        ...payload,
        id: payload.id || `address-${Date.now()}`,
        email,
        updatedAt: new Date().toISOString(),
      };
      setLocalAddressStore([...outside, ...own, nextAddress]);
      dispatchShopUpdate();
      return nextAddress;
    }

    if (payload.isDefault) {
      await client.from("user_addresses").update({ is_default: false }).eq("user_id", authUser.id);
    }

    const row = { ...addressToRow(payload), user_id: authUser.id };
    const saveRow = async (nextRow) => {
      const query = payload.id
        ? client.from("user_addresses").upsert({ ...nextRow, id: payload.id }, { onConflict: "id" })
        : client.from("user_addresses").insert(nextRow);
      return query.select("*").single();
    };
    let { data, error } = await saveRow(row);
    if (isMissingColumn(error, "country_code")) {
      const { country_code: _countryCode, ...fallbackRow } = row;
      const retry = await saveRow(fallbackRow);
      data = retry.data;
      error = retry.error;
    }
    if (error) throw error;

    await loadAddresses();
    dispatchShopUpdate();
    return rowToAddress(data);
  }

  async function deleteAddress(addressId) {
    const member = currentMember();
    if (!member) throw new Error("로그인이 필요합니다.");

    if (!client) {
      setLocalAddressStore(getLocalAddressStore().filter((address) => address.id !== addressId));
      dispatchShopUpdate();
      return;
    }

    const { error } = await client.from("user_addresses").delete().eq("id", addressId);
    if (error) throw error;
    await loadAddresses();
    dispatchShopUpdate();
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
    const existingQuantity =
      getCart().find((item) => Number(item.productIndex) === index && item.device === selectedDevice)?.quantity || 0;

    if (!isVariantPurchasable(index, selectedDevice, Number(existingQuantity || 0) + 1)) {
      throw new Error(`${product.name} / ${selectedDevice} 재고를 확인해주세요.`);
    }

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

  function getNotifications() {
    return notificationCache;
  }

  function getInventory() {
    return inventoryCache;
  }

  function getDeviceOptions() {
    return [...deviceOptions];
  }

  function getProductInventory(productIndex) {
    const index = Number(productIndex || 0);
    const rows = inventoryCache.filter((item) => Number(item.productIndex) === index);
    if (rows.length) return rows;
    return defaultInventoryForProducts(productCache || []).filter((item) => Number(item.productIndex) === index);
  }

  function getVariant(productIndex, device) {
    return getProductInventory(productIndex).find((item) => item.device === device) || null;
  }

  function isVariantPurchasable(productIndex, device, quantity = 1) {
    const variant = getVariant(productIndex, device);
    if (!variant) return true;
    return variant.isAvailable && Number(variant.stockQuantity || 0) >= Number(quantity || 1);
  }

  async function saveInventory(productIndex, items) {
    if (!client) {
      const nextItems = (items || []).map((item) => ({
        ...item,
        productIndex: Number(productIndex || item.productIndex || 0),
      }));
      inventoryCache = [
        ...inventoryCache.filter((item) => Number(item.productIndex) !== Number(productIndex)),
        ...nextItems,
      ];
      dispatchShopUpdate();
      return getProductInventory(productIndex);
    }

    if (!isAdmin()) throw new Error("재고 관리는 관리자 권한이 필요합니다.");

    const rows = (items || []).map((item) =>
      inventoryToRow({
        ...item,
        productIndex: Number(productIndex || item.productIndex || 0),
      }),
    );

    const { data, error } = await client
      .from("product_variants")
      .upsert(rows, { onConflict: "product_index,device" })
      .select("id, product_index, device, sku, stock_quantity, low_stock_threshold, is_available, updated_at")
      .order("device", { ascending: true });

    if (error) throw error;
    await loadInventory(window.caseformActiveSettings);
    dispatchShopUpdate();
    return (data || rows).map(rowToInventory);
  }

  async function createNotificationEvent({ order, eventType, subject, body }) {
    if (!client || !order) return null;

    const payload = {
      order_id: order.id,
      user_id: order.user_id || order.userId || authUser?.id || null,
      event_type: eventType,
      recipient_email: order.email,
      subject,
      body,
      status: "pending",
    };

    const { data, error } = await client
      .from("notification_events")
      .insert(payload)
      .select("*")
      .single();

    if (error) {
      console.warn("VELTIER notification event could not be created.", error);
      notificationRemoteReady = false;
      return null;
    }

    notificationRemoteReady = true;
    const event = rowToNotification(data);
    notificationCache = [event, ...notificationCache];
    return event;
  }

  async function updateOrder(orderId, fields = {}) {
    if (!client) throw new Error("Supabase 연결 후 주문을 수정할 수 있습니다.");
    if (!isAdmin()) throw new Error("주문 관리는 관리자 권한이 필요합니다.");

    const previous = orderCache.find((order) => order.id === orderId) || null;
    const nextStatus = fields.status || previous?.status;
    const nextPaymentStatus = fields.paymentStatus || previous?.paymentStatus;
    const patch = {
      status: nextStatus,
      payment_status: nextPaymentStatus,
      tracking_number: String(fields.trackingNumber || "").trim(),
      tracking_url: String(fields.trackingUrl || "").trim(),
      admin_note: String(fields.adminNote || "").trim(),
      payment_provider: String(fields.paymentProvider || previous?.paymentProvider || "").trim(),
      provider_payment_id: String(fields.providerPaymentId || previous?.providerPaymentId || "").trim(),
      updated_at: new Date().toISOString(),
    };

    if (nextPaymentStatus === "paid" && !previous?.paidAt) patch.paid_at = new Date().toISOString();
    if (nextStatus === "shipped" && !previous?.shippedAt) patch.shipped_at = new Date().toISOString();

    const { data, error } = await client
      .from("orders")
      .update(patch)
      .eq("id", orderId)
      .select("*, order_items(*)")
      .single();

    if (error) throw error;

    const updated = rowToOrder(data);
    orderCache = orderCache.map((order) => (order.id === orderId ? updated : order));

    if (!previous || previous.status !== updated.status || previous.paymentStatus !== updated.paymentStatus) {
      await createNotificationEvent({
        order: data,
        eventType: "order_status_changed",
        subject: `[VELTIER] 주문 ${updated.orderNumber} 상태가 변경되었습니다`,
        body: `현재 주문 상태: ${updated.status} / 결제 상태: ${updated.paymentStatus}`,
      });
    }

    dispatchShopUpdate();
    return updated;
  }

  async function updateNotificationStatus(notificationId, status) {
    if (!client) throw new Error("Supabase 연결 후 알림 상태를 수정할 수 있습니다.");
    if (!isAdmin()) throw new Error("알림 상태 수정은 관리자 권한이 필요합니다.");

    const cleanStatus = ["pending", "sent", "failed", "skipped"].includes(status) ? status : "pending";
    const { data, error } = await client
      .from("notification_events")
      .update({
        status: cleanStatus,
        sent_at: cleanStatus === "sent" ? new Date().toISOString() : null,
      })
      .eq("id", notificationId)
      .select("*")
      .single();

    if (error) throw error;
    const updated = rowToNotification(data);
    notificationCache = notificationCache.map((event) => (event.id === notificationId ? updated : event));
    dispatchShopUpdate();
    return updated;
  }

  async function invokeFunction(functionName, body = {}) {
    if (!client) throw new Error("Supabase 연결 후 서버 기능을 호출할 수 있습니다.");
    const { data, error } = await client.functions.invoke(functionName, { body });
    if (error) throw error;
    return data;
  }

  async function refresh(settings) {
    await refreshRemote(settings || window.caseformActiveSettings);
  }

  async function createOrder({
    recipientName,
    phone,
    email,
    countryCode,
    postalCode,
    address1,
    address2,
    deliveryNote,
    paymentProvider,
  }) {
    const member = currentMember();
    const items = getCart();

    if (!member) throw new Error("주문하려면 로그인이 필요합니다.");
    if (!client || !authUser) throw new Error("Supabase 연결 후 주문을 만들 수 있습니다.");
    if (!items.length) throw new Error("장바구니에 담긴 상품이 없습니다.");
    const unavailable = items.find((item) => !isVariantPurchasable(item.productIndex, item.device, item.quantity));
    if (unavailable) throw new Error(`${unavailable.productName} / ${unavailable.device} 재고를 확인해주세요.`);

    const subtotal = cartTotal();
    const shippingFee = subtotal >= 30000 ? 0 : 3000;
    const total = subtotal + shippingFee;
    const cleanPaymentProvider = String(paymentProvider || "manual").trim();
    const isExternalPayment = ["toss", "paypal", "stripe"].includes(cleanPaymentProvider);

    const orderPayload = {
      user_id: authUser.id,
      status: "pending_payment",
      payment_status: isExternalPayment ? "ready" : "not_started",
      recipient_name: String(recipientName || member.name || "").trim(),
      phone: String(phone || member.phone || "").trim(),
      email: normalizeEmail(email || member.email),
      country_code: normalizeCountryCode(countryCode),
      postal_code: String(postalCode || "").trim(),
      address1: String(address1 || "").trim(),
      address2: String(address2 || "").trim(),
      delivery_note: String(deliveryNote || "").trim(),
      subtotal,
      shipping_fee: shippingFee,
      total,
      payment_provider: cleanPaymentProvider,
      payment_requested_at: isExternalPayment ? new Date().toISOString() : null,
    };

    const optionalOrderColumns = [
      "country_code",
      "payment_requested_at",
      "payment_approved_at",
      "payment_failure_code",
      "payment_failure_message",
    ];
    let insertPayload = { ...orderPayload };
    let order = null;
    let orderError = null;

    for (let attempt = 0; attempt <= optionalOrderColumns.length; attempt += 1) {
      const result = await client.from("orders").insert(insertPayload).select("*").single();
      order = result.data;
      orderError = result.error;
      if (!orderError) break;

      const missingColumn = optionalOrderColumns.find((column) => isMissingColumn(orderError, column));
      if (!missingColumn || !(missingColumn in insertPayload)) break;
      const { [missingColumn]: _missing, ...nextPayload } = insertPayload;
      insertPayload = nextPayload;
    }

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

    await createNotificationEvent({
      order,
      eventType: "order_created",
      subject: `[VELTIER] 주문 ${order.order_number}이 접수되었습니다`,
      body: isExternalPayment
        ? `주문 금액 ${formatWon(total)}의 결제 전 주문이 생성되었습니다. 결제 승인 상태를 확인해주세요.`
        : `주문 금액 ${formatWon(total)}의 주문이 접수되었습니다. 결제 상태를 확인해주세요.`,
    });

    await client.from("cart_items").delete().eq("user_id", authUser.id);
    await Promise.all([loadCart(), loadOrders()]);
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

  function getAllReviews() {
    const source = client ? reviewCache || [] : ensureLocalReviews();
    return [...source].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
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
    if (!canReviewProduct(productIndex)) throw new Error("구매한 상품만 리뷰를 작성할 수 있습니다.");

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

  function canReviewProduct(productIndex) {
    const member = currentMember();
    if (!member) return false;
    if (!client) return true;
    if (isAdmin()) return true;
    return orderCache.some(
      (order) =>
        order.status !== "cancelled" &&
        (order.paymentStatus === "paid" || ["paid", "preparing", "shipped", "delivered"].includes(order.status)) &&
        (order.items || []).some((item) => Number(item.productIndex) === Number(productIndex)),
    );
  }

  async function deleteReview(reviewId) {
    const member = currentMember();
    if (!member) throw new Error("로그인이 필요합니다.");

    if (client && authUser) {
      const { error } = await client.from("reviews").delete().eq("id", reviewId);
      if (error) throw error;
      await loadReviews();
      dispatchShopUpdate();
      return;
    }

    const reviews = ensureLocalReviews().filter((review) => review.id !== reviewId);
    writeJson(keys.reviews, reviews);
    reviewCache = reviews;
    dispatchShopUpdate();
  }

  function renderCartCount() {
    const count = cartCount();
    document.querySelectorAll(".mobile-icon-button.is-bag, [data-cart-open]").forEach((button) => {
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

      window.location.href = checkoutDestinationUrl(window.caseformActiveSettings);
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

    updateHeaderAccountLinks(window.caseformActiveSettings || settings);

    document.querySelectorAll(".mobile-icon-button.is-account").forEach((button) => {
      if (button.tagName === "A") {
        const member = currentMember();
        button.setAttribute("aria-label", member ? `${member.name} 마이페이지` : "마이페이지");
        button.href = accountDestinationUrl(window.caseformActiveSettings || settings);
        return;
      }
      if (!button.dataset.accountBound) {
        button.dataset.accountBound = "true";
        button.addEventListener("click", () => {
          window.location.href = accountDestinationUrl(window.caseformActiveSettings || settings);
        });
      }
      const member = currentMember();
      button.setAttribute("aria-label", member ? `${member.name} 마이페이지` : "마이페이지");
    });

    document.querySelectorAll(".mobile-icon-button.is-bag, [data-cart-open]").forEach((button) => {
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
    authUrl,
    formatWon,
    getDeviceOptions,
    isSupabaseEnabled,
    init,
    currentMember,
    currentRole,
    isAdmin,
    signUp,
    signIn,
    signInWithProvider,
    signInWithGoogle,
    hasAuthCallbackParams,
    completeAuthFromUrl,
    signInWithOtp,
    sendPasswordReset,
    updatePassword,
    signOut,
    updateProfile,
    getCart,
    getAddresses,
    getDefaultAddress,
    saveAddress,
    deleteAddress,
    addToCart,
    removeCartItem,
    cartCount,
    cartTotal,
    getInventory,
    getProductInventory,
    saveInventory,
    isVariantPurchasable,
    getReviews,
    getAllReviews,
    getMemberReviews,
    addReview,
    canReviewProduct,
    deleteReview,
    getProductSettings,
    saveProducts,
    uploadProductMedia,
    getOrders,
    getNotifications,
    updateNotificationStatus,
    updateOrder,
    invokeFunction,
    refresh,
    createOrder,
    setupHeaderActions,
    renderCartDrawer,
    openCartDrawer,
  };
})();
