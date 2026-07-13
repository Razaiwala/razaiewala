/* ===========================
   CONFIG
=========================== */

/* WhatsApp number of Jindal Razaie Udyog (no plus, no spaces) */
const JINDAL_WHATSAPP = "919541255555";

/* PHP endpoints (relative to bulk_order.html in /HTML/) */
const SAVE_ORDER_URL    = "../PHP/save_order.php";
const SEND_WHATSAPP_URL = "../PHP/send_whatsapp.php";

/* Google Apps Script Web App URL — logs every order into your
   Google Sheet ("Orders" tab). track_order.html reads from the
   same sheet (matching on Order ID) to show the customer their
   current status once Jindal Razaie Udyog updates it. */
const GOOGLE_SHEET_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwt_MKR-P6qpO0upzCxszLaT81wmfkkyHWoDPP93lPjV4mNgPUGw3jwxVf-3OQzO_qz_g/exec";

/* ===========================
   PRODUCTS
   (No price fields — this is an enquiry form, not a priced
   checkout. Jindal Razaie Udyog quotes price after reviewing
   the order on WhatsApp.)
=========================== */

const products = {
    mattress: [
        { id: 1, name: "Premium Foam Mattress",
          image: "images/mattress.jpg",
          description: "Premium foam mattress for home use." },
        { id: 2, name: "Orthopedic Mattress",
          image: "images/mattress.jpg",
          description: "Back support orthopedic mattress." },
        { id: 3, name: "Hotel Mattress",
          image: "images/mattress.jpg",
          description: "Commercial grade hotel mattress." }
    ],
    pillow: [
        { id: 4, name: "Titan Pillow",
          image: "images/pillow.jpg",
          description: "Soft premium pillow." },
        { id: 5, name: "Hotel Pillow",
          image: "images/pillow.jpg",
          description: "Hotel quality pillow." },
        { id: 6, name: "Luxury Pillow",
          image: "images/pillow.jpg",
          description: "Luxury microfiber pillow." }
    ]
};

/* ===========================
   GLOBAL VARIABLES
=========================== */
let order = [];

/* Holds the order info while the confirmation modal is open,
   so confirmAndSendOrder() can pick it up when the user confirms. */
let pendingOrderInfo = null;

/* ===========================
   SHOW CATEGORY
   Card shows name + image + quantity stepper only. No price.
=========================== */
function showCategory(category) {
    const container = document.getElementById("productContainer");
    container.innerHTML = "";
    products[category].forEach(product => {
        container.innerHTML += `
        <div class="col-lg-3 col-md-4 col-sm-6">
            <div class="product-card">
                <img src="${product.image}" alt="${product.name}" onclick="showDetails(${product.id})">
                <div class="p-3">
                    <h5>${product.name}</h5>
                    <div class="qty-box">
                        <button class="qty-btn"
                        onclick="changeQty(${product.id},-1)">-</button>
                        <input type="number" class="qty-input" id="qty-${product.id}"
                               value="1" min="1" step="1" inputmode="numeric"
                               onchange="clampQty(${product.id})"
                               onblur="clampQty(${product.id})">
                        <button class="qty-btn"
                        onclick="changeQty(${product.id},1)">+</button>
                    </div>
                    <button class="btn add-btn"
                        onclick="addToOrder(${product.id})">
                        Add To Order
                    </button>
                </div>
            </div>
        </div>
        `;
    });
}

/* ===========================
   QUANTITY
   Real number input, so buyers can either click +/- for small
   adjustments or type a bulk amount directly (50, 200, etc).
   clampQty() sanitizes whatever the person typed.
=========================== */
function changeQty(id, value) {
    const qty   = document.getElementById(`qty-${id}`);
    let current = parseInt(qty.value, 10);
    if (isNaN(current)) current = 1;
    current += value;
    if (current < 1) current = 1;
    qty.value = current;
}

function clampQty(id) {
    const qty = document.getElementById(`qty-${id}`);
    let value = parseInt(qty.value, 10);
    if (isNaN(value) || value < 1) value = 1;
    qty.value = value;
}

