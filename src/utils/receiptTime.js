export const getReceiptTimestamp = (order = {}) => {
  const isPickup = order.apiStatus === "PICKED_UP" || order.status === "Olib ketildi";
  if (isPickup) return order.realPickupTime || order.pickupAt || order.updatedAt || null;
  return order.createdAt || order.acceptedAt || order.checkIn || null;
};
