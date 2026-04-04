const calculateTaxAmount = (amount, taxType, taxValue) => {
  const numericAmount = Number(amount);
  const numericValue = Number(taxValue);

  if (!Number.isFinite(numericAmount) || numericAmount < 0) {
    throw new Error("Amount must be a non-negative number.");
  }

  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    throw new Error("Tax value must be a positive number.");
  }

  if (taxType === "percentage") {
    return (numericAmount * numericValue) / 100;
  }

  if (taxType === "fixed") {
    return numericValue;
  }

  throw new Error("Invalid tax type.");
};

module.exports = { calculateTaxAmount };
