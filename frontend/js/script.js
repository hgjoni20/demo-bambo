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

  const garnishesList = product.Granishes.map(g => {
    const garnishName = typeof g === 'object' ? (g[currentLang] || g.sq || Object.values(g)[0]) : g;
    const garnishPrice = g.price ? ` (+${g.price} ALL)` : '';
    return `
      <label class="modal-option-label">
        <input type="radio" name="garnish" value="${garnishName}"> ${garnishName} ${garnishPrice}
      </label>
    `;
  }).join('');

  modal.innerHTML = `
    <div class="modal-box">
      <h3 class="modal-title">${currentLang === 'en' ? 'Choose Garnish' : currentLang === 'it' ? 'Scegli Contorno' : 'Zgjidh Garniturën'}</h3>
      <p class="modal-subtitle">Për pjatën: <strong>${getLangValue(product.name)}</strong></p>
      <div class="modal-options-list">
        ${garnishesList}
      </div>
      <button id="closeGarnishModal" class="modal-submit-btn">${currentLang === 'en' ? 'Select' : currentLang === 'it' ? 'Seleziona' : 'Përzgjidh'}</button>
    </div>
  `;

  document.body.appendChild(modal);
  
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

  // Scroll horizontal me rrotullën e mouse-it në PC
  container.onwheel = (e) => {
    if (e.deltaY !== 0) {
      e.preventDefault();
      container.scrollLeft += e.deltaY * 1.5;
    }
  };

  enableDragScroll(container);
}


function enableDragScroll(container) {
  if (container.dataset.dragEnabled) return; // mos e lidh 2 herë
  container.dataset.dragEnabled = "true";

  let isDown = false;
  let startX = 0;
  let scrollStart = 0;
  let moved = false;

  const DRAG_THRESHOLD = 6; // px minimale për ta konsideruar "tërheqje" jo "klik"

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
        container.classList.add("dragging"); // tani aktivizohet pointer-events:none te butonat
      }
      e.preventDefault();
      container.scrollLeft = scrollStart - delta;
    }
  });

  // Pengon që klikimi (butoni i kategorisë) të aktivizohet
  // rastësisht nëse useri po tërhiqte (dragging), jo duke klikuar.
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

    card.innerHTML = `
      <img src="${imageSrc}" alt="${productName}" class="product-img">
      <div class="product-info">
        <h3 class="product-name">${productName}</h3>
        <p class="product-desc">${productDesc || ''}</p>
        <div class="product-footer">
          ${priceHtml}
        </div>
      </div>
    `;

    if (product.Granishes && Array.isArray(product.Granishes) && product.Granishes.length > 0) {
      card.classList.add("clickable-card");
      card.onclick = () => openGarnishPopup(product);
    }

    container.appendChild(card);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const searchInput = document.getElementById("searchInput");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      renderProducts(e.target.value);
    });
  }
});