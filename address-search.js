(function () {
  const KOREA = "KR";
  const DAUM_POSTCODE_URL = "https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";
  const GOOGLE_MAPS_URL = "https://maps.googleapis.com/maps/api/js";
  const scriptPromises = new Map();

  const countries = [
    ["KR", "대한민국"],
    ["US", "미국"],
    ["JP", "일본"],
    ["CN", "중국"],
    ["TW", "대만"],
    ["HK", "홍콩"],
    ["SG", "싱가포르"],
    ["AU", "호주"],
    ["CA", "캐나다"],
    ["GB", "영국"],
    ["FR", "프랑스"],
    ["DE", "독일"],
  ];

  function normalizeCountryCode(value) {
    const code = String(value || KOREA).trim().toUpperCase();
    return /^[A-Z]{2}$/.test(code) ? code : KOREA;
  }

  function getGoogleApiKey() {
    const settings = window.CaseformConfig?.load ? window.CaseformConfig.load() : {};
    return String(
      window.CaseformGoogleMapsApiKey ||
        window.CASEFORM_GOOGLE_MAPS_API_KEY ||
        settings?.integrations?.googleMapsApiKey ||
        "",
    ).trim();
  }

  function setStatus(statusNode, message) {
    if (!statusNode || !message) return;
    statusNode.textContent = message;
  }

  function loadScript(id, src) {
    if (scriptPromises.has(id)) return scriptPromises.get(id);

    const existing = document.querySelector(`script[data-loader-id="${id}"]`);
    if (existing) {
      const existingPromise = new Promise((resolve, reject) => {
        existing.addEventListener("load", resolve, { once: true });
        existing.addEventListener("error", reject, { once: true });
      });
      scriptPromises.set(id, existingPromise);
      return existingPromise;
    }

    const promise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = src;
      script.async = true;
      script.defer = true;
      script.dataset.loaderId = id;
      script.addEventListener("load", resolve, { once: true });
      script.addEventListener("error", () => reject(new Error("주소 검색 스크립트를 불러오지 못했습니다.")), {
        once: true,
      });
      document.head.appendChild(script);
    });

    scriptPromises.set(id, promise);
    return promise;
  }

  async function ensureDaumPostcode() {
    if (window.daum?.Postcode) return;
    await loadScript("daum-postcode", DAUM_POSTCODE_URL);
  }

  async function ensureGooglePlaces() {
    if (window.google?.maps?.places?.Autocomplete) return;

    const key = getGoogleApiKey();
    if (!key) {
      throw new Error("해외 주소 자동완성은 Google Maps API 키를 넣으면 사용할 수 있습니다.");
    }

    const url = `${GOOGLE_MAPS_URL}?key=${encodeURIComponent(key)}&libraries=places&v=weekly`;
    await loadScript("google-maps-places", url);
  }

  function fillCountryOptions(select) {
    if (!select || select.options.length) return;
    countries.forEach(([code, label]) => {
      const option = document.createElement("option");
      option.value = code;
      option.textContent = label;
      select.appendChild(option);
    });
  }

  function componentValue(place, type) {
    const component = (place.address_components || []).find((item) => item.types.includes(type));
    return component?.long_name || "";
  }

  function shortComponentValue(place, type) {
    const component = (place.address_components || []).find((item) => item.types.includes(type));
    return component?.short_name || component?.long_name || "";
  }

  function applyGooglePlace(form, place) {
    const postalCode = [
      componentValue(place, "postal_code"),
      componentValue(place, "postal_code_suffix"),
    ].filter(Boolean).join("-");
    const street = [
      componentValue(place, "street_number"),
      componentValue(place, "route"),
    ].filter(Boolean).join(" ");
    const city =
      componentValue(place, "locality") ||
      componentValue(place, "postal_town") ||
      componentValue(place, "sublocality") ||
      componentValue(place, "administrative_area_level_2");
    const state = shortComponentValue(place, "administrative_area_level_1");
    const country = shortComponentValue(place, "country");
    const secondary = [city, state, country].filter(Boolean).join(", ");

    if (form.elements.postalCode) form.elements.postalCode.value = postalCode || form.elements.postalCode.value;
    if (form.elements.address1) form.elements.address1.value = street || place.formatted_address || form.elements.address1.value;
    if (form.elements.address2 && !form.elements.address2.value) form.elements.address2.value = secondary;
    form.elements.address2?.focus();
  }

  async function openKoreanPostcode(form, statusNode) {
    await ensureDaumPostcode();

    new window.daum.Postcode({
      oncomplete(data) {
        const roadAddress = data.roadAddress || data.address || data.jibunAddress || "";
        if (form.elements.countryCode) form.elements.countryCode.value = KOREA;
        if (form.elements.postalCode) form.elements.postalCode.value = data.zonecode || "";
        if (form.elements.address1) form.elements.address1.value = roadAddress;
        form.elements.address2?.focus();
        setStatus(statusNode, "주소를 가져왔습니다. 상세 주소를 입력해주세요.");
      },
    }).open();
  }

  function bindAddressForm(form, options = {}) {
    if (!form) return;

    const statusNode = options.statusNode || null;
    const countrySelect = form.elements.countryCode;
    const searchButton = form.querySelector("[data-address-search]");
    const helper = form.querySelector("[data-address-helper]");
    const addressInput = form.elements.address1;
    let autocomplete = null;
    let autocompleteCountry = "";

    fillCountryOptions(countrySelect);
    if (countrySelect && !countrySelect.value) countrySelect.value = KOREA;

    async function connectGoogleAutocomplete() {
      if (!addressInput || !countrySelect) return;
      const country = normalizeCountryCode(countrySelect.value);
      if (country === KOREA) return;

      await ensureGooglePlaces();
      if (autocomplete && autocompleteCountry === country) return;

      autocomplete = new window.google.maps.places.Autocomplete(addressInput, {
        componentRestrictions: { country: country.toLowerCase() },
        fields: ["address_components", "formatted_address"],
        types: ["address"],
      });
      autocompleteCountry = country;
      autocomplete.addListener("place_changed", () => {
        const place = autocomplete.getPlace();
        if (place) applyGooglePlace(form, place);
      });
      setStatus(statusNode, "해외 주소 자동완성이 연결되었습니다. 주소 입력 후 목록에서 선택해주세요.");
    }

    function syncMode() {
      const country = normalizeCountryCode(countrySelect?.value);
      const isKorea = country === KOREA;
      form.dataset.addressMode = isKorea ? "kr" : "global";

      if (searchButton) {
        searchButton.textContent = isKorea ? "주소 검색" : "자동완성 연결";
        searchButton.setAttribute("aria-label", isKorea ? "국내 도로명 주소 검색" : "해외 주소 자동완성 연결");
      }

      if (addressInput) {
        addressInput.placeholder = isKorea
          ? "주소 검색을 눌러 도로명 주소를 선택하세요"
          : "Street address or building name";
      }

      if (helper) {
        helper.textContent = isKorea
          ? "국내 배송지는 Kakao/Daum 우편번호 검색으로 도로명주소와 우편번호를 가져옵니다."
          : getGoogleApiKey()
            ? "해외 배송지는 Google Places 자동완성으로 주소 후보를 가져옵니다."
            : "Google Maps API 키를 넣으면 해외 주소 자동완성을 사용할 수 있습니다.";
      }

      if (!isKorea) {
        connectGoogleAutocomplete().catch((error) => setStatus(statusNode, error.message));
      }
    }

    countrySelect?.addEventListener("change", syncMode);
    addressInput?.addEventListener("focus", () => {
      if (normalizeCountryCode(countrySelect?.value) !== KOREA) {
        connectGoogleAutocomplete().catch((error) => setStatus(statusNode, error.message));
      }
    });

    searchButton?.addEventListener("click", async () => {
      try {
        if (normalizeCountryCode(countrySelect?.value) === KOREA) {
          await openKoreanPostcode(form, statusNode);
          return;
        }
        await connectGoogleAutocomplete();
        addressInput?.focus();
      } catch (error) {
        setStatus(statusNode, error.message || "주소 검색을 시작하지 못했습니다.");
      }
    });

    syncMode();
  }

  window.CaseformAddressSearch = {
    bindAddressForm,
    fillCountryOptions,
    openKoreanPostcode,
  };
})();
