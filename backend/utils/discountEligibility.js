const isDiscountEligible = ({
  subtotal,
  quantity,
  currentDate,
  discount,
}) => {
  const numericSubtotal = Number(subtotal);
  const numericQuantity = Number(quantity);
  const now = currentDate ? new Date(currentDate) : new Date();
  const startDate = discount.start_date ? new Date(discount.start_date) : null;
  const endDate = discount.end_date ? new Date(discount.end_date) : null;

  if (!Number.isFinite(numericSubtotal) || numericSubtotal < 0) {
    return false;
  }

  if (!Number.isFinite(numericQuantity) || numericQuantity < 0) {
    return false;
  }

  if (discount.min_purchase !== null && discount.min_purchase !== undefined && numericSubtotal < Number(discount.min_purchase)) {
    return false;
  }

  if (discount.min_quantity !== null && discount.min_quantity !== undefined && numericQuantity < Number(discount.min_quantity)) {
    return false;
  }

  if (startDate && now < startDate) {
    return false;
  }

  if (endDate && now > endDate) {
    return false;
  }

  return true;
};

module.exports = { isDiscountEligible };
