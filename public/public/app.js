const state = {
  store: null,
  products: [],
  category: "All",
  cart: []
};

const $ = (id) => document.getElementById(id);

async function loadStore() {
  try {
    const res = await fetch("/api/store", {
      cache: "no-store"
    });

    if (!res.ok) {
      throw new Error("API error " + res.status);
    }

    const data = await res.json();

    console.log("STORE DATA:", data);

    state.store = data.store || {};
    state.products = Array.isArray(data.products)
      ? data.products
      : [];

    renderStore();
    renderCategories();
    renderProducts();
  } catch (err) {
    console.error("LOAD ERROR:", err);

    $("phone").textContent = "9833667188";
    $("address").textContent = "Kalyan, Maharashtra";

    $("products").innerHTML =
      "<p>Products load nahi ho rahe. Please refresh.</p>";
  }
}

function renderStore() {
  const s = state.store || {};

  const phone = s.phone || "9833667188";
  const whatsapp = s.whatsapp || "919833667188";

  $("phone").textContent = phone;

  $("call").href =
    "tel:" + phone;

  $("address").textContent =
    s.address ||
    "Kalyan, Maharashtra";

  $("map").href =
    s.maps ||
    "https://www.google.com/maps/search/?api=1&query=Namaste+Tradelink+Kalyan";

  $("map").target = "_blank";

  $("wa").href =
    "https://wa.me/" + whatsapp;

  $("wa").target = "_blank";

  $("heroWa").href =
    "https://wa.me/" +
    whatsapp +
    "?text=" +
    encodeURIComponent(
      "Hello Namaste Tradelink 👋 Mujhe mobile/electronics ke baare mein enquiry karni hai."
    );

  $("heroWa").target = "_blank";
}

function renderCategories() {
  const categories = [
    "All",
    ...new Set(
      state.products
        .map(p => p.category)
        .filter(Boolean)
    )
  ];

  $("cats").innerHTML =
    categories.map(category => `
      <button
        class="${state.category === category ? "active" : ""}"
        onclick="setCategory(${JSON.stringify(category)})"
      >
        ${escapeHtml(category)}
      </button>
    `).join("");
}

function setCategory(category) {
  state.category = category;

  renderCategories();
  renderProducts();
}

function renderProducts() {
  const search =
    ($("q").value || "")
      .toLowerCase()
      .trim();

  const products =
    state.products.filter(product => {

      const categoryOK =
        state.category === "All" ||
        product.category === state.category;

      const searchOK =
        !search ||
        String(product.name)
          .toLowerCase()
          .includes(search) ||
        String(product.category)
          .toLowerCase()
          .includes(search);

      return categoryOK && searchOK;
    });

  if (!products.length) {
    $("products").innerHTML =
      "<p>No products found.</p>";
    return;
  }

  $("products").innerHTML =
    products.map(product => {

      const price =
        Number(product.price) || 0;

      const stock =
        Number(product.stock) || 0;

      return `
        <article class="card">

          <div class="icon">
            ${escapeHtml(product.icon || "📦")}
          </div>

          <h3>
            ${escapeHtml(product.name)}
          </h3>

          <p>
            ${escapeHtml(product.category || "Product")}
          </p>

          <div class="price">
            ${
              price > 0
                ? "₹" + price.toLocaleString("en-IN")
                : "Price on enquiry"
            }
          </div>

          <p>
            ${
              stock > 0
                ? "Stock: " + stock
                : "Stock confirmation available"
            }
          </p>

          <button onclick="addToCart(${product.id})">
            Add to Cart
          </button>

        </article>
      `;

    }).join("");
}

function addToCart(id) {
  const product =
    state.products.find(p => p.id === id);

  if (!product) return;

  const existing =
    state.cart.find(item => item.id === id);

  if (existing) {
    existing.qty++;
  } else {
    state.cart.push({
      id: product.id,
      name: product.name,
      price: Number(product.price) || 0,
      qty: 1
    });
  }

  renderCart();
  openCart();
}

function removeFromCart(id) {
  state.cart =
    state.cart.filter(item => item.id !== id);

  renderCart();
}

function changeQty(id, amount) {
  const item =
    state.cart.find(x => x.id === id);

  if (!item) return;

  item.qty += amount;

  if (item.qty <= 0) {
    removeFromCart(id);
    return;
  }

  renderCart();
}

function renderCart() {
  const count =
    state.cart.reduce(
      (total, item) => total + item.qty,
      0
    );

  $("cartCount").textContent = count;

  if (!state.cart.length) {
    $("cartItems").innerHTML =
      "<p>Your cart is empty.</p>";

    $("sum").textContent = "₹0";

    return;
  }

  $("cartItems").innerHTML =
    state.cart.map(item => `

      <div class="cartrow">

        <div>

          <b>
            ${escapeHtml(item.name)}
          </b>

          <div>
            ${
              item.price > 0
                ? "₹" +
                  item.price.toLocaleString("en-IN")
                : "Price on enquiry"
            }
          </div>

          <div>

            <button
              onclick="changeQty(${item.id},-1)"
            >
              −
            </button>

            ${item.qty}

            <button
              onclick="changeQty(${item.id},1)"
            >
              +
            </button>

          </div>

        </div>

        <button
          onclick="removeFromCart(${item.id})"
        >
          Remove
        </button>

      </div>

    `).join("");

  const total =
    state.cart.reduce(
      (sum, item) =>
        sum + item.price * item.qty,
      0
    );

  $("sum").textContent =
    total > 0
      ? "₹" + total.toLocaleString("en-IN")
      : "Price on enquiry";
}

function openCart() {
  $("cart").classList.add("open");
  $("shade").classList.add("open");
}

function closeCart() {
  $("cart").classList.remove("open");
  $("shade").classList.remove("open");
}

async function placeOrder() {

  if (!state.cart.length) {
    alert("Cart empty hai.");
    return;
  }

  const name =
    $("name").value.trim();

  const mobile =
    $("mobile").value.trim();

  const note =
    $("note").value.trim();

  if (!name || !mobile) {
    alert(
      "Name aur mobile number enter karo."
    );
    return;
  }

  const items =
    state.cart.map(item => ({
      id: item.id,
      qty: item.qty
    }));

  try {

    await fetch("/api/orders", {
      method: "POST",

      headers: {
        "Content-Type":
          "application/json"
      },

      body: JSON.stringify({
        name,
        phone: mobile,
        note,
        items
      })
    });

  } catch (error) {

    console.error(
      "Order save error:",
      error
    );
  }

  const message = [

    "Hello Namaste Tradelink 👋",

    "",

    "New Order / Enquiry",

    "Name: " + name,

    "Mobile: " + mobile,

    "",

    "Products:",

    ...state.cart.map(
      item =>
        `• ${item.name} × ${item.qty}`
    ),

    ...(note
      ? ["", "Note: " + note]
      : []),

    "",

    "Please confirm final price and stock."

  ].join("\n");

  const whatsapp =
    state.store?.whatsapp ||
    "919833667188";

  const url =
    "https://wa.me/" +
    whatsapp +
    "?text=" +
    encodeURIComponent(message);

  window.open(url, "_blank");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

$("q").addEventListener(
  "input",
  renderProducts
);

$("cartOpen").addEventListener(
  "click",
  openCart
);

$("close").addEventListener(
  "click",
  closeCart
);

$("shade").addEventListener(
  "click",
  closeCart
);

$("order").addEventListener(
  "click",
  placeOrder
);

loadStore();
