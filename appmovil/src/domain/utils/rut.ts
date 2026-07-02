export function isValidRut(rut: string): boolean {
  const clean = rut.replace(/[.\s]/g, '').toUpperCase();
  if (!/^\d+-?[0-9K]$/.test(clean)) return false;

  const body = clean.slice(0, -1).replace('-', '');
  const dv = clean.slice(-1);
  if (!/^\d+$/.test(body)) return false;

  let sum = 0;
  let weight = 2;
  for (let i = body.length - 1; i >= 0; i--) {
    sum += Number(body[i]) * weight;
    weight = weight === 7 ? 2 : weight + 1;
  }

  const remainder = 11 - (sum % 11);
  const expectedDv = remainder === 11 ? '0' : remainder === 10 ? 'K' : String(remainder);

  return dv === expectedDv;
}
