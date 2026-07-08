import { pickVitalIcon } from '../vitalDisplay';

describe('pickVitalIcon', () => {
  it('detecta temperatura', () => {
    expect(pickVitalIcon('Temperatura')).toEqual({ icon: 'thermometer-outline', color: '#f5a623' });
  });

  it('detecta presión arterial', () => {
    expect(pickVitalIcon('Presión arterial')).toEqual({ icon: 'pulse', color: '#e74c3c' });
  });

  it('detecta pulso', () => {
    expect(pickVitalIcon('Pulso')).toEqual({ icon: 'heart', color: '#e05555' });
  });

  it('detecta frecuencia respiratoria', () => {
    expect(pickVitalIcon('Frecuencia respiratoria')).toEqual({ icon: 'body-outline', color: '#2f6fed' });
  });

  it('detecta saturación de oxígeno', () => {
    expect(pickVitalIcon('Saturación de oxígeno')).toEqual({ icon: 'water-outline', color: '#2f6fed' });
  });

  it('detecta dolor', () => {
    expect(pickVitalIcon('Dolor')).toEqual({ icon: 'sad-outline', color: '#f5a623' });
  });

  it('detecta glucosa', () => {
    expect(pickVitalIcon('Glucosa')).toEqual({ icon: 'cube-outline', color: '#16a085' });
  });

  it('detecta observaciones', () => {
    expect(pickVitalIcon('Observaciones')).toEqual({ icon: 'chatbubble-ellipses-outline', color: '#5ee7df' });
  });

  it('usa un ícono por defecto para nombres no reconocidos', () => {
    expect(pickVitalIcon('Peso corporal')).toEqual({ icon: 'pulse-outline', color: '#7c5cfc' });
  });
});
