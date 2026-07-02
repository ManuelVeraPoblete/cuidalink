import { isValidRut } from '../rut';

describe('isValidRut', () => {
  it('acepta un RUT válido con puntos y guión', () => {
    expect(isValidRut('12.345.678-5')).toBe(true);
  });

  it('acepta un RUT válido sin puntos', () => {
    expect(isValidRut('12345678-5')).toBe(true);
  });

  it('acepta un RUT válido cuyo dígito verificador es K', () => {
    expect(isValidRut('6.824.093-K')).toBe(true);
  });

  it('acepta la K en minúscula', () => {
    expect(isValidRut('6.824.093-k')).toBe(true);
  });

  it('acepta un RUT de un solo dígito en el cuerpo', () => {
    expect(isValidRut('1-9')).toBe(true);
  });

  it('rechaza un RUT con dígito verificador incorrecto', () => {
    expect(isValidRut('12.345.678-4')).toBe(false);
  });

  it('rechaza un RUT con letras en el cuerpo', () => {
    expect(isValidRut('12A45678-5')).toBe(false);
  });

  it('rechaza un string vacío', () => {
    expect(isValidRut('')).toBe(false);
  });
});
