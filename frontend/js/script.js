let currentLang = localStorage.getItem('bambo_lang') || 'sq'; 
let activeMainCat = "All"; 
let menuData = []; 

const translations = {
  sq: { all: "Të gjitha", search: "Kërko ushqimin ose pijen..." },
  en: { all: "All", search: "Search food or drink..." },
  it: { all: "Tutti", search: "Cerca cibo o bevande..." }
};

document.addEventListener("DOMContentLoaded", async () => {
  const langSelector = document.getElementById("langSelector");
  if (langSelector) langSelector.value = currentLang;

  await loadMenuData();
  applyStaticTranslations();
  initCategories(); 
});

async function loadMenuData() {
  const cachedData = localStorage.getItem('bambo_menu_data');
  if (cachedData) {
    menuData = JSON.parse(cachedData);
  }

  try {
    const response = await fetch('/api/menu');
    if (!response.ok) throw new Error("Dështoi marrja e të dhënave nga serveri");
    
    const data = await response.json();
    menuData = data;
    localStorage.setItem('bambo_menu_data', JSON.stringify(data));
  } catch (error) {
    console.error("Duke përdorur të dhënat e ruajtura lokalisht:", error);
    if (!menuData.length) {
      menuData = []; 
    }
  }
}

function changeLanguage(lang) {
  if (translations[lang]) {
    currentLang = lang;
    localStorage.setItem('bambo_lang', lang);
    applyStaticTranslations();
    initCategories(); 
    closeMenuDrawer();
  }
}

function applyStaticTranslations() {
  const t = translations[currentLang];
  const searchInput = document.getElementById("searchInput");
  if (searchInput) searchInput.placeholder = t.search;
}

function toggleSearch() {
  const container = document.getElementById("searchSlideContainer");
  const input = document.getElementById("searchInput");
  if (!container || !input) return;
  container.classList.toggle("active");
  
  if (container.classList.contains("active")) {
    input.focus();
  } else {
    if (input.value !== "") {
      input.value = "";
      renderProducts(); 
    }
  }
}

function openMenuDrawer() {
  const overlay = document.getElementById("drawerOverlay");
  if (overlay) overlay.classList.add("active");
  document.body.classList.add("no-scroll");
}

function closeMenuDrawer() {
  const overlay = document.getElementById("drawerOverlay");
  if (overlay) overlay.classList.remove("active");
  document.body.classList.remove("no-scroll");
}

