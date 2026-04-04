const { isDiscountEligible } = require("./discountEligibility");
const { calculateTaxAmount } = require("./taxCalculator");

const roundMoney = (value) => Number(Number(value).toFixed(2));

const generateSubscriptionNumber = () => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const randomPart = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `SUB-${timestamp}-${randomPart}`;
};

const pickBestDiscount = ({ discounts, subtotal, quantity, currentDate }) => {
  let bestDiscount = null;
  let bestDiscountAmount = 0;

  for (const discount of discounts) {
    if (!discount.apply_to_subscription) {
      continue;
    }

    if (!isDiscountEligible({ subtotal, quantity, currentDate, discount })) {
      continue;
    }

    const candidateAmount =
      discount.type === "percentage"
        ? (subtotal * Number(discount.value)) / 100
        : Number(discount.value);

    if (candidateAmount > bestDiscountAmount) {
      bestDiscountAmount = candidateAmount;
      bestDiscount = discount;
    }
  }

  return {
    discount: bestDiscount,
    discountAmount: roundMoney(Math.min(bestDiscountAmount, subtotal)),
  };
};

const calculateSubscriptionLine = ({ product, variant, plan, discounts, quantity, currentDate }) => {
  const basePrice = Number(product.sales_price);
  const variantPrice = variant ? Number(variant.extra_price || 0) : 0;
  const planPrice = plan ? Number(plan.price || 0) : 0;
  const unitPrice = roundMoney(basePrice + variantPrice + planPrice);
  const subtotal = roundMoney(unitPrice * Number(quantity));

  const { discount, discountAmount } = pickBestDiscount({
    discounts,
    subtotal,
    quantity: Number(quantity),
    currentDate,
  });

  const taxableBase = Math.max(subtotal - discountAmount, 0);
  const taxAmount = product.tax
    ? roundMoney(calculateTaxAmount(taxableBase, product.tax.type, product.tax.value))
    : 0;
  const amount = roundMoney(taxableBase + taxAmount);

  return {
    unit_price: unitPrice,
    discount: discountAmount,
    tax: taxAmount,
    amount,
    applied_discount_id: discount ? discount.id : null,
  };
};

module.exports = {
  generateSubscriptionNumber,
  calculateSubscriptionLine,
};
