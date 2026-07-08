import { pickContactCategoryStyle } from '../contactDisplay';

describe('pickContactCategoryStyle', () => {
  it('devuelve el estilo de Familia', () => {
    expect(pickContactCategoryStyle('FAMILY')).toEqual({ icon: 'people', color: '#1a9c7d', label: 'Familia' });
  });

  it('devuelve el estilo de Médico', () => {
    expect(pickContactCategoryStyle('DOCTOR')).toEqual({ icon: 'medkit', color: '#2f6fed', label: 'Médico' });
  });

  it('devuelve el estilo de Emergencia', () => {
    expect(pickContactCategoryStyle('EMERGENCY')).toEqual({ icon: 'alarm', color: '#e05555', label: 'Emergencia' });
  });
});