function openGarnishPopup(product) {
  const existing = document.getElementById("garnishModal");
  if (existing) existing.remove();

  document.body.classList.add("no-scroll");

  const modal = document.createElement("div");
  modal.id = "garnishModal";
  modal.className = "modal-overlay"; 

  // Marrim garniturat për gjuhën aktuale
  let garnishesArray = [];
  if (product.garnishes) {
    if (Array.isArray(product.garnishes)) {
      // Nëse është array, marrim elementin e gjuhës aktuale ose e parserojmë
      const langObj = product.garnishes.find(g => g[currentLang]) || product.garnishes[0];
      if (langObj && langObj[currentLang]) {
        garnishesArray = typeof langObj[currentLang] === 'string' 
          ? JSON.parse(langObj[currentLang]) 
          : langObj[currentLang];
      } else if (typeof product.garnishes === 'string') {
        garnishesArray = JSON.parse(product.garnishes);
      }
    }
  }

  const garnishesList = garnishesArray.map((g, index) => {
    const garnishName = g.name || "";
    const garnishPrice = g.price ? Number(g.price) : 0;
    const garnishPriceText = garnishPrice > 0 ? ` (+${garnishPrice} ALL)` : '';
    
    return `
      <label class="modal-option-label">
        <input type="radio" name="garnish" value="${index}" data-price="${garnishPrice}" data-name="${garnishName}"> 
        <span>${garnishName} ${garnishPriceText}</span>
      </label>
    `;
  }).join('');

  const basePrice = product.Price && product.Price.normal ? Number(product.Price.normal) : (Number(product.Price) || 0);

  const finalPriceLabel = currentLang === 'en' ? 'Final Price:' : currentLang === 'it' ? 'Prezzo Finale:' : 'Çmimi Final:';
  const modalTitle = currentLang === 'en' ? 'Choose Garnish' : currentLang === 'it' ? 'Scegli Contorno' : 'Zgjidh Garniturën';
  const selectButtonText = currentLang === 'en' ? 'Select' : currentLang === 'it' ? 'Seleziona' : 'Përzgjidh';
  const dishText = currentLang === 'en' ? 'For dish:' : currentLang === 'it' ? 'Per il piatto:' : 'Për pjatën:';

  modal.innerHTML = `
    <div class="modal-box">
      <h3 class="modal-title">${modalTitle}</h3>
      <p class="modal-subtitle">${dishText} <strong>${getLangValue(product.name)}</strong></p>
      <div class="modal-options-list">
        ${garnishesList}
      </div>
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; font-weight: bold; color: var(--accent-gold);">
        <span>${finalPriceLabel}</span>
        <span id="modalFinalPrice">${basePrice} ALL</span>
      </div>
      <button id="closeGarnishModal" class="modal-submit-btn">${selectButtonText}</button>
    </div>
  `;

  document.body.appendChild(modal);

  const radioButtons = modal.querySelectorAll('input[name="garnish"]');
  radioButtons.forEach(radio => {
    radio.onchange = () => {
      const extraPrice = Number(radio.dataset.price) || 0;
      const finalTotal = basePrice + extraPrice;
      document.getElementById("modalFinalPrice").innerText = `${finalTotal} ALL`;
    };
  });
  
  const closeModal = () => {
    modal.remove();
    document.body.classList.remove("no-scroll");
  };

  document.getElementById("closeGarnishModal").onclick = closeModal;
  modal.onclick = (e) => { if (e.target === modal) closeModal(); };
}

window.onscroll = function() {
  const backBtn = document.getElementById("backToTopBtn");
  if (!backBtn) return;
  if (document.body.scrollTop > 300 || document.documentElement.scrollTop > 300) {
    backBtn.classList.add("show");
  } else {
    backBtn.classList.remove("show");
  }
};

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function getLangValue(arr) {
  if (!arr || !Array.isArray(arr)) return "";
  const match = arr.find(item => item[currentLang]);
  return match ? match[currentLang] : (arr[0] ? Object.values(arr[0])[0] : "");
}

function initCategories() {
  const uniqueCats = [...new Set(menuData.map(item => getLangValue(item.category)))].filter(Boolean);
  const allCats = ["All", ...uniqueCats];
  
  if (!activeMainCat || !allCats.includes(activeMainCat)) {
    activeMainCat = "All";
  }
  
  renderMainCategories(allCats);
  renderProducts();
}

function renderMainCategories(cats) {
  const container = document.getElementById("mainCategories");
  if (!container) return;
  container.innerHTML = "";

  cats.forEach(cat => {
    const btn = document.createElement("button");
    btn.className = `cat-btn ${cat === activeMainCat ? "active" : ""}`;
    
    if (cat === "All") {
      btn.innerText = translations[currentLang].all;
    } else {
      btn.innerText = cat;
    }

    btn.onclick = (e) => {
      activeMainCat = cat;
      renderMainCategories(cats);
      renderProducts();
      e.target.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    };
    container.appendChild(btn);
  });

  container.onwheel = (e) => {
    if (e.deltaY !== 0) {
      e.preventDefault();
      container.scrollLeft += e.deltaY * 1.5;
    }
  };

  enableDragScroll(container);
}

