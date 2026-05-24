const PRINT_ROOT_ID = "receipt-print-root";
const PRINT_STYLE_ID = "receipt-print-style";

const receiptPrintStyles = `
  #${PRINT_ROOT_ID} {
    display: none;
  }

  @media print {
    @page {
      size: 80mm 220mm;
      margin: 0;
    }

    html,
    body {
      width: 80mm !important;
      min-height: 0 !important;
      margin: 0 !important;
      padding: 0 !important;
      background: #ffffff !important;
      overflow: visible !important;
    }

    body.receipt-printing > :not(#${PRINT_ROOT_ID}) {
      display: none !important;
    }

    body.receipt-printing *,
    body.receipt-printing #${PRINT_ROOT_ID},
    body.receipt-printing #${PRINT_ROOT_ID} * {
      visibility: visible !important;
    }

    body.receipt-printing #${PRINT_ROOT_ID} {
      display: block !important;
      width: 80mm !important;
      min-height: 0 !important;
      margin: 0 !important;
      padding: 0 !important;
      background: #ffffff !important;
      color: #111827 !important;
      overflow: visible !important;
    }

    body.receipt-printing #${PRINT_ROOT_ID} * {
      box-sizing: border-box;
      print-color-adjust: exact;
      -webkit-print-color-adjust: exact;
    }

    body.receipt-printing .thermal-receipt,
    body.receipt-printing .receipt-paper {
      position: static !important;
      display: block !important;
      width: 80mm !important;
      max-width: none !important;
      margin: 0 !important;
      padding: 4mm !important;
      border: 0 !important;
      border-radius: 0 !important;
      box-shadow: none !important;
      background: #ffffff !important;
      color: #111827 !important;
      font-family: "Courier New", monospace !important;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    body.receipt-printing .thermal-receipt {
      font-size: 9px !important;
    }

    body.receipt-printing .receipt-paper {
      font-size: 11px !important;
    }

    body.receipt-printing .receipt-brand,
    body.receipt-printing .receipt-footer,
    body.receipt-printing .receipt-paper h3,
    body.receipt-printing .receipt-paper p,
    body.receipt-printing .receipt-paper small {
      text-align: center;
    }

    body.receipt-printing .receipt-logo {
      width: 30px;
      height: 30px;
      margin: 0 auto 5px;
      border: 2px solid #111827;
      border-radius: 8px;
      display: grid;
      place-items: center;
      font-weight: 900;
      font-size: 12px;
    }

    body.receipt-printing h3 {
      margin: 0;
      font-size: 13px;
      letter-spacing: 1px;
    }

    body.receipt-printing p {
      margin: 3px 0 0;
    }

    body.receipt-printing .receipt-divider,
    body.receipt-printing .receipt-line {
      border-top: 1px dashed #111827;
      margin: 6px 0;
    }

    body.receipt-printing .receipt-section-title {
      margin-bottom: 4px;
      font-size: 9px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.7px;
    }

    body.receipt-printing .receipt-status {
      display: flex;
      align-items: center;
      justify-content: center;
      border: 1px solid #111827;
      border-radius: 999px;
      padding: 3px 8px;
      margin-bottom: 6px;
      font-weight: 900;
    }

    body.receipt-printing .receipt-row,
    body.receipt-printing .receipt-total-row,
    body.receipt-printing .receipt-total {
      display: flex;
      justify-content: space-between;
      gap: 8px;
      margin: 4px 0;
    }

    body.receipt-printing .receipt-row span,
    body.receipt-printing .receipt-total-row span,
    body.receipt-printing .receipt-total span {
      color: #374151;
    }

    body.receipt-printing .receipt-row b,
    body.receipt-printing .receipt-total-row b,
    body.receipt-printing .receipt-total b {
      max-width: 48mm;
      text-align: right;
      word-break: break-word;
    }

    body.receipt-printing .receipt-total-row,
    body.receipt-printing .receipt-total {
      border-top: 1px solid #111827;
      padding-top: 5px;
      margin-top: 6px;
      font-weight: 900;
    }

    body.receipt-printing .receipt-note {
      margin-top: 6px;
      border: 1px dashed #111827;
      border-radius: 8px;
      padding: 6px;
    }

    body.receipt-printing .receipt-barcode {
      height: 28px;
      margin: 6px auto;
      background: repeating-linear-gradient(
        90deg,
        #111827 0,
        #111827 2px,
        transparent 2px,
        transparent 5px
      );
      display: flex;
      align-items: flex-end;
      justify-content: center;
      padding-bottom: 3px;
    }

    body.receipt-printing .receipt-barcode span {
      background: #ffffff;
      padding: 1px 5px;
      font-size: 8px;
      font-weight: 900;
    }

    body.receipt-printing .receipt-qr-placeholder {
      width: 58px;
      height: 58px;
      border: 2px solid #111827;
      margin: 6px auto;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }

    body.receipt-printing .receipt-qr-placeholder span {
      font-weight: 900;
      font-size: 16px;
    }

    body.receipt-printing .receipt-qr-placeholder small {
      margin-top: 4px;
      font-size: 6px;
      max-width: 48px;
      word-break: break-all;
    }
  }
`;

const ensurePrintStyle = () => {
  let style = document.getElementById(PRINT_STYLE_ID);

  if (!style) {
    style = document.createElement("style");
    style.id = PRINT_STYLE_ID;
    document.head.appendChild(style);
  }

  style.textContent = receiptPrintStyles;
};

const getPrintRoot = () => {
  let root = document.getElementById(PRINT_ROOT_ID);

  if (!root) {
    root = document.createElement("div");
    root.id = PRINT_ROOT_ID;
    document.body.appendChild(root);
  }

  return root;
};

export const printReceipt = (selector = "#thermal-receipt, .receipt-paper") => {
  const safeSelector =
    typeof selector === "string" ? selector : "#thermal-receipt, .receipt-paper";
  const receipt = document.querySelector(safeSelector);

  if (!receipt) {
    window.print();
    return;
  }

  ensurePrintStyle();

  const root = getPrintRoot();
  root.innerHTML = "";
  root.appendChild(receipt.cloneNode(true));

  const cleanup = () => {
    document.body.classList.remove("receipt-printing");
    root.innerHTML = "";
    window.removeEventListener("afterprint", cleanup);
  };

  window.addEventListener("afterprint", cleanup);
  document.body.classList.add("receipt-printing");
  window.print();
  window.setTimeout(cleanup, 120000);
};
