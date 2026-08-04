let availableCategories = [];
let loadedProducts = [];
let editingProductId = null;

// ===============================
// INIT
// ===============================

// FIX KRITIK: më parë kontrollohej vetëm sessionStorage.getItem("bambo_admin_logged"),
// një flamur i thjeshtë që KUSHDO mund ta vendoste manualisht nga DevTools
// (Console: sessionStorage.setItem("bambo_admin_logged","true")) dhe të hynte
// në panel pa fjalëkalim fare! Tani kontrollohet SESIONI REAL nga serveri.
document.addEventListener("DOMContentLoaded", () => {
  checkAdminSession();
});

async function checkAdminSession() {
  try {
    // FIX: kërkon te backend nëse ka sesion admin valid (kërkon route të re
    // GET /api/admin/check, e mbrojtur me requireAdmin — shto te admin.js backend)
    const res = await fetch("/api/admin/check", { credentials: "include" });
    if (res.ok) {
      showAdminPanel();
    } else {
      showLoginSection();
    }
  } catch (err) {
    console.error("❌ Gabim gjatë kontrollit të sesionit:", err);
    showLoginSection();
  }
}

function showLoginSection() {
  document.getElementById("loginSection").classList.remove("hidden");
  document.getElementById("adminPanelSection").classList.add("hidden");
}

// ===============================
// LOGIN
// ===============================

// FIX: fjalëkalimi NUK kontrollohet më në frontend (ADMIN_PASSWORD_HASH u hoq
// plotësisht). Tani dërgohet te backend, i cili e krahason me bcrypt kundrejt
// hash-it të ruajtur në .env (ADMIN_PASSWORD_HASH) — asnjë fjalëkalim nuk
// ekziston më si tekst i lexueshëm në kodin e klientit.
async function handleLogin() {
  const passInput = document.getElementById("adminPassword");
  const errorText = document.getElementById("loginError");
  const password = passInput.value;

  try {
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include", // FIX: e DETYRUESHME që browser-i të pranojë/dërgojë cookie-n e sesionit
      body: JSON.stringify({ password }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(data.error || "Fjalëkalim i gabuar!");
    }

    errorText.classList.add("hidden");
    passInput.value = "";
    showAdminPanel();
  } catch (err) {
    console.error("❌ Gabim gjatë login:", err);
    errorText.textContent = err.message || "Fjalëkalim i gabuar!";
    errorText.classList.remove("hidden");
    passInput.value = "";
  }
}

async function handleLogout() {
  try {
    // FIX: logout tani i thotë realisht SERVERIT ta shkatërrojë sesionin
    // (req.session.destroy() te backend), jo thjesht të fshijë një flamur lokal
    // që s'mbronte asgjë. credentials:'include' i domosdoshëm që cookie-n e
    // sesionit ta dërgojë browser-i bashkë me kërkesën.
    await fetch("/api/admin/logout", {
      method: "POST",
      credentials: "include",
    });
  } catch (err) {
    console.error("❌ Gabim gjatë logout (do vazhdohet gjithsesi):", err);
  }

  document.getElementById("adminPassword").value = "";
  showLoginSection();
  resetAdminForm();
}

// ===============================
// SHOW PANEL
// ===============================

function showAdminPanel() {
  document.getElementById("loginSection").classList.add("hidden");
  document.getElementById("adminPanelSection").classList.remove("hidden");

  resetAdminForm();
  loadAdminProducts();
}

// ===============================
// HELPERS
// ===============================

function pickLang(arr, lang) {
  if (!Array.isArray(arr)) return "";

  const found = arr.find(
    (item) => item && item[lang] !== undefined && item[lang] !== "",
  );

  if (found) return found[lang];

  const fallback = arr.find((item) => item && Object.values(item)[0]);

  return fallback ? Object.values(fallback)[0] : "";
}

// merr gjuhën edhe nga DB direkt
function getProductLang(product, key, lang) {
  // struktura JSON
  if (Array.isArray(product[key])) {
    return pickLang(product[key], lang);
  }

  // struktura SQLite direkte
  const dbKey = `${key}_${lang}`;

  return product[dbKey] || "";
}

function escapeHtml(str) {
  const div = document.createElement("div");

  div.textContent = String(str ?? "");

  return div.innerHTML;
}

// ===============================
// CATEGORY SYSTEM
// ===============================