/* ===========================
   PRODUCT DETAILS MODAL
=========================== */
function showDetails(id) {
    let product = null;
    for (let category in products) {
        const found = products[category].find(p => p.id === id);
        if (found) { product = found; break; }
    }
    if (!product) { alert("Product Not Found"); return; }

    document.getElementById("modalTitle").innerText       = product.name;
    document.getElementById("modalImage").src             = product.image;
    document.getElementById("modalDescription").innerText = product.description;

    new bootstrap.Modal(document.getElementById("productModal")).show();
}

/* ===========================
   ADD TO ORDER
=========================== */
function addToOrder(id) {
    let product;
    Object.values(products).forEach(category => {
        category.forEach(item => {
            if (item.id === id) product = item;
        });
    });
    clampQty(id);
    const qty = parseInt(
        document.getElementById(`qty-${id}`).value, 10
    );
    const existing = order.find(item => item.name === product.name);
    if (existing) {
        existing.qty += qty;
    } else {
        order.push({
            name: product.name,
            qty:  qty
        });
    }
    updateSummary();
}

/* ===========================
   REMOVE ITEM
=========================== */
function removeItem(index) {
    order.splice(index, 1);
    updateSummary();
}

/* ===========================
   UPDATE SUMMARY
   Items + quantity only. No subtotal, no GST, no discount,
   no grand total — nothing priced is shown to the customer.
=========================== */
function updateSummary() {
    const summary = document.getElementById("orderItems");
    summary.innerHTML = "";

    document.getElementById("cartCount").innerText = order.length;

    if (order.length === 0) {
        summary.innerHTML = `<div class="order-items-empty">No products added yet — pick a quantity above to get started.</div>`;
        return;
    }

    order.forEach((item, index) => {
        summary.innerHTML += `
        <div class="d-flex justify-content-between align-items-center mb-3 summary-item-row">
            <div>
                <strong>${item.name}</strong><br>
                Qty : ${item.qty}
            </div>
            <button class="btn btn-sm btn-danger" onclick="removeItem(${index})">X</button>
        </div>
        `;
    });
}

/* ===========================
   CHECKOUT
=========================== */
function checkoutOrder() {

    if (order.length === 0) {
        alert("Please add products first.");
        return;
    }

    const partyName = document.getElementById("partyName").value.trim();
    const mobile    = document.getElementById("mobileNumber").value.trim();
    const email     = document.getElementById("emailAddress").value.trim();
    const gstNo     = document.getElementById("gstNumber").value.trim();

    if (partyName === "" || mobile === "") {
        alert("Please fill in your Party Name and Mobile Number.");
        return;
    }

    if (!/^\d{10}$/.test(mobile)) {
        alert("Please enter a valid 10-digit mobile number.");
        return;
    }

    if (email !== "" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        alert("Please enter a valid email address.");
        return;
    }

    pendingOrderInfo = { partyName, mobile, email, gstNo };

    showOrderConfirmation(pendingOrderInfo);
}

/* ===========================
   ORDER CONFIRMATION POPUP
   Shows everything before anything is sent, so the customer can
   double-check before we message the shop. Still no pricing.
=========================== */
function showOrderConfirmation(info) {

    document.getElementById("cfPartyName").innerText = info.partyName;
    document.getElementById("cfMobile").innerText    = info.mobile;

    const emailRow = document.getElementById("cfEmailRow");
    if (info.email) {
        document.getElementById("cfEmail").innerText = info.email;
        emailRow.style.display = "flex";
    } else {
        emailRow.style.display = "none";
    }

    const gstRow = document.getElementById("cfGstRow");
    if (info.gstNo) {
        document.getElementById("cfGst").innerText = info.gstNo;
        gstRow.style.display = "flex";
    } else {
        gstRow.style.display = "none";
    }

    const itemsBox = document.getElementById("cfItems");
    itemsBox.innerHTML = order.map(item => `
        <div class="confirm-item-row">
            <span>${item.name}</span>
            <span class="item-qty">x ${item.qty}</span>
        </div>
    `).join("");

    /* Reset the confirm button in case a previous attempt failed */
    const confirmBtn = document.getElementById("confirmSendBtn");
    confirmBtn.disabled = false;
    document.getElementById("confirmSendBtnText").innerHTML =
        `<i class="fab fa-whatsapp me-2"></i>Confirm &amp; Send Order`;

    new bootstrap.Modal(document.getElementById("orderConfirmModal")).show();
}

