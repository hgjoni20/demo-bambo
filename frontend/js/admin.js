let availableCategories = [];
let loadedProducts = [];
let editingProductId = null;

// ===============================
// INIT & EVENT LISTENERS
// ===============================
document.addEventListener("DOMContentLoaded", () => {
  checkAdminSession();

  // Lidhja e eventeve kryesore
  const loginForm = document.getElementById("loginForm");
  if (loginForm) loginForm.addEventListener("submit", handleLogin);

  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) logoutBtn.addEventListener("click", handleLogout);

  const togglePasswordSecBtn = document.getElementById("togglePasswordSecBtn");
  if (togglePasswordSecBtn) togglePasswordSecBtn.addEventListener("click", togglePasswordSection);

  const cancelPasswordSecBtn = document.getElementById("cancelPasswordSecBtn");
  if (cancelPasswordSecBtn) cancelPasswordSecBtn.addEventListener("click", togglePasswordSection);

  const changePasswordForm = document.getElementById("changePasswordForm");
  if (changePasswordForm) changePasswordForm.addEventListener("submit", handleChangePassword);

  const addProductForm = document.getElementById("addProductForm");
  if (addProductForm) addProductForm.addEventListener("submit", submitProduct);

  const cancelEditBtn = document.getElementById("cancelEditBtn");
  if (cancelEditBtn) cancelEditBtn.addEventListener("click", resetAdminForm);

  const openCatModalBtn = document.getElementById("openCatModalBtn");
  if (openCatModalBtn) openCatModalBtn.addEventListener("click", openCategoryModal);

  const closeCatModalBtn = document.getElementById("closeCatModalBtn");
  if (closeCatModalBtn) closeCatModalBtn.addEventListener("click", closeCategoryModal);

  const saveCatBtn = document.getElementById("saveCatBtn");
  if (saveCatBtn) saveCatBtn.addEventListener("click", saveNewCategory);

  const addGarnishBtn = document.getElementById("addGarnishBtn");
  if (addGarnishBtn) addGarnishBtn.addEventListener("click", () => addGarnishField());

  // Lidhja e syrit për shfaqjen e fjalëkalimeve
  document.querySelectorAll(".toggle-password-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const fieldId = btn.dataset.target;
      togglePasswordVisibility(fieldId, btn);
    });
  });
});