function extractCategoriesFromProducts(products) {
  const categoryMap = new Map();

  products.forEach((product) => {
    // JSON format
    if (Array.isArray(product.category)) {
      product.category.forEach((cat) => {
        if (cat && cat.sq) {
          categoryMap.set(cat.sq, {
            sq: cat.sq,
            en: cat.en || cat.sq,
            it: cat.it || cat.sq,
          });
        }
      });
    }
    // SQLite format fallback
    else if (product.category_sq) {
      categoryMap.set(product.category_sq, {
        sq: product.category_sq,
        en: product.category_en || product.category_sq,
        it: product.category_it || product.category_sq,
      });
    }
  });

  availableCategories = Array.from(categoryMap.values());

  renderCategoriesCheckboxes();
}

function renderCategoriesCheckboxes() {
  const container = document.getElementById("categoriesCheckboxContainer");

  if (!container) return;

  container.innerHTML = "";

  if (availableCategories.length === 0) {
    container.innerHTML = `
    <p style="font-size:13px;color:gray">
    Nuk u gjetën kategori.
    </p>
    `;

    return;
  }

  availableCategories.forEach((cat, index) => {
    const label = document.createElement("label");

    label.className = "admin-checkbox-label";

    label.innerHTML = `
      <input 
      type="checkbox"
      name="productCategories"
      value="${index}"
      >

      ${escapeHtml(cat.sq)}
      /
      ${escapeHtml(cat.en)}
      /
      ${escapeHtml(cat.it)}

      `;

    container.appendChild(label);
  });
}

function openCategoryModal() {
  document.getElementById("categoryModal").classList.remove("hidden");

  document.body.classList.add("no-scroll");
}

function closeCategoryModal() {
  document.getElementById("categoryModal").classList.add("hidden");

  document.body.classList.remove("no-scroll");

  document.getElementById("newCatSq").value = "";
  document.getElementById("newCatEn").value = "";
  document.getElementById("newCatIt").value = "";
}

function saveNewCategory() {
  const sq = document.getElementById("newCatSq").value.trim();

  const en = document.getElementById("newCatEn").value.trim() || sq;

  const it = document.getElementById("newCatIt").value.trim() || sq;

  if (!sq) {
    alert("Vendos emrin shqip të kategorisë");

    return;
  }

  const exists = availableCategories.some(
    (c) => c.sq.toLowerCase() === sq.toLowerCase(),
  );

  if (!exists) {
    availableCategories.push({
      sq,
      en,
      it,
    });

    renderCategoriesCheckboxes();
  }

  closeCategoryModal();
}

// ===============================
// GARNISH SYSTEM
// ===============================

function addGarnishField() {
  const container = document.getElementById("garnishListContainer");

  const rowId = Date.now() + Math.floor(Math.random() * 1000);

  const row = document.createElement("div");

  row.className = "admin-garnish-row";

  row.id = `garnishRow_${rowId}`;

  row.innerHTML = `
  <input 
  type="text"
  class="admin-input g-sq"
  placeholder="🇦🇱 Shqip">


  <input 
  type="text"
  class="admin-input g-en"
  placeholder="🇬🇧 English">


  <input 
  type="text"
  class="admin-input g-it"
  placeholder="🇮🇹 Italiano">


  <input 
  type="number"
  class="admin-input g-price"
  placeholder="ALL">


  <button
  type="button"
  class="admin-garnish-del-btn"
  onclick="removeGarnishField('${rowId}')">
  ✕
  </button>
  `;

  container.appendChild(row);

  return row;
}

function removeGarnishField(rowId) {
  const row = document.getElementById(`garnishRow_${rowId}`);

  if (row) row.remove();
}

function fillGarnishFields(garnishes) {
  const container = document.getElementById("garnishListContainer");

  container.innerHTML = "";

  if (!Array.isArray(garnishes)) return;

  garnishes.forEach((g) => {
    const row = addGarnishField();

    row.querySelector(".g-sq").value = g.sq || "";

    row.querySelector(".g-en").value = g.en || g.sq || "";

    row.querySelector(".g-it").value = g.it || g.sq || "";

    row.querySelector(".g-price").value = g.price || "";
  });
}

// ===============================
// EDIT PRODUCT
// ===============================