/* Called when the customer taps "Confirm & Send Order" inside the popup */
function confirmAndSendOrder() {
    if (!pendingOrderInfo) return;

    const confirmBtn = document.getElementById("confirmSendBtn");
    confirmBtn.disabled = true;
    document.getElementById("confirmSendBtnText").innerHTML =
        `<i class="fas fa-spinner fa-spin me-2"></i>Sending...`;

    sendOrder(pendingOrderInfo);
}

/* ===========================
   GOOGLE SHEETS LOGGING
   Fire-and-forget POST to the Apps Script Web App. This is what
   powers order status tracking: the order is logged here with
   status "Pending", and when Jindal Razaie Udyog updates the
   status in the sheet, track_order.html looks it up by this
   same Order ID and shows the customer the current status.
=========================== */
function logOrderToGoogleSheet(orderId, info) {
    const productSummary = order
        .map(item => `${item.name} x${item.qty}`)
        .join(", ");
    const totalQty = order.reduce((sum, item) => sum + item.qty, 0);

    fetch(GOOGLE_SHEET_SCRIPT_URL, {
        method: "POST",
        mode: "no-cors", // fire-and-forget: we don't need to read the response,
                          // so this avoids the browser blocking the request over CORS
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({
            orderId:   orderId,
            partyName: info.partyName,
            mobile:    info.mobile,
            product:   productSummary,
            quantity:  totalQty,
            status:    "Pending"
        })
    })
    .then(() => console.log("Order logging request sent to Google Sheet:", orderId))
    .catch(err => console.warn("Google Sheet log error:", err));
}

/* ===========================
   SEND ORDER
   Primary path: WhatsApp Cloud API sends the order automatically,
   server-side, from ../PHP/send_whatsapp.php — no WhatsApp app or
   manual tap needed on the customer's end.
   Fallback: if the Cloud API call fails (network issue, missing
   credentials, etc.) we fall back to opening wa.me so the order
   still reaches the shop.
=========================== */
function sendOrder(info) {

    const orderId = "JRU" + Date.now().toString().slice(-8);

    const summaryText = buildSummaryText(orderId, info);
    const summaryHtml = buildSummaryHtml(orderId, info);

    const orderData = {
        order_id:     orderId,
        party_name:   info.partyName,
        name:         info.partyName,
        mobile:       info.mobile,
        email:        info.email,
        gst_number:   info.gstNo,
        items:        order,
        products:     JSON.stringify(order),
        status:       "Pending",
        summary_text: summaryText,
        summary_html: summaryHtml
    };

    console.log("Sending Order", orderData);

    /* Log to Google Sheet — this is the record track_order.html
       will look up later by Order ID. */
    logOrderToGoogleSheet(orderId, info);

    /* 1. Primary: automatic server-side send via WhatsApp Cloud API */
    fetch(SEND_WHATSAPP_URL, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(orderData)
    })
    .then(r => r.json())
    .catch(() => ({ status: "error", message: "Network error" }))
    .then(waRes => {
        if (waRes && waRes.status === "success") {
            console.log("Order sent automatically via WhatsApp Cloud API");
        } else {
            console.warn("Cloud API send failed, falling back to wa.me:", waRes && waRes.message);
            openWhatsapp(orderData);
        }

        /* 2. Best-effort: save a copy of the order server-side.
              This never blocks or delays step 1 above. */
        fetch(SAVE_ORDER_URL, {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify(orderData)
        })
        .then(r => r.json()).catch(() => ({ status: "error" }))
        .then(saveRes => {
            if (saveRes && (saveRes.status === "success" || saveRes.status === "partial")) {
                console.log("Order saved" + (saveRes.status === "partial" ? " (partial)" : ""));
            } else {
                console.warn("Order save failed:", saveRes);
            }
        });

        finishOrder(orderId);
    });
}

