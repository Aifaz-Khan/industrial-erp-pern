/**
 * Server-Side Quotation Financial Calculation Engine
 * 
 * Rules:
 * 1. Line Total = Quantity * Unit Price
 * 2. Subtotal = Sum of all Line Totals
 * 3. Discount Amount = Subtotal * (Discount % / 100)
 * 4. Taxable Amount (Net) = Subtotal - Discount Amount
 * 5. GST/Tax Amount = Taxable Amount * (Tax % / 100)
 * 6. Grand Total = Taxable Amount + Tax Amount
 * 
 * All currency values are rounded to 2 decimal places to prevent floating-point anomalies.
 */

function roundToTwo(num) {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

function calculateQuotationTotals({
  items,
  discountPercentage = 0,
  taxPercentage = 18.0,
}) {
  if (!items || items.length === 0) {
    throw new Error('At least one item is required for quotation financial calculation.');
  }

  const calculatedItems = items.map((item) => {
    const qty = parseInt(item.quantity, 10);
    const price = parseFloat(item.unitPrice);

    if (isNaN(qty) || qty <= 0) {
      throw new Error(`Invalid item quantity: ${item.quantity}`);
    }
    if (isNaN(price) || price < 0) {
      throw new Error(`Invalid item unit price: ${item.unitPrice}`);
    }

    const lineTotal = roundToTwo(qty * price);

    return {
      ...item,
      quantity: qty,
      unitPrice: price,
      lineTotal,
    };
  });

  const subtotal = roundToTwo(
    calculatedItems.reduce((acc, item) => acc + item.lineTotal, 0)
  );

  const discountPct = Math.max(0, Math.min(100, parseFloat(discountPercentage) || 0));
  const taxPct = Math.max(0, Math.min(100, parseFloat(taxPercentage) || 0));

  const discountAmount = roundToTwo((subtotal * discountPct) / 100);
  const taxableAmount = roundToTwo(subtotal - discountAmount);
  const taxAmount = roundToTwo((taxableAmount * taxPct) / 100);
  const grandTotal = roundToTwo(taxableAmount + taxAmount);

  return {
    items: calculatedItems,
    subtotal,
    discountPercentage: discountPct,
    discountAmount,
    taxPercentage: taxPct,
    taxAmount,
    grandTotal,
  };
}

module.exports = {
  roundToTwo,
  calculateQuotationTotals,
};