function startEditingProduct(product) {
  editingProductId = product.id;

  // NAME
  document.getElementById("prodNameSq").value = getProductLang(
    product,
    "name",
    "sq",
  );

  document.getElementById("prodNameEn").value = getProductLang(
    product,
    "name",
    "en",
  );

  document.getElementById("prodNameIt").value = getProductLang(
    product,
    "name",
    "it",
  );

  // PRICE
  document.getElementById("prodPriceNormal").value =
    product.Price?.normal ?? product.price ?? "";

  document.getElementById("prodPriceFamily").value =
    product.Price?.family ?? product.price_family ?? "";

  // DESCRIPTION
  document.getElementById("prodDescSq").value = getProductLang(
    product,
    "description",
    "sq",
  );

  document.getElementById("prodDescEn").value = getProductLang(
    product,
    "description",
    "en",
  );

  document.getElementById("prodDescIt").value = getProductLang(
    product,
    "description",
    "it",
  );

  // CATEGORY CHECKBOXES
  let productCategories = [];

  if (Array.isArray(product.category)) {
    productCategories = product.category.map((c) => c.sq);
  } else if (product.category_sq) {
    productCategories = [product.category_sq];
  }

  document
    .querySelectorAll('input[name="productCategories"]')
    .forEach((cb, index) => {
      const cat = availableCategories[index];

      cb.checked = cat && productCategories.includes(cat.sq);
    });

  // GARNISHES
  let garnishes = [];

  if (product.Granishes) {
    garnishes = product.Granishes;
  } else if (product.garnishes_sq) {
    try {
      garnishes = JSON.parse(product.garnishes_sq);
    } catch {
      garnishes = [];
    }
  }

  fillGarnishFields(garnishes);

  // IMAGE
  const imageInput = document.getElementById("prodImageFile");

  imageInput.required = false;

  imageInput.value = "";

  document.getElementById("imageHint").classList.remove("hidden");

  document.getElementById("adminSubmitBtn").textContent = "Përditëso Produktin";

  document.getElementById("formTitle").textContent = "Edito Produktin";

  document.getElementById("cancelEditBtn").classList.remove("hidden");

  window.scrollTo({
    top: 0,
    behavior: "smooth",
  });
}

// ===============================
// RESET FORM
// ===============================

function resetAdminForm() {
  editingProductId = null;

  const form = document.getElementById("addProductForm");

  if (form) form.reset();

  document
    .querySelectorAll('input[name="productCategories"]')
    .forEach((cb) => (cb.checked = false));

  const garnish = document.getElementById("garnishListContainer");

  if (garnish) garnish.innerHTML = "";

  const imageInput = document.getElementById("prodImageFile");

  if (imageInput) {
    imageInput.required = true;

    imageInput.value = "";
  }

  const hint = document.getElementById("imageHint");

  if (hint) hint.classList.add("hidden");

  const btn = document.getElementById("adminSubmitBtn");

  if (btn) btn.textContent = "Shto Produktin";

  const title = document.getElementById("formTitle");

  if (title) title.textContent = "Shto Produkt të Ri";

  const cancel = document.getElementById("cancelEditBtn");

  if (cancel) cancel.classList.add("hidden");
}

// ===============================
// CREATE / UPDATE PRODUCT
// ===============================

async function submitProduct(event) {
  event.preventDefault();

  const selectedCategories = [];

  document
    .querySelectorAll('input[name="productCategories"]:checked')
    .forEach((cb) => {
      const index = Number(cb.value);

      const cat = availableCategories[index];

      if (cat) {
        selectedCategories.push({
          sq: cat.sq,
          en: cat.en,
          it: cat.it,
        });
      }
    });

  if (selectedCategories.length === 0) {
    alert("Zgjidh të paktën një kategori");

    return;
  }

  const garnishes = [];

  document.querySelectorAll(".admin-garnish-row").forEach((row) => {
    const sq = row.querySelector(".g-sq").value.trim();

    if (sq) {
      garnishes.push({
        sq,

        en: row.querySelector(".g-en").value.trim() || sq,

        it: row.querySelector(".g-it").value.trim() || sq,

        price: Number(row.querySelector(".g-price").value) || 0,
      });
    }
  });

  const imageFile = document.getElementById("prodImageFile").files[0];

  if (!editingProductId && !imageFile) {
    alert("Ngarko imazhin e produktit");

    return;
  }

  const formData = new FormData();

  const name = [
    {
      sq: document.getElementById("prodNameSq").value,
    },

    {
      en:
        document.getElementById("prodNameEn").value ||
        document.getElementById("prodNameSq").value,
    },

    {
      it:
        document.getElementById("prodNameIt").value ||
        document.getElementById("prodNameSq").value,
    },
  ];

  const description = [
    {
      sq: document.getElementById("prodDescSq").value,
    },

    {
      en: document.getElementById("prodDescEn").value,
    },

    {
      it: document.getElementById("prodDescIt").value,
    },
  ];

  formData.append("name", JSON.stringify(name));

  formData.append("category", JSON.stringify(selectedCategories));

  formData.append("description", JSON.stringify(description));

  formData.append("garnishes", JSON.stringify(garnishes));

  formData.append(
    "price_normal",
    document.getElementById("prodPriceNormal").value,
  );

  formData.append(
    "price_family",
    document.getElementById("prodPriceFamily").value || "",
  );

  if (imageFile) {
    formData.append("imageFile", imageFile);
  }

  const url = editingProductId
    ? `/api/admin/products/${editingProductId}`
    : "/api/admin/products";

  const method = editingProductId ? "PUT" : "POST";

  try {
    // FIX: credentials:'include' i shtuar — pa këtë, browser-i S'E dërgon cookie-n
    // e sesionit bashkë me kërkesën, dhe requireAdmin te backend do ta refuzonte
    // GJITHMONË me 401, edhe pse je loguar saktë.
    const response = await fetch(url, {
      method,
      body: formData,
      credentials: "include",
    });

    const data = await response.json();

    if (!response.ok) {
      // FIX: nëse sesioni ka skaduar ndërkohë (401), ridrejto te login në vend
      // të një alert konfuz "Gabim serveri"
      if (response.status === 401) {
        alert("Sesioni yt ka skaduar. Ju lutem kyçuni përsëri.");
        showLoginSection();
        return;
      }
      throw new Error(data.error || "Gabim serveri");
    }

    alert(editingProductId ? "Produkti u përditësua!" : "Produkti u shtua!");

    location.reload();
  } catch (err) {
    console.error(err);

    alert(err.message);
  }
}

