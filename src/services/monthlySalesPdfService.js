import apiClient from "./apiClient";
import branchService from "./branchService";

// Date bounds are exact Asia/Tashkent calendar months, not the browser's timezone.
export const monthRangeTashkent = (month) => {
  const match = /^(20\d{2})-(0[1-9]|1[0-2])$/.exec(String(month || ""));
  if (!match) return null;
  const year = Number(match[1]), m = Number(match[2]);
  return {
    dateFrom: new Date(Date.UTC(year, m - 1, 1, -5)).toISOString(),
    dateTo: new Date(Date.UTC(year, m, 1, -5) - 1).toISOString(),
  };
};

const downloadMonthlyPdf = async ({ month, branchName } = {}) => {
  if (!monthRangeTashkent(month)) throw new Error("PDF uchun hisobot oyini tanlang.");
  const branchId = branchName ? await branchService.getBranchIdByName(branchName) : null;
  if (branchName && !branchId) throw new Error("Tanlangan filial topilmadi.");
  const data = await apiClient.get("/export/orders/monthly-pdf", {
    params: { month, ...(branchId ? { branchId } : {}) },
    responseType: "blob",
    timeout: 120000,
  });
  if (!(data instanceof Blob) || !data.type.toLowerCase().includes("application/pdf")) {
    throw new Error("Server PDF faylini qaytarmadi.");
  }
  const url = URL.createObjectURL(data);
  const link = document.createElement("a");
  const branchSuffix = branchName ? `-${String(branchName).normalize("NFKD").replace(/[^a-zA-Z0-9-]+/g, "-").slice(0, 40)}` : "-barcha-filiallar";
  try {
    link.href = url;
    link.download = `qonoq-savdo-tarixi-${month}${branchSuffix}.pdf`;
    document.body.appendChild(link);
    link.click();
  } finally {
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1200);
  }
};

export default { downloadMonthlyPdf };
