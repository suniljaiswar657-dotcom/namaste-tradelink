const state = {
  store: null,
  products: [],
  category: "All",
  cart: []
};

const $ = (id) => document.getElementById(id);

async function loadStore() {
  try {
    const res = await fetch("/api/store");
    const data = await res.json();

    state.store = data.store;
    state.products = data.products || [];

    renderStore();
    renderCategories();
    renderProducts();
  } catch (err) {
    console.error(err);
    $("products").innerHTML =
      "<p>Store data load nahi ho raha. Please refresh.</p>";
  }
}

function renderStore() {
  const s = state.store;

  $("phone").textContent = s.phone || "9833667188";
  $("call").href = "tel:" + (s.phone || "9833667188");

  $("address").textContent = s.address || "";
  $("map").href = s.maps || "#";
  $("map").target = "_blank";

  const wa = s.whatsapp || "919833667188";

  $("wa").href =
    "https://wa.me/" + wa;

  $("wa").target = "_blank";

  $("heroWa").href =
    "https://wa.me/" + wa +
    "?text=" +
    encodeURIComponent(
      "Hello Namaste Tradelink, mujhe mobile/electronics ke baare mein enquiry karni hai."
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

  $("cats").innerHTML = categories
    .map(c => `
      <button
        class="${state.category === c ? "active" : ""}"
        onclick="setCategory('${escapeHtml(c)}')"
      >
        ${escapeHtml(c)}
      </button>
    `)
    .join("");
}

function setCategory(category) {
  state.category = category;
  renderCategories();
  renderProducts();
}

function renderProducts() {
  const q = ($("q").value || "").toLowerCase().trim();

  let list = state.products.filter(p => {
    const categoryOK =
      state.category === "All" ||
      p.category === state.category;

    const searchOK =
      !q ||
      String(p.name).toLowerCase().includes(q) ||
      String(p.category).toLowerCase().includes(q);

    return categoryOK && searchOK;
  });

  if (!list.length) {
    $("products").innerHTML =
      "<p>No products found.</p>";
    return;
  }

  $("products").innerHTML = list.map(p => `
    <article class="card">
      <div class="icon">${p.icon || "📦"}</div>

      <h3>${escapeHtml(p.name)}</h3>

      <p>${escapeHtml(p.category || "Product")}</p>

      <div class="price">
        ${
          Number(p.price) > 0
            ? "₹" + Number(p.price).toLocaleString("en-IN")
            : "Price on enquiry"
        }
      </div>

      <p>
        ${
          Number(p.stock) > 0
            ? "Stock: " + p.stock
            : "Stock confirmation available"
        }
      </p>

      <button onclick="addToCart(${p.id})">
        Add to Cart
      </button>
    </article>
  `).join("");
}

function addToCart(id) {
  const product = state.products.find(p => p.id === id);

  if (!product) return;

  const existing = state.cart.find(x => x.id === id);

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
  state.cart = state.cart.filter(x => x.id !== id);
  renderCart();
}

function changeQty(id, amount) {
  const item = state.cart.find(x => x.id === id);

  if (!item) return;

  item.qty += amount;

  if (item.qty <= 0) {
    removeFromCart(id);
    return;
  }

  renderCart();
}

function renderCart() {
  const count = state.cart.reduce(
    (sum, item) => sum + item.qty,
    0
  );

  $("cartCount").textContent = count;

  if (!state.cart.length) {
    $("cartItems").innerHTML =
      "<p>Your cart is empty.</p>";

    $("sum").textContent = "₹0";
    return;
  }

  $("cartItems").innerHTML = state.cart.map(item => `
    <div class="cartrow">

      <div>
        <b>${escapeHtml(item.name)}</b>
        <div>
          ${
            item.price > 0
              ? "₹" + item.price.toLocaleString("en-IN")
              : "Price on enquiry"
          }
        </div>

        <div>
          <button onclick="changeQty(${item.id},-1)">−</button>
          ${item.qty}
          <button onclick="changeQty(${item.id},1)">+</button>
        </div>
      </div>

      <button onclick="removeFromCart(${item.id})">
        Remove
      </button>

    </div>
  `).join("");

  const total = state.cart.reduce(
    (sum, item) => sum + item.price * item.qty,
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

  const name = $("name").value.trim();
  const mobile = $("mobile").value.trim();
  const note = $("note").value.trim();

  if (!name || !mobile) {
    alert("Name aur mobile number enter karo.");
    return;
  }

  const messageLines = [
    "Hello Namaste Tradelink 👋",
    "",
    "New Order / Enquiry",
    "Name: " + name,
    "Mobile: " + mobile,
    "",
    "Products:"
  ];

  state.cart.forEach(item => {
    messageLines.push(
      `• ${item.name} × ${item.qty}`
    );
  });

  if (note) {
    messageLines.push("");
    messageLines.push("Note: " + note);
  }

  const total = state.cart.reduce(
    (sum, item) => sum + item.price * item.qty,
    0
  );

  if (total > 0) {
    messageLines.push("");
    messageLines.push(
      "Catalogue total: ₹" +
      total.toLocaleString("en-IN")
    );
  }

  messageLines.push("");
  messageLines.push(
    "Please confirm final price and stock."
  );

  const wa =
    state.store?.whatsapp ||
    "919833667188";

  const url =
    "https://wa.me/" +
    wa +
    "?text=" +
    encodeURIComponent(messageLines.join("\n"));

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