async function checkAdminSession() {
  try {
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

function showAdminPanel() {
  document.getElementById("loginSection").classList.add("hidden");
  document.getElementById("adminPanelSection").classList.remove("hidden");

  resetAdminForm();
  loadAdminProducts();
}

// ===============================
// LOGIN & LOGOUT
// ===============================
async function handleLogin(event) {
  if (event) event.preventDefault();

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

async function handleLogout() {
  try {
    await fetch("/api/admin/logout", {
      method: "POST",
      credentials: "include",
    });
  } catch (err) {
    console.error("❌ Gabim gjatë logout:", err);
  }

  document.getElementById("adminPassword").value = "";
  showLoginSection();
  resetAdminForm();
}

// ===============================
// HELPERS
// ===============================
function pickLang(arr, lang) {
  if (!Array.isArray(arr)) return "";
  const found = arr.find((item) => item && item[lang] !== undefined && item[lang] !== "");
  if (found) return found[lang];
  const fallback = arr.find((item) => item && Object.values(item)[0]);
  return fallback ? Object.values(fallback)[0] : "";
}

function getProductLang(product, key, lang) {
  if (Array.isArray(product[key])) {
    return pickLang(product[key], lang);
  }
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
    } else if (product.category_sq) {
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
    container.innerHTML = `<p style="font-size:13px;color:gray">Nuk u gjetën kategori.</p>`;
    return;
  }

  availableCategories.forEach((cat, index) => {
    const label = document.createElement("label");
    label.className = "admin-checkbox-label";
    label.innerHTML = `
      <input type="checkbox" name="productCategories" value="${index}">
      ${escapeHtml(cat.sq)} / ${escapeHtml(cat.en)} / ${escapeHtml(cat.it)}
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

  const exists = availableCategories.some((c) => c.sq.toLowerCase() === sq.toLowerCase());
  if (!exists) {
    availableCategories.push({ sq, en, it });
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
    <input type="text" class="admin-input g-sq" placeholder="🇦🇱 Shqip">
    <input type="text" class="admin-input g-en" placeholder="🇬🇧 English">
    <input type="text" class="admin-input g-it" placeholder="🇮🇹 Italiano">
    <input type="number" class="admin-input g-price" placeholder="ALL">
    <button type="button" class="admin-garnish-del-btn" data-rowid="${rowId}">✕</button>
  `;

  // Lidhja e eventit per fshirjen e garniturës pa inline onclick
  row.querySelector(".admin-garnish-del-btn").addEventListener("click", () => {
    row.remove();
  });

  container.appendChild(row);
  return row;
}

function fillGarnishFields(garnishes) {
  const container = document.getElementById("garnishListContainer");
  container.innerHTML = "";

  if (!Array.isArray(garnishes)) return;

  garnishes.forEach((g) => {
    const row = addGarnishField();
    const name = g.name || g.sq || "";

    row.querySelector(".g-sq").value = g.sq || name;
    row.querySelector(".g-en").value = g.en || name;
    row.querySelector(".g-it").value = g.it || name;
    row.querySelector(".g-price").value = g.price ?? "";
  });
}

// ===============================
// EDIT & RESET PRODUCT
// ===============================
function startEditingProduct(product) {
  editingProductId = product.id;

  document.getElementById("prodNameSq").value = getProductLang(product, "name", "sq");
  document.getElementById("prodNameEn").value = getProductLang(product, "name", "en");
  document.getElementById("prodNameIt").value = getProductLang(product, "name", "it");

  document.getElementById("prodPriceNormal").value = product.Price?.normal ?? product.price ?? "";
  document.getElementById("prodPriceFamily").value = product.Price?.family ?? product.price_family ?? "";

  document.getElementById("prodDescSq").value = getProductLang(product, "description", "sq");
  document.getElementById("prodDescEn").value = getProductLang(product, "description", "en");
  document.getElementById("prodDescIt").value = getProductLang(product, "description", "it");

  let productCategories = [];
  if (Array.isArray(product.category)) {
    productCategories = product.category.map((c) => c.sq);
  } else if (product.category_sq) {
    productCategories = [product.category_sq];
  }

  document.querySelectorAll('input[name="productCategories"]').forEach((cb, index) => {
    const cat = availableCategories[index];
    cb.checked = cat && productCategories.includes(cat.sq);
  });

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

  const imageInput = document.getElementById("prodImageFile");
  imageInput.required = false;
  imageInput.value = "";

  document.getElementById("imageHint").classList.remove("hidden");
  document.getElementById("adminSubmitBtn").textContent = "Përditëso Produktin";
  document.getElementById("formTitle").textContent = "Edito Produktin";
  document.getElementById("cancelEditBtn").classList.remove("hidden");

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function resetAdminForm() {
  editingProductId = null;
  const form = document.getElementById("addProductForm");
  if (form) form.reset();

  document.querySelectorAll('input[name="productCategories"]').forEach((cb) => (cb.checked = false));

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
// CREATE / UPDATE / DELETE PRODUCT
// ===============================
async function submitProduct(event) {
  event.preventDefault();

  const selectedCategories = [];
  document.querySelectorAll('input[name="productCategories"]:checked').forEach((cb) => {
    const index = Number(cb.value);
    const cat = availableCategories[index];
    if (cat) {
      selectedCategories.push({ sq: cat.sq, en: cat.en, it: cat.it });
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
    { sq: document.getElementById("prodNameSq").value },
    { en: document.getElementById("prodNameEn").value || document.getElementById("prodNameSq").value },
    { it: document.getElementById("prodNameIt").value || document.getElementById("prodNameSq").value },
  ];

  const description = [
    { sq: document.getElementById("prodDescSq").value },
    { en: document.getElementById("prodDescEn").value },
    { it: document.getElementById("prodDescIt").value },
  ];

  formData.append("name", JSON.stringify(name));
  formData.append("category", JSON.stringify(selectedCategories));
  formData.append("description", JSON.stringify(description));
  formData.append("garnishes", JSON.stringify(garnishes));
  formData.append("price_normal", document.getElementById("prodPriceNormal").value);
  formData.append("price_family", document.getElementById("prodPriceFamily").value || "");

  if (imageFile) {
    formData.append("imageFile", imageFile);
  }

  const url = editingProductId ? `/api/admin/products/${editingProductId}` : "/api/admin/products";
  const method = editingProductId ? "PUT" : "POST";

  try {
    const response = await fetch(url, {
      method,
      body: formData,
      credentials: "include",
    });

    const data = await response.json();

    if (!response.ok) {
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

async function loadAdminProducts() {
  const container = document.getElementById("adminProductsList");
  if (!container) return;

  container.innerHTML = `<p class="error-msg">Duke ngarkuar produktet...</p>`;

  try {
    const response = await fetch("/api/admin/all-products", { credentials: "include" });

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
      container.innerHTML = `<p class="error-msg">Nuk ka produkte në databazë.</p>`;
      availableCategories = [];
      renderCategoriesCheckboxes();
      return;
    }

    extractCategoriesFromProducts(loadedProducts);
    renderAdminProducts(loadedProducts, container);
  } catch (err) {
    console.error("❌ LOAD PRODUCTS ERROR:", err);
    container.innerHTML = `<p class="error-msg">Gabim serveri: ${escapeHtml(err.message)}</p>`;
  }
}

function renderAdminProducts(products, container) {
  products.forEach((product) => {
    const card = document.createElement("div");
    card.className = "product-card";

    const name = escapeHtml(getProductLang(product, "name", "sq") || "Produkt");
    const price = product.Price?.normal ?? product.price ?? 0;
    const image = product.image || "assets/banneri.webp";

    card.innerHTML = `
      <img src="${escapeHtml(image)}" class="product-img" alt="${name}">
      <div class="product-info">
        <h3 class="product-name">${name}</h3>
        <span class="product-price">${price} ALL</span>
      </div>
      <div class="admin-card-actions">
        <button type="button" class="admin-edit-btn" data-id="${product.id}">Edito</button>
        <button type="button" class="admin-delete-btn" data-id="${product.id}">Fshi</button>
      </div>
    `;

    container.appendChild(card);
  });

  // Lidhja e eventeve për butonat e editimit
  container.querySelectorAll(".admin-edit-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const product = loadedProducts.find((p) => String(p.id) === btn.dataset.id);
      if (product) startEditingProduct(product);
    });
  });

  // Lidhja e eventeve për butonat e fshirjes
  container.querySelectorAll(".admin-delete-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      deleteProduct(btn.dataset.id);
    });
  });
}

async function deleteProduct(id) {
  const confirmDelete = confirm("A je i sigurt që dëshiron ta fshish këtë produkt?");
  if (!confirmDelete) return;

  try {
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

// ===============================
// CHANGE PASSWORD
// ===============================
async function handleChangePassword(event) {
  event.preventDefault();

  const currentPassword = document.getElementById("currentPassword").value;
  const newPassword = document.getElementById("newPassword").value;
  const confirmPassword = document.getElementById("confirmPassword").value;

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
    togglePasswordSection();
  } catch (err) {
    console.error("❌ Gabim gjatë ndryshimit të fjalëkalimit:", err);
    alert(err.message);
  }
}

// ===============================
// UI HELPERS (TOGGLERS)
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

function togglePasswordSection() {
  const card = document.getElementById("passwordSectionCard");
  card.classList.toggle("hidden");

  if (!card.classList.contains("hidden")) {
    document.getElementById("currentPassword").value = "";
    document.getElementById("newPassword").value = "";
    document.getElementById("confirmPassword").value = "";
  }
}