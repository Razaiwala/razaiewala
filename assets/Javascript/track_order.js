/* Same Apps Script Web App used by bulk_order.js to log orders.
   Its doGet(e) handler looks up a row by ?orderId=... and returns
   the current status as JSON. */
const GOOGLE_SHEET_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwt_MKR-P6qpO0upzCxszLaT81wmfkkyHWoDPP93lPjV4mNgPUGw3jwxVf-3OQzO_qz_g/exec";

function handleTrackSubmit(event) {
    event.preventDefault();

    const input   = document.getElementById("orderIdInput");
    const orderId = input.value.trim();
    const result  = document.getElementById("trackResult");

    if (orderId === "") {
        result.innerHTML = `<div class="result-error">Please enter an Order ID.</div>`;
        return false;
    }

    result.innerHTML = `<div class="result-loading"><i class="fas fa-spinner fa-spin me-2"></i>Checking order status...</div>`;

    fetch(`${GOOGLE_SHEET_SCRIPT_URL}?orderId=${encodeURIComponent(orderId)}`)
        .then(r => r.json())
        .then(renderResult)
        .catch(() => {
            result.innerHTML = `<div class="result-error">Couldn't check order status right now. Please try again in a moment.</div>`;
        });

    return false;
}

function renderResult(res) {
    const result = document.getElementById("trackResult");

    if (!res || res.status !== "success") {
        result.innerHTML = `<div class="result-error">Something went wrong. Please try again.</div>`;
        return;
    }

    if (!res.found) {
        result.innerHTML = `<div class="result-error">No order found with that Order ID. Please double-check and try again.</div>`;
        return;
    }

    const statusRaw   = (res.orderStatus || "Pending").toString().trim();
    const statusClass = ["pending", "confirmed", "dispatched", "shipped", "delivered", "cancelled", "rejected"]
        .includes(statusRaw.toLowerCase()) ? statusRaw.toLowerCase() : "other";

    result.innerHTML = `
        <div class="result-card">
            <div class="result-row">
                <span>Order ID</span>
                <span>${escapeHtml(res.orderId)}</span>
            </div>
            <div class="result-row" style="color:white;">
                <span>Status</span>
                <span><span class="status-badge ${statusClass}">${escapeHtml(statusRaw)}</span></span>
            </div>
            <div class="result-row">
                <span>Party Name</span>
                <span>${escapeHtml(res.partyName || "-")}</span>
            </div>
            <div class="result-row">
                <span>Product(s)</span>
                <span>${escapeHtml(res.product || "-")}</span>
            </div>
            <div class="result-row">
                <span>Quantity</span>
                <span>${escapeHtml(String(res.quantity || "-"))}</span>
            </div>
        </div>
    `;
}

function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
}
