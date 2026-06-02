(function () {
  const STORAGE_KEY = "caseform-settings";

  const products = [
    {
      name: "Ivory Grid",
      material: "사틴 레더",
      color: "#f3eadb",
      price: 46000,
      mediaType: "image",
      image: "assets/caseform-ivory-grid-concept.png",
      video: "",
      showInHero: true,
      description: "펄 아이보리 텍스처와 샴페인 골드 링으로 흰 배경에서도 선명하게 돋보이는 모델입니다.",
    },
    {
      name: "Smoke Loop",
      material: "클리어 하드쉘",
      color: "#8f9691",
      price: 42000,
      mediaType: "image",
      image: "assets/sample-smoke-loop.png",
      video: "",
      showInHero: true,
      description: "스모크 클리어 쉘과 루프 포인트로 가볍지만 확실한 존재감을 더합니다.",
    },
    {
      name: "Olive Track",
      material: "무광 실리콘",
      color: "#4c5745",
      price: 39000,
      mediaType: "image",
      image: "assets/sample-olive-track.png",
      video: "",
      showInHero: true,
      description: "짙은 올리브 질감과 안정적인 그립으로 조용한 고급감을 만듭니다.",
    },
    {
      name: "Taupe Tab",
      material: "비건 레더",
      color: "#8d5748",
      price: 46000,
      mediaType: "image",
      image: "assets/sample-taupe-tab.png",
      video: "",
      showInHero: true,
      description: "따뜻한 레더 질감과 탭 디테일로 가장 드레스업된 모델입니다.",
    },
    {
      name: "Carbon Veil",
      material: "카본 패턴",
      color: "#111111",
      price: 49000,
      mediaType: "image",
      image: "assets/sample-carbon-veil.png",
      video: "",
      showInHero: false,
      description: "카본 결의 깊은 무광 질감과 골드 버튼 포인트가 더해진 프리미엄 모델입니다.",
    },
    {
      name: "Noir Lanyard",
      material: "비건 레더",
      color: "#1b1a17",
      price: 52000,
      mediaType: "image",
      image: "assets/sample-noir-lanyard.png",
      video: "",
      showInHero: false,
      description: "블랙 레더 질감과 손목 스트랩, 골드 하드웨어로 고급스럽게 잡히는 모델입니다.",
    },
    {
      name: "Smoke Halo",
      material: "스모크 클리어",
      color: "#5d5c58",
      price: 43000,
      mediaType: "image",
      image: "assets/sample-smoke-halo.png",
      video: "",
      showInHero: false,
      description: "스모키한 투명감과 차분한 테두리로 가볍지만 선명한 존재감을 더합니다.",
    },
    {
      name: "Moss Line",
      material: "무광 실리콘",
      color: "#3d4638",
      price: 44000,
      mediaType: "image",
      image: "assets/sample-moss-line.png",
      video: "",
      showInHero: false,
      description: "딥그린 톤과 사선 그립 라인, 골드 버튼이 조용한 고급감을 만듭니다.",
    },
    {
      name: "Graphite Trace",
      material: "Carbon texture",
      color: "#171717",
      price: 45000,
      mediaType: "image",
      image: "assets/sample-carbon-veil.png",
      video: "",
      showInHero: false,
      description: "A quiet graphite case with a clean carbon texture and warm metal side details.",
    },
    {
      name: "Onyx Loop",
      material: "Vegan leather",
      color: "#151412",
      price: 51000,
      mediaType: "image",
      image: "assets/sample-noir-lanyard.png",
      video: "",
      showInHero: false,
      description: "Black leather grain, a loop strap, and restrained gold hardware for daily carry.",
    },
    {
      name: "Clear Ember",
      material: "Smoke clear",
      color: "#6a6761",
      price: 41000,
      mediaType: "image",
      image: "assets/sample-smoke-halo.png",
      video: "",
      showInHero: false,
      description: "A smoky clear shell with warm reflected edges and a light protective feel.",
    },
    {
      name: "Forest Grip",
      material: "Matte silicone",
      color: "#354031",
      price: 42000,
      mediaType: "image",
      image: "assets/sample-moss-line.png",
      video: "",
      showInHero: false,
      description: "Deep green silicone with fine grip lines and a low-key gold button accent.",
    },
    {
      name: "Slate Loop",
      material: "Clear hybrid",
      color: "#777c78",
      price: 43000,
      mediaType: "image",
      image: "assets/sample-smoke-loop.png",
      video: "",
      showInHero: false,
      description: "A smoke-toned hybrid case made for a softer and lighter everyday setup.",
    },
    {
      name: "Shadow Rib",
      material: "Matte silicone",
      color: "#202020",
      price: 39000,
      mediaType: "image",
      image: "",
      video: "",
      showInHero: false,
      description: "A minimal matte black sample with a simple ribbed grip and clean silhouette.",
    },
    {
      name: "Gold Frame",
      material: "Leather finish",
      color: "#7d594d",
      price: 48000,
      mediaType: "image",
      image: "assets/sample-taupe-tab.png",
      video: "",
      showInHero: false,
      description: "Warm taupe leather texture paired with gold detailing for a dressed-up look.",
    },
    {
      name: "Black Marble",
      material: "Carbon texture",
      color: "#111111",
      price: 50000,
      mediaType: "image",
      image: "assets/sample-carbon-veil.png",
      video: "",
      showInHero: false,
      description: "A dark carbon sample with stone-like contrast and a premium studio finish.",
    },
    {
      name: "Olive Smoke",
      material: "Matte silicone",
      color: "#475241",
      price: 40000,
      mediaType: "image",
      image: "assets/sample-olive-track.png",
      video: "",
      showInHero: false,
      description: "Muted olive texture with a smoky black backdrop and calm grip pattern.",
    },
    {
      name: "Noir Grid",
      material: "Matte silicone",
      color: "#171717",
      price: 39000,
      mediaType: "image",
      image: "",
      video: "",
      showInHero: false,
      description: "A black grid sample for testing dense product lists and page transitions.",
    },
    {
      name: "Ash Tab",
      material: "Vegan leather",
      color: "#665950",
      price: 47000,
      mediaType: "image",
      image: "assets/sample-taupe-tab.png",
      video: "",
      showInHero: false,
      description: "A soft ash-toned leather case with refined strap tab detailing.",
    },
    {
      name: "Carbon Loop",
      material: "Carbon texture",
      color: "#181818",
      price: 53000,
      mediaType: "image",
      image: "assets/sample-carbon-veil.png",
      video: "",
      showInHero: false,
      description: "Carbon texture and dark protective edges for a more technical setup.",
    },
    {
      name: "Moss Halo",
      material: "Matte silicone",
      color: "#394534",
      price: 45000,
      mediaType: "image",
      image: "assets/sample-moss-line.png",
      video: "",
      showInHero: false,
      description: "A green matte sample with a quiet halo of gold light in the product image.",
    },
  ];

  function defaultHeroSlides(sourceProducts = products) {
    const heroProducts = sourceProducts
      .map((product, index) => ({ product, index }))
      .filter(({ product }) => product.showInHero)
      .slice(0, 4);
    const source = heroProducts.length
      ? heroProducts
      : sourceProducts.slice(0, 4).map((product, index) => ({ product, index }));

    return source.map(({ product, index }, slideIndex) => ({
      id: `hero-slide-${slideIndex + 1}`,
      desktopImage: product.image || "assets/hero-cases.png",
      mobileImage: product.image || "assets/hero-cases.png",
      productIndex: index,
      isActive: true,
    }));
  }

  const defaults = {
    brandName: "VELTIER",
    pageTitle: "VELTIER - 프리미엄 핸드폰 케이스",
    heroImage: "assets/hero-cases.png",
    heroSlides: [],
    heroSlideInterval: 5,
    heroTransitionDuration: 650,
    heroMediaMode: "blend",
    heroMediaDarkness: 58,
    heroMediaFade: 72,
    responsive: {
      desktop: {
        heroLayout: "split",
        heroTextAlign: "left",
        heroMediaScale: 100,
        productPreviewCount: 8,
      },
      mobile: {
        heroLayout: "immersive",
        heroTextAlign: "center",
        heroMediaScale: 108,
        productPreviewCount: 4,
      },
    },
    goldFinish: true,
    colors: {
      accent: "#d6b25e",
      accentSoft: "#f3d891",
      accentWarm: "#b8892f",
    },
    integrations: {
      googleMapsApiKey: "",
      tossClientKey: "",
      supportEmail: "support@veltier.co",
      customDomain: "",
    },
    heroEyebrow: "Drop 01 / White Line",
    heroTitle: "케이스는 보호구가 아니라 세팅입니다.",
    heroSubtitle:
      "아이보리 사틴, 스모크 클리어, 스트랩 루프까지. 매일 들고 다니는 폰을 취향이 보이는 장비처럼 다시 맞춰보세요.",
    heroSpecs: ["Gold line", "39,000원부터", "오늘 주문 시 내일 출고"],
    primaryCta: "컬렉션 보기",
    secondaryCta: "배송 안내",
    priceNote: "7일 교환 · 3만원 이상 무료 배송 · 화이트 화면 마감",
    collectionEyebrow: "Current drop",
    collectionTitle: "흰 화면 위 또렷하게 보이는 케이스의 질감.",
    supportEyebrow: "After care",
    supportTitle: "판매 후에도 흐릿해지지 않는 기준.",
    products,
  };

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function safeColor(value, fallback = "#202124") {
    return /^#[0-9a-f]{6}$/i.test(String(value)) ? value : fallback;
  }

  function mediaSource(value) {
    const source = String(value || "").trim();
    if (!source) return "";

    const allowedScheme = /^(https?:|data:image\/|data:video\/)/i.test(source);
    const hasBlockedScheme = /^[a-z][a-z0-9+.-]*:/i.test(source) && !allowedScheme;
    if (hasBlockedScheme) return "";

    return source;
  }

  function productMediaKind(product) {
    const video = mediaSource(product && product.video);
    const image = mediaSource(product && product.image);

    if (product && product.mediaType === "video" && video) return "video";
    if (image) return "image";
    if (video) return "video";
    return "case";
  }

  function productHasMedia(product) {
    return productMediaKind(product) !== "case";
  }

  function productMediaMarkup(product, options = {}) {
    const item = product || {};
    const mediaClass = options.mediaClass || "product-media";
    const caseClass = options.caseClass || "";
    const name = escapeHtml(item.name || "상품");
    const kind = productMediaKind(item);

    if (kind === "video") {
      return `<video class="${mediaClass} product-media-video" src="${escapeHtml(mediaSource(item.video))}" autoplay muted loop playsinline></video>`;
    }

    if (kind === "image") {
      return `<img class="${mediaClass} product-media-image" src="${escapeHtml(mediaSource(item.image))}" alt="${name} 이미지" loading="lazy" />`;
    }

    return `<div class="case-mini ${caseClass}" style="--case-color: ${safeColor(item.color)}"></div>`;
  }

  function mergeProduct(baseProduct, savedProduct) {
    const fallback = baseProduct || products[0];
    const saved = savedProduct || {};
    const merged = { ...clone(fallback), ...saved };
    merged.name = String(merged.name || fallback.name);
    merged.material = String(merged.material || fallback.material);
    merged.color = safeColor(merged.color, fallback.color);
    merged.price = Number(merged.price) || Number(fallback.price) || 0;
    merged.mediaType = merged.mediaType === "video" ? "video" : "image";
    merged.image =
      typeof saved.image === "string" && saved.image.trim()
        ? saved.image
        : typeof fallback.image === "string"
          ? fallback.image
          : "";
    merged.video =
      typeof saved.video === "string" && saved.video.trim()
        ? saved.video
        : typeof fallback.video === "string"
          ? fallback.video
          : "";
    merged.showInHero = saved.showInHero === undefined ? Boolean(fallback.showInHero) : Boolean(saved.showInHero);
    merged.description = String(merged.description || fallback.description);
    return merged;
  }

  function clampRange(value, fallback, min, max) {
    const number = Number(value);
    const resolved = Number.isFinite(number) ? number : fallback;
    return Math.min(Math.max(resolved, min), max);
  }

  function mergeResponsiveProfile(baseProfile, savedProfile, device) {
    const saved = savedProfile || {};
    const desktopLayouts = ["split", "focus", "center"];
    const mobileLayouts = ["immersive", "compact", "poster"];
    const layouts = device === "mobile" ? mobileLayouts : desktopLayouts;
    const textAlignments = ["left", "center"];
    const previewBounds = device === "mobile" ? [2, 10] : [4, 12];

    return {
      heroLayout: layouts.includes(saved.heroLayout) ? saved.heroLayout : baseProfile.heroLayout,
      heroTextAlign: textAlignments.includes(saved.heroTextAlign) ? saved.heroTextAlign : baseProfile.heroTextAlign,
      heroMediaScale: clampRange(saved.heroMediaScale, Number(baseProfile.heroMediaScale) || 100, 80, 150),
      productPreviewCount: Math.round(
        clampRange(saved.productPreviewCount, Number(baseProfile.productPreviewCount) || previewBounds[0], previewBounds[0], previewBounds[1]),
      ),
    };
  }

  function mergeHeroSlides(baseSlides, savedSlides, sourceProducts) {
    if (!Array.isArray(savedSlides) || !savedSlides.length) return [];

    const productCount = Math.max((sourceProducts || []).length, 1);
    const fallbackSlides = Array.isArray(baseSlides) && baseSlides.length
      ? baseSlides
      : defaultHeroSlides(sourceProducts);

    return savedSlides.map((slide, index) => {
      const currentSlide = slide || {};
      const fallback = fallbackSlides[index] || fallbackSlides[0] || {};
      const productIndex = clampRange(currentSlide.productIndex, fallback.productIndex || 0, 0, productCount - 1);
      const desktopImage = mediaSource(currentSlide.desktopImage);
      const mobileImage = mediaSource(currentSlide.mobileImage) || desktopImage;

      return {
        id: String(currentSlide.id || fallback.id || `hero-slide-${index + 1}`),
        desktopImage,
        mobileImage,
        productIndex: Math.round(productIndex),
        isActive: currentSlide.isActive === undefined ? fallback.isActive !== false : Boolean(currentSlide.isActive),
      };
    });
  }

  function compactForUrl(settings) {
    const compact = clone(settings);

    if (compact.integrations) {
      compact.integrations.googleMapsApiKey = "";
      compact.integrations.tossClientKey = "";
    }

    compact.products = compact.products.map((product) => {
      const nextProduct = { ...product };
      if (/^data:/i.test(nextProduct.image || "")) delete nextProduct.image;
      if (/^data:/i.test(nextProduct.video || "")) delete nextProduct.video;
      return nextProduct;
    });

    compact.heroSlides = (compact.heroSlides || []).map((slide) => {
      const nextSlide = { ...slide };
      if (/^data:/i.test(nextSlide.desktopImage || "")) delete nextSlide.desktopImage;
      if (/^data:/i.test(nextSlide.mobileImage || "")) delete nextSlide.mobileImage;
      return nextSlide;
    });

    return compact;
  }

  function encodeSettings(settings) {
    const json = JSON.stringify(settings);
    const bytes = new TextEncoder().encode(json);
    let binary = "";
    bytes.forEach((byte) => {
      binary += String.fromCharCode(byte);
    });
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  }

  function decodeSettings(value) {
    const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes));
  }

  function mergeSettings(base, saved) {
    const merged = { ...clone(base), ...(saved || {}) };
    const mediaModes = ["blend", "fill", "focus"];

    if (saved) {
      if (saved.brandName === "Caseform") {
        merged.brandName = base.brandName;
      }
      if (saved.pageTitle === "Caseform - 화이트 프리미엄 핸드폰 케이스") {
        merged.pageTitle = base.pageTitle;
      }
      if (saved.heroImage === "assets/hero-cases-original.png") {
        merged.heroImage = base.heroImage;
      }
      if (saved.pageTitle === "Caseform - 블랙&골드 프리미엄 핸드폰 케이스") {
        merged.pageTitle = base.pageTitle;
      }
      if (saved.heroEyebrow === "Drop 01 / Gold Line") {
        merged.heroEyebrow = base.heroEyebrow;
      }
      if (saved.priceNote === "7일 교환 · 3만원 이상 무료 배송 · 블랙&골드 화면 마감") {
        merged.priceNote = base.priceNote;
      }
      if (saved.collectionTitle === "블랙 화면 위 골드 라인, 손에는 제품의 질감.") {
        merged.collectionTitle = base.collectionTitle;
      }
    }

    merged.colors = { ...base.colors, ...(saved && saved.colors ? saved.colors : {}) };
    merged.integrations = { ...base.integrations, ...(saved && saved.integrations ? saved.integrations : {}) };
    merged.responsive = {
      desktop: mergeResponsiveProfile(base.responsive.desktop, saved && saved.responsive ? saved.responsive.desktop : null, "desktop"),
      mobile: mergeResponsiveProfile(base.responsive.mobile, saved && saved.responsive ? saved.responsive.mobile : null, "mobile"),
    };
    if (Array.isArray(saved && saved.products)) {
      const productCount = Math.max(base.products.length, saved.products.length);
      merged.products = Array.from({ length: productCount }, (_, index) =>
        mergeProduct(base.products[index] || base.products[0], saved.products[index]),
      );
    } else {
      merged.products = base.products.map((product) => mergeProduct(product));
    }
    merged.heroSlides = mergeHeroSlides(
      base.heroSlides || defaultHeroSlides(merged.products),
      saved && saved.heroSlides,
      merged.products,
    );
    merged.heroSpecs =
      Array.isArray(saved && saved.heroSpecs) && saved.heroSpecs.length
        ? saved.heroSpecs
        : clone(base.heroSpecs);
    merged.heroSlideInterval = Math.min(
      Math.max(Number(merged.heroSlideInterval) || Number(base.heroSlideInterval) || 5, 2),
      30,
    );
    const heroTransitionDuration = Number(merged.heroTransitionDuration);
    merged.heroTransitionDuration = Math.min(
      Math.max(
        Number.isFinite(heroTransitionDuration)
          ? heroTransitionDuration
          : Number(base.heroTransitionDuration) || 650,
        150,
      ),
      1800,
    );
    merged.heroMediaMode = mediaModes.includes(merged.heroMediaMode)
      ? merged.heroMediaMode
      : base.heroMediaMode;
    const heroMediaDarkness = Number(merged.heroMediaDarkness);
    const heroMediaFade = Number(merged.heroMediaFade);
    merged.heroMediaDarkness = Math.min(
      Math.max(Number.isFinite(heroMediaDarkness) ? heroMediaDarkness : Number(base.heroMediaDarkness) || 58, 0),
      90,
    );
    merged.heroMediaFade = Math.min(
      Math.max(Number.isFinite(heroMediaFade) ? heroMediaFade : Number(base.heroMediaFade) || 72, 0),
      100,
    );
    return merged;
  }

  function load() {
    try {
      const url = new URL(window.location.href);
      const encodedSettings = url.searchParams.get("settings");
      const raw = localStorage.getItem(STORAGE_KEY);
      if (encodedSettings) {
        const localSettings = mergeSettings(defaults, raw ? JSON.parse(raw) : null);
        const fromUrl = mergeSettings(localSettings, decodeSettings(encodedSettings));
        save(fromUrl);
        return fromUrl;
      }

      return mergeSettings(defaults, raw ? JSON.parse(raw) : null);
    } catch (error) {
      console.warn("Caseform settings could not be loaded.", error);
      return clone(defaults);
    }
  }

  function save(settings) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mergeSettings(defaults, settings)));
  }

  function reset() {
    localStorage.removeItem(STORAGE_KEY);
    return clone(defaults);
  }

  function urlFor(path, settings, extra = {}) {
    const url = new URL(path, window.location.href);
    Object.entries(extra).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });

    const encodedSettings = encodeSettings(compactForUrl(mergeSettings(defaults, settings)));
    if (encodedSettings.length < 6000) {
      url.searchParams.set("settings", encodedSettings);
    }

    return url.pathname.split("/").pop() + url.search + url.hash;
  }

  window.CASEFORM_STORAGE_KEY = STORAGE_KEY;
  window.CASEFORM_DEFAULTS = clone(defaults);
  window.CaseformConfig = {
    load,
    save,
    reset,
    clone,
    mergeSettings,
    encodeSettings,
    decodeSettings,
    urlFor,
    escapeHtml,
    safeColor,
    mediaSource,
    productHasMedia,
    productMediaKind,
    productMediaMarkup,
  };
})();
