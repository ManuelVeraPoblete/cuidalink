import { isValidChileSubscriberNumber, stripChilePrefix, toChilePhone } from '../chilePhone';

describe('toChilePhone', () => {
  it('antepone +56 a los dígitos', () => {
    expect(toChilePhone('912345678')).toBe('+56912345678');
  });
});

describe('stripChilePrefix', () => {
  it('quita el prefijo +56 de un teléfono completo', () => {
    expect(stripChilePrefix('+56912345678')).toBe('912345678');
  });

  it('devuelve el valor tal cual si no tiene prefijo', () => {
    expect(stripChilePrefix('912345678')).toBe('912345678');
  });
});

describe('isValidChileSubscriberNumber', () => {
  it('acepta 9 dígitos', () => {
    expect(isValidChileSubscriberNumber('912345678')).toBe(true);
  });

  it('rechaza menos de 9 dígitos', () => {
    expect(isValidChileSubscriberNumber('91234567')).toBe(false);
  });

  it('rechaza caracteres no numéricos', () => {
    expect(isValidChileSubscriberNumber('91234567a')).toBe(false);
  });
});