// ===============================
// LOAD PRODUCTS
// ===============================

async function loadAdminProducts() {
  const container = document.getElementById("adminProductsList");

  if (!container) return;

  container.innerHTML = `
 <p class="error-msg">
 Duke ngarkuar produktet...
 </p>
 `;

  try {
    // FIX: credentials:'include' — nëse edhe /api/admin/all-products mbrohet
    // me requireAdmin (rekomandohet), pa këtë kërkesa do refuzohej gjithmonë.
    const response = await fetch("/api/admin/all-products", {
      credentials: "include",
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));

      if (response.status === 401) {
        showLoginSection();
        return;
      }

      throw new Error(errorData.error || `Server error ${response.status}`);
    }

    const products = await response.json();

    loadedProducts = Array.isArray(products) ? products : [];

    container.innerHTML = "";

    if (loadedProducts.length === 0) {
      container.innerHTML = `
  <p class="error-msg">
  Nuk ka produkte në databazë.
  </p>
  `;

      availableCategories = [];

      renderCategoriesCheckboxes();

      return;
    }

    extractCategoriesFromProducts(loadedProducts);

    renderAdminProducts(loadedProducts, container);
  } catch (err) {
    console.error("❌ LOAD PRODUCTS ERROR:", err);

    container.innerHTML = `
 <p class="error-msg">
 Gabim serveri:
 ${escapeHtml(err.message)}
 </p>
 `;
  }
}

// ===============================
// RENDER PRODUCTS
// ===============================

function renderAdminProducts(products, container) {
  products.forEach((product) => {
    const card = document.createElement("div");

    card.className = "product-card";

    const name = escapeHtml(getProductLang(product, "name", "sq") || "Produkt");

    const price = product.Price?.normal ?? product.price ?? 0;

    const image = product.image || "assets/banneri.webp";

    card.innerHTML = `
 
 <img 
 src="${escapeHtml(image)}"
 class="product-img"
 alt="${name}"
 >


 <div class="product-info">

 <h3 class="product-name">
 ${name}
 </h3>


 <span class="product-price">
 ${price} ALL
 </span>


 </div>



 <div class="admin-card-actions">


 <button
 type="button"
 class="admin-edit-btn"
 data-id="${product.id}">
 Edito
 </button>



 <button
 type="button"
 class="admin-delete-btn"
 data-id="${product.id}">
 Fshi
 </button>



 </div>


 `;

    container.appendChild(card);
  });

  // EDIT BUTTONS
  container.querySelectorAll(".admin-edit-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const product = loadedProducts.find(
        (p) => String(p.id) === btn.dataset.id,
      );

      if (product) {
        startEditingProduct(product);
      }
    });
  });

  // DELETE BUTTONS
  container.querySelectorAll(".admin-delete-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      deleteProduct(btn.dataset.id);
    });
  });
}

// ===============================
// DELETE PRODUCT
// ===============================

