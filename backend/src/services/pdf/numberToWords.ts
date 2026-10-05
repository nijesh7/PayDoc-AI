/**
 * Converts Indian currency numbers to words (e.g. 54200 -> "Fifty-Four Thousand Two Hundred Rupees Only").
 */
const ones = [
  '',
  'One',
  'Two',
  'Three',
  'Four',
  'Five',
  'Six',
  'Seven',
  'Eight',
  'Nine',
  'Ten',
  'Eleven',
  'Twelve',
  'Thirteen',
  'Fourteen',
  'Fifteen',
  'Sixteen',
  'Seventeen',
  'Eighteen',
  'Nineteen',
];

const tens = [
  '',
  '',
  'Twenty',
  'Thirty',
  'Forty',
  'Fifty',
  'Sixty',
  'Seventy',
  'Eighty',
  'Ninety',
];

function convertBelowThousand(n: number): string {
  let str = '';
  if (n >= 100) {
    str += `${ones[Math.floor(n / 100)]} Hundred `;
    n %= 100;
  }
  if (n >= 20) {
    str += `${tens[Math.floor(n / 10)]} `;
    n %= 10;
  }
  if (n > 0) {
    str += `${ones[n]} `;
  }
  return str.trim();
}

export function numberToIndianWords(amount: number): string {
  if (amount === 0) return 'Zero Rupees Only';

  const [rupeesStr, paiseStr] = amount.toFixed(2).split('.');
  let rupees = parseInt(rupeesStr, 10);
  const paise = parseInt(paiseStr, 10);

  let words = '';

  const crore = Math.floor(rupees / 10000000);
  rupees %= 10000000;

  const lakh = Math.floor(rupees / 100000);
  rupees %= 100000;

  const thousand = Math.floor(rupees / 1000);
  rupees %= 1000;

  if (crore > 0) {
    words += `${convertBelowThousand(crore)} Crore `;
  }
  if (lakh > 0) {
    words += `${convertBelowThousand(lakh)} Lakh `;
  }
  if (thousand > 0) {
    words += `${convertBelowThousand(thousand)} Thousand `;
  }
  if (rupees > 0) {
    words += `${convertBelowThousand(rupees)} `;
  }

  words = words.trim() + ' Rupees';

  if (paise > 0) {
    words += ` and ${convertBelowThousand(paise)} Paise`;
  }

  words += ' Only';
  return words.trim();
}