/* Closes the confirmation modal, clears the cart/form, and shows
   the customer their Order ID so they can track status later. */
function finishOrder(orderId) {

    const modalEl = document.getElementById("orderConfirmModal");
    const modal   = bootstrap.Modal.getInstance(modalEl);
    if (modal) modal.hide();

    const idArea = document.getElementById("orderIdArea");
    if (idArea) {
        idArea.innerHTML = `
            <div class="order-id-box">
                <i class="fas fa-check-circle me-2"></i>
                Order sent! Your Order ID is <strong>${orderId}</strong>.
                Save it to <a href="track_order.html">track your order status</a>.
            </div>
        `;
    }

    /* Reset order + form */
    order            = [];
    pendingOrderInfo = null;
    document.getElementById("partyName").value     = "";
    document.getElementById("mobileNumber").value   = "";
    document.getElementById("emailAddress").value   = "";
    document.getElementById("gstNumber").value       = "";
    updateSummary();
}

/* ===========================
   WHATSAPP FALLBACK
=========================== */
function openWhatsapp(orderData) {
    const shopNumber = JINDAL_WHATSAPP;
    window.open(
        `https://wa.me/${shopNumber}?text=${encodeURIComponent(orderData.summary_text)}`,
        "_blank"
    );
}

/* ===========================
   SUMMARY BUILDERS
   No pricing anywhere — just what was ordered and by whom.
=========================== */
function buildSummaryText(orderId, info) {

    let lines = order.map(item => `${item.name}  x ${item.qty}`);

    return (
`🛒 *NEW BULK ORDER ENQUIRY - JINDAL RAZAIE UDYOG*

Order ID: ${orderId}

Party Name: ${info.partyName}
Mobile: ${info.mobile}` +
(info.email ? `\nEmail: ${info.email}` : "") +
(info.gstNo ? `\nGST No: ${info.gstNo}` : "") +
`

Items:
${lines.join("\n")}

Please confirm availability and pricing with the customer.

- Jindal Razaie Udyog`
    );
}

function buildSummaryHtml(orderId, info) {

    const rows = order.map(i => `
        <tr>
            <td style="padding:6px;border:1px solid #ddd;">${i.name}</td>
            <td style="padding:6px;text-align:center;border:1px solid #ddd;">${i.qty}</td>
        </tr>
    `).join("");

    return `
        <div style="font-family:Arial,sans-serif;max-width:640px;">
            <h2 style="color:#7A1235;margin:0 0 4px 0;">JINDAL RAZAIE UDYOG</h2>
            <p style="margin:0 0 16px 0;color:#555;">Bulk Order Enquiry</p>

            <table style="width:100%;border-collapse:collapse;font-size:14px;">
                <tr><td style="padding:4px 0;"><strong>Order ID</strong></td><td>${orderId}</td></tr>
                <tr><td style="padding:4px 0;"><strong>Party Name</strong></td><td>${info.partyName}</td></tr>
                <tr><td style="padding:4px 0;"><strong>Mobile</strong></td><td>${info.mobile}</td></tr>
                ${info.email ? `<tr><td style="padding:4px 0;"><strong>Email</strong></td><td>${info.email}</td></tr>` : ""}
                ${info.gstNo ? `<tr><td style="padding:4px 0;"><strong>GST No</strong></td><td>${info.gstNo}</td></tr>` : ""}
            </table>

            <h3 style="margin-top:20px;color:#7A1235;">Items</h3>

            <table style="width:100%;border-collapse:collapse;font-size:14px;">
                <thead>
                    <tr style="background:#f5e9e9;">
                        <th style="text-align:left;padding:6px;border:1px solid #ddd;">Product</th>
                        <th style="text-align:center;padding:6px;border:1px solid #ddd;">Qty</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>

            <p style="margin-top:20px;color:#555;">
                Pricing to be confirmed directly with the customer.<br>
                <strong>Jindal Razaie Udyog</strong>
            </p>
        </div>
    `;
}

/* ===========================
   PAGE LOAD
=========================== */
showCategory("mattress");