async function deleteProduct(id) {
  const confirmDelete = confirm(
    "A je i sigurt që dëshiron ta fshish këtë produkt?",
  );

  if (!confirmDelete) return;

  try {
    // FIX: credentials:'include' i shtuar, njësoj si te submitProduct
    const response = await fetch(`/api/admin/products/${id}`, {
      method: "DELETE",
      credentials: "include",
    });

    const data = await response.json();

    if (!response.ok) {
      if (response.status === 401) {
        alert("Sesioni yt ka skaduar. Ju lutem kyçuni përsëri.");
        showLoginSection();
        return;
      }
      throw new Error(data.error || "Gabim gjatë fshirjes");
    }

    alert("Produkti u fshi me sukses!");

    if (editingProductId == id || editingProductId == Number(id)) {
      resetAdminForm();
    }

    loadAdminProducts();
  } catch (err) {
    console.error("❌ DELETE ERROR:", err);

    alert(err.message);
  }
}

async function handleChangePassword(event) {
  event.preventDefault();

  const currentPassword = document.getElementById("currentPassword").value;
  const newPassword = document.getElementById("newPassword").value;

  if (newPassword.length < 6) {
    alert("Fjalëkalimi i ri duhet të ketë të paktën 6 karaktere.");
    return;
  }

  try {
    const response = await fetch("/api/admin/password", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ currentPassword, newPassword }),
    });

    const data = await response.json();

    if (!response.ok) {
      if (response.status === 401) {
        alert("Sesioni yt ka skaduar. Ju lutem kyçuni përsëri.");
        showLoginSection();
        return;
      }
      throw new Error(data.error || "Dështoi ndryshimi i fjalëkalimit.");
    }

    alert(data.message || "Fjalëkalimi u ndryshua me sukses!");
    
    document.getElementById("currentPassword").value = "";
    document.getElementById("newPassword").value = "";

  } catch (err) {
    console.error("❌ Gabim gjatë ndryshimit të fjalëkalimit:", err);
    alert(err.message);
  }
}


// ===============================
// PASSWORD VISIBILITY TOGGLE (SYRI)
// ===============================
function togglePasswordVisibility(fieldId, btn) {
  const input = document.getElementById(fieldId);
  if (input.type === "password") {
    input.type = "text";
    btn.textContent = "🙈";
  } else {
    input.type = "password";
    btn.textContent = "👁️";
  }
}

// ===============================
// TOGGLE PASSWORD SECTION (HAP/MBYLL)
// ===============================
function togglePasswordSection() {
  const card = document.getElementById("passwordSectionCard");
  card.classList.toggle("hidden");
  
  if (!card.classList.contains("hidden")) {
    // Pastro fushat kur hapet
    document.getElementById("currentPassword").value = "";
    document.getElementById("newPassword").value = "";
    document.getElementById("confirmPassword").value = "";
  }
}

// ===============================
// LOGIN (I përshtatur për form submit / Enter)
// ===============================
async function handleLogin(event) {
  if (event) event.preventDefault(); // Parandalon rifreskimin e faqes dhe kap Enter nga PC

  const passInput = document.getElementById("adminPassword");
  const errorText = document.getElementById("loginError");
  const password = passInput.value;

  try {
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ password }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(data.error || "Fjalëkalim i gabuar!");
    }

    errorText.classList.add("hidden");
    passInput.value = "";
    showAdminPanel();
  } catch (err) {
    console.error("❌ Gabim gjatë login:", err);
    errorText.textContent = err.message || "Fjalëkalim i gabuar!";
    errorText.classList.remove("hidden");
    passInput.value = "";
  }
}

// ===============================
// CHANGE PASSWORD (Me validim në frontend për dy fushat e reja)
// ===============================
async function handleChangePassword(event) {
  event.preventDefault();

  const currentPassword = document.getElementById("currentPassword").value;
  const newPassword = document.getElementById("newPassword").value;
  const confirmPassword = document.getElementById("confirmPassword").value;

  // Validim në frontend: Krahasimi nqs fjalëkalimet e reja janë të barabarta
  if (newPassword !== confirmPassword) {
    alert("Fjalëkalimet e reja nuk përputhen me njëra-tjetrën!");
    return;
  }

  if (newPassword.length < 6) {
    alert("Fjalëkalimi i ri duhet të ketë të paktën 6 karaktere.");
    return;
  }

  try {
    const response = await fetch("/api/admin/password", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ currentPassword, newPassword }),
    });

    const data = await response.json();

    if (!response.ok) {
      if (response.status === 401) {
        alert("Sesioni yt ka skaduar. Ju lutem kyçuni përsëri.");
        showLoginSection();
        return;
      }
      throw new Error(data.error || "Dështoi ndryshimi i fjalëkalimit.");
    }

    alert(data.message || "Fjalëkalimi u ndryshua me sukses!");
    
    // Mbyll seksionin dhe pastro fushat pas suksesit
    togglePasswordSection();

  } catch (err) {
    console.error("❌ Gabim gjatë ndryshimit të fjalëkalimit:", err);
    alert(err.message);
  }
}