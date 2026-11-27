export const digitsOf = (text) => text.replace(/\D/g, "").split("").map(Number);

const weightedSum = (digits, weights) =>
  weights.reduce((sum, weight, i) => sum + digits[i] * weight, 0);

const allSame = (digits) => digits.every((d) => d === digits[0]);

export function isTFN(text) {
  const d = digitsOf(text);
  if (d.length !== 9 || allSame(d)) return false;
  return weightedSum(d, [1, 4, 3, 7, 5, 8, 6, 9, 10]) % 11 === 0;
}

export function isABN(text) {
  const d = digitsOf(text);
  if (d.length !== 11 || d[0] === 0 || allSame(d)) return false;
  d[0] -= 1;
  return weightedSum(d, [10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19]) % 89 === 0;
}

export function isACN(text) {
  const d = digitsOf(text);
  if (d.length !== 9 || allSame(d)) return false;
  const remainder = weightedSum(d, [8, 7, 6, 5, 4, 3, 2, 1]) % 10;
  return (10 - remainder) % 10 === d[8];
}

export function isMedicare(text) {
  const d = digitsOf(text);
  if (d.length !== 10 && d.length !== 11) return false;
  if (d[0] < 2 || d[0] > 6) return false;
  return weightedSum(d, [1, 3, 7, 9, 1, 3, 7, 9]) % 10 === d[8];
}

export function isCardNumber(text) {
  const d = digitsOf(text);
  if (d.length < 13 || d.length > 19 || allSame(d)) return false;
  let sum = 0;
  for (let i = 0; i < d.length; i++) {
    let x = d[d.length - 1 - i];
    if (i % 2 === 1) {
      x *= 2;
      if (x > 9) x -= 9;
    }
    sum += x;
  }
  return sum % 10 === 0;
}
