import {
  getCashMovements,
  getExpenses,
  getInkassa,
  getOrders,
  getShifts,
} from "../utils/storage";
import analyticsService from "./analyticsService";

const download = (filename, content, type = "application/json") => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

const exportService = {
  getPayload(type) {
    if (type === "orders") return getOrders();
    if (type === "shifts") return getShifts();
    if (type === "finance") {
      return {
        expenses: getExpenses(),
        inkassa: getInkassa(),
        cashMovements: getCashMovements(),
      };
    }
    if (type === "analytics") return analyticsService.getData("all");
    return {};
  },

  exportJson(type) {
    const payload = this.getPayload(type);
    download(`baggage-room-${type}.json`, JSON.stringify(payload, null, 2));
  },

  exportPdf(type) {
    const payload = this.getPayload(type);
    const printWindow = window.open("", "_blank", "width=900,height=700");

    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>${type} export</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #111827; }
            h1 { font-size: 22px; }
            pre { white-space: pre-wrap; font-size: 11px; line-height: 1.45; }
          </style>
        </head>
        <body>
          <h1>Baggage Room ${type} export</h1>
          <pre>${JSON.stringify(payload, null, 2)}</pre>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  },
};

export default exportService;
