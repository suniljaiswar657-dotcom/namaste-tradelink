let token = localStorage.getItem("nt_admin_token");

const $ = id => document.getElementById(id);

async function api(url, options = {}) {
  options.headers = {
    ...(options.headers || {}),
    "Content-Type": "application/json"
  };

  if (token) {
    options.headers.Authorization = "Bearer " + token;
  }

  const res = await fetch(url, options);

  if (res.status === 401) {
    logout();
    throw new Error("Session expired");
  }

  return res.json();
}

$("login").onclick = async () => {
  try {
    const data = await api("/api/login", {
      method: "POST",
      body: JSON.stringify({
        username: $("username").value,
        password: $("password").value
      })
    });

    if (!data.token) {
      alert("Wrong username/password");
      return;
    }

    token = data.token;
    localStorage.setItem("nt_admin_token", token);

    showDashboard();
  } catch (e) {
    alert("Login failed");
  }
};

function logout() {
  token = null;
  localStorage.removeItem("nt_admin_token");

  $("dashboard").hidden = true;
  $("loginBox").hidden = false;
}

$("logout").onclick = logout;

async function showDashboard() {
  if (!token) return;

  try {
    const data = await api("/api/admin");

    $("loginBox").hidden = true;
    $("dashboard").hidden = false;

    fillStore(data.store);
    renderStats(data.stats);
    renderProducts(data.products);
    renderOrders(data.orders);
  } catch (e) {
    logout();
  }
}

function fillStore(s) {
  $("sName").value = s.name || "";
  $("sPhone").value = s.phone || "";
  $("sWhatsApp").value = s.whatsapp || "";
  $("sUpi").value = s.upi || "";
  $("sAddress").value = s.address || "";
  $("sMaps").value = s.maps || "";
}

function renderStats(stats) {
  $("ordersCount").textContent = stats.orders || 0;

  $("orderValue").textContent =
    "₹" +
    Number(stats.value || 0).toLocaleString("en-IN");

  $("stockCount").textContent =
    stats.stock || 0;
}

$("saveStore").onclick = async () => {
  await api("/api/store", {
    method: "PUT",
    body: JSON.stringify({
      name: $("sName").value,
      phone: $("sPhone").value,
      whatsapp: $("sWhatsApp").value,
      upi: $("sUpi").value,
      address: $("sAddress").value,
      maps: $("sMaps").value
    })
  });

  alert("Store settings saved");
};

$("addProduct").onclick = async () => {
  const name = $("pName").value.trim();

  if (!name) {
    alert("Product name enter karo");
    return;
  }

  await api("/api/products", {
    method: "POST",
    body: JSON.stringify({
      name,
      category: $("pCategory").value || "Other",
      price: Number($("pPrice").value) || 0,
      stock: Number($("pStock").value) || 0,
      icon: $("pIcon").value || "📦"
    })
  });

  $("pName").value = "";
  $("pCategory").value = "";
  $("pPrice").value = "";
  $("pStock").value = "";
  $("pIcon").value = "";

  await showDashboard();

  alert("Product added");
};

function renderProducts(products) {
  if (!products.length) {
    $("products").innerHTML =
      "<p>No products.</p>";
    return;
  }

  $("products").innerHTML = products.map(p => `
    <div class="product">

      <input
        data-field="name"
        value="${esc(p.name)}"
      >

      <input
        data-field="category"
        value="${esc(p.category)}"
      >

      <input
        data-field="price"
        type="number"
        value="${p.price || 0}"
      >

      <input
        data-field="stock"
        type="number"
        value="${p.stock || 0}"
      >

      <button
        onclick="saveProduct(${p.id},this)"
      >
        Save
      </button>

    </div>
  `).join("");
}

async function saveProduct(id, button) {
  const row = button.parentElement;

  const get = field =>
    row.querySelector(
      `[data-field="${field}"]`
    ).value;

  await api("/api/products/" + id, {
    method: "PUT",
    body: JSON.stringify({
      name: get("name"),
      category: get("category"),
      price: Number(get("price")) || 0,
      stock: Number(get("stock")) || 0,
      icon: "📦"
    })
  });

  button.textContent = "Saved";

  setTimeout(() => {
    button.textContent = "Save";
  }, 1200);
}

function renderOrders(orders) {
  if (!orders.length) {
    $("orders").innerHTML =
      "<p>No orders yet.</p>";
    return;
  }

  $("orders").innerHTML = orders.map(o => `
    <div class="order">

      <b>Order #${o.id}</b>

      <br>

      Customer:
      ${esc(o.customer_name)}

      <br>

      Phone:
      ${esc(o.phone)}

      <br>

      Total:
      ₹${Number(o.total || 0).toLocaleString("en-IN")}

      <br>

      Status:

      <select
        onchange="changeOrderStatus(${o.id},this.value)"
      >
        ${["NEW","CONFIRMED","READY","COMPLETED","CANCELLED"]
          .map(status =>
            `<option
              ${o.status === status ? "selected" : ""}
            >${status}</option>`
          )
          .join("")
        }
      </select>

      <br>

      ${o.items.map(item =>
        `• ${esc(item.name)} × ${item.qty}`
      ).join("<br>")}

    </div>
  `).join("");
}

async function changeOrderStatus(id,status) {
  await api("/api/orders/" + id, {
    method: "PATCH",
    body: JSON.stringify({status})
  });

  alert("Order status updated");
}

function esc(value) {
  return String(value ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

if (token) {
  showDashboard();
}
