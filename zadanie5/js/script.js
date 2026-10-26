"use strict";

// Zdrojové dáta sa nemenia. Každé načítanie vráti ich hlbokú kópiu.
const PRODUCTS = [
  { id: 1, name: "Zvonček na bicykel", price: 8.5, tags: ["bike"] },
  { id: 2, name: "Fľaša na vodu", price: 12, tags: ["sport"] },
  { id: 3, name: "Svetlá na bicykel", price: 24.9, tags: ["bike", "safety"] },
];

// Doplnkové prezentačné údaje; logika obchodu potrebuje iba PRODUCTS.
const PRODUCT_DETAILS = {
  1: { image: "bell", category: "NA KAŽDÚ CESTU", description: "Jasný zvuk. Malý detail, ktorý vás dá počuť." },
  2: { image: "bottle", category: "ZOSTAŇTE V POHYBE", description: "Váš dúšok energie na každom kilometri." },
  3: { image: "lights", category: "VIDIEŤ A BYŤ VIDENÝ", description: "Predné a zadné svetlo pre bezpečnejšiu jazdu." },
};

const list = document.getElementById("products");
const statusText = document.getElementById("status");
const reloadButton = document.getElementById("reload");
const discountButton = document.getElementById("discount");
const cartItems = document.getElementById("cart-items");
const cart = []; // const bráni priradeniu nového poľa, nie použitiu push/splice.
let discountActive = false;

const currency = new Intl.NumberFormat("sk-SK", { style: "currency", currency: "EUR" });
const number = new Intl.NumberFormat("sk-SK", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function createProductElement(product) {
  const item = document.createElement("li");
  item.className = "product-card";
  const details = PRODUCT_DETAILS[product.id];

  const visual = document.createElement("div");
  visual.className = "product-visual";
  if (details) {
    const image = document.createElement("img");
    image.src = `assets/${details.image}.svg`;
    image.alt = ""; // Názov produktu je už vedľa obrázka.
    image.width = 240;
    image.height = 190;
    visual.append(image);
  }

  const content = document.createElement("div");
  content.className = "product-content";
  const category = document.createElement("p");
  category.className = "product-category";
  category.textContent = details?.category ?? "DOPLNOK";
  const name = document.createElement("h3");
  // Nikdy innerHTML: aj názov obsahujúci HTML sa zobrazí ako obyčajný text.
  name.textContent = product.name;
  const description = document.createElement("p");
  description.className = "product-description";
  description.textContent = details?.description ?? "Doplnok na vašu ďalšiu jazdu.";
  const price = document.createElement("p");
  price.className = "product-price";
  price.textContent = currency.format(product.price);
  const button = document.createElement("button");
  button.type = "button";
  button.className = "add-button";
  button.textContent = "Do košíka +";
  button.setAttribute("aria-label", `Do košíka: ${product.name}`);
  // Closure si zapamätá tento product, nie zdieľaný index cyklu s var.
  button.addEventListener("click", () => addToCart(product));

  content.append(category, name, description, price, button);
  item.append(visual, content);
  return item;
}

function renderProducts(products) {
  const fragment = document.createDocumentFragment();
  for (const product of products) {
    fragment.append(createProductElement(product));
  }
  // Nahradenie namiesto opakovaného append zabráni duplikátom po načítaní.
  list.replaceChildren(fragment);
}

function addToCart(product) {
  cart.push(product);
  renderCart();
}

function applyDiscount(items) {
  // Nové pole + nové objekty. Pôvodné ceny produktov zostávajú nedotknuté.
  return items.map((item) => ({ ...item, price: item.price * 0.9 }));
}

function renderCart() {
  const items = discountActive ? applyDiscount(cart) : cart;
  const subtotal = cart.reduce((sum, item) => sum + item.price, 0);
  const total = items.reduce((sum, item) => sum + item.price, 0);

  document.getElementById("cart-count").textContent = cart.length;
  document.getElementById("header-count").textContent = cart.length;
  document.getElementById("cart-total").textContent = number.format(total);
  document.getElementById("subtotal").textContent = currency.format(subtotal);
  document.getElementById("discount-amount").textContent = `−${currency.format(subtotal - total)}`;
  document.getElementById("discount-row").hidden = !discountActive;
  document.getElementById("cart-empty").hidden = cart.length > 0;

  const fragment = document.createDocumentFragment();
  for (const [index, item] of items.entries()) {
    const row = document.createElement("li");
    const name = document.createElement("span");
    name.className = "cart-item-name";
    name.textContent = item.name;
    const price = document.createElement("span");
    price.textContent = currency.format(item.price);
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "remove-button";
    remove.textContent = "×";
    remove.setAttribute("aria-label", `Odstrániť: ${item.name}`);
    remove.addEventListener("click", () => {
      cart.splice(index, 1);
      renderCart();
    });
    row.append(name, price, remove);
    fragment.append(row);
  }
  cartItems.replaceChildren(fragment);
}

function loadProducts() {
  // Toto nie je skutočný backend: setTimeout simuluje oneskorenie servera.
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (Math.random() < 0.3) {
        reject(new Error("Server neodpovedá"));
      } else {
        // Spread by ponechal spoločné vnorené pole tags; structuredClone nie.
        resolve(structuredClone(PRODUCTS));
      }
    }, 1500);
  });
}

async function showProducts() {
  statusText.textContent = "Načítavam…";
  statusText.setAttribute("data-state", "loading");
  reloadButton.disabled = true;
  list.setAttribute("aria-busy", "true");

  try {
    const products = await loadProducts();
    renderProducts(products);
    statusText.textContent = `Načítaných produktov: ${products.length}`;
    statusText.setAttribute("data-state", "success");
  } catch (error) {
    statusText.textContent = `Chyba: ${error.message}. Skúste to znova.`;
    statusText.setAttribute("data-state", "error");
    // Už načítaný katalóg aj košík ostávajú použiteľné pri chybe servera.
  } finally {
    reloadButton.disabled = false;
    list.setAttribute("aria-busy", "false");
  }
}

discountButton.addEventListener("click", () => {
  discountActive = !discountActive;
  discountButton.setAttribute("aria-pressed", String(discountActive));
  document.getElementById("discount-label").textContent = discountActive ? "Zrušiť zľavu" : "Zľava 10 %";
  renderCart();
});
reloadButton.addEventListener("click", showProducts);

// Až na konci: všetky const premenné vyššie už boli inicializované.
showProducts();