function enableDragScroll(container) {
  if (container.dataset.dragEnabled) return;
  container.dataset.dragEnabled = "true";

  let isDown = false;
  let startX = 0;
  let scrollStart = 0;
  let moved = false;

  const DRAG_THRESHOLD = 6;

  container.addEventListener("mousedown", (e) => {
    isDown = true;
    moved = false;
    startX = e.pageX;
    scrollStart = container.scrollLeft;
  });

  window.addEventListener("mouseup", () => {
    isDown = false;
    container.classList.remove("dragging");
  });

  container.addEventListener("mouseleave", () => {
    isDown = false;
    container.classList.remove("dragging");
  });

  container.addEventListener("mousemove", (e) => {
    if (!isDown) return;
    const delta = e.pageX - startX;
    if (Math.abs(delta) > DRAG_THRESHOLD) {
      if (!moved) {
        moved = true;
        container.classList.add("dragging");
      }
      e.preventDefault();
      container.scrollLeft = scrollStart - delta;
    }
  });

  container.addEventListener(
    "click",
    (e) => {
      if (moved) {
        e.stopPropagation();
        e.preventDefault();
      }
    },
    true
  );
}

function renderProducts(searchQuery = "") {
  const container = document.getElementById("productsList");
  const titleEl = document.getElementById("currentCategoryTitle");
  if (!container) return;
  container.innerHTML = "";

  if (titleEl) {
    titleEl.innerText = (activeMainCat === "All") ? translations[currentLang].all : activeMainCat;
  }

  const filteredProducts = menuData.filter(item => {
    const itemCat = getLangValue(item.category);
    const matchesCategory = (activeMainCat === "All") || (itemCat === activeMainCat);
    
    const nameStr = getLangValue(item.name).toLowerCase();
    const descStr = getLangValue(item.description).toLowerCase();
    const query = searchQuery.toLowerCase();
    const matchesSearch = !query || nameStr.includes(query) || descStr.includes(query);

    return matchesCategory && matchesSearch;
  });

  if (filteredProducts.length === 0) {
    container.innerHTML = `<p class="error-msg">${currentLang === 'en' ? 'No products found.' : currentLang === 'it' ? 'Nessun prodotto trovato.' : 'Nuk ka produkte në këtë kategori.'}</p>`;
    return;
  }

  filteredProducts.forEach(product => {
    const card = document.createElement("div");
    card.className = "product-card";

    let priceHtml = "";
    if (product.Price) {
      if (product.Price.family) {
        priceHtml = `<div class="pizza-prices">
          <span>Normal: ${product.Price.normal} ALL</span>
          <span>Family: ${product.Price.family} ALL</span>
        </div>`;
      } else {
        priceHtml = `<span class="product-price">${product.Price.normal} ALL</span>`;
      }
    }

    const imageSrc = (product.image && product.image !== "null" && product.image.trim() !== "") 
      ? product.image 
      : "assets/banneri.webp";
    const productName = getLangValue(product.name);
    const productDesc = getLangValue(product.description);

    let actionButtonHtml = "";
    
    const hasValidGarnishes = product.garnishes && Array.isArray(product.garnishes) && product.garnishes.some(g => {
      const text = g[currentLang] || g.sq || Object.values(g)[0] || "";
      return text.trim() !== "";
    });

    if (hasValidGarnishes) {
      actionButtonHtml = `<button class="garnish-toggle-btn" title="Zgjidh Garniturën">+</button>`;
    }

    card.innerHTML = `
      <img src="${imageSrc}" alt="${productName}" class="product-img" loading="lazy">
      <div class="product-info">
        <h3 class="product-name">${productName}</h3>
        <p class="product-desc">${productDesc || ''}</p>
        <div class="product-footer">
          ${priceHtml}
          ${actionButtonHtml}
        </div>
      </div>
    `;

    if (hasValidGarnishes) {
      const btn = card.querySelector(".garnish-toggle-btn");
      if (btn) {
        btn.onclick = (e) => {
          e.stopPropagation();
          openGarnishPopup(product);
        };
      }
    }

    container.appendChild(card);
  });
}