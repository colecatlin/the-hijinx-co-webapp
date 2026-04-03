export function generateInvoiceNumber() {
  const now = new Date();
  return `INV-${now.getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`;
}