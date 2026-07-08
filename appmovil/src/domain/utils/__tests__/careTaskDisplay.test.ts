import { pickTaskIcon } from '../careTaskDisplay';

describe('pickTaskIcon', () => {
  it('detecta tareas de signos vitales', () => {
    expect(pickTaskIcon('Tomar presión')).toEqual({ icon: 'clipboard', color: '#2f6fed' });
  });

  it('detecta tareas de alimentación', () => {
    expect(pickTaskIcon('Dar desayuno')).toEqual({ icon: 'restaurant', color: '#f5a623' });
  });

  it('detecta tareas de curación', () => {
    expect(pickTaskIcon('Cambiar apósito')).toEqual({ icon: 'bandage', color: '#e74c3c' });
  });

  it('detecta tareas de ejercicio', () => {
    expect(pickTaskIcon('Ejercicios de movilidad')).toEqual({ icon: 'walk', color: '#16a085' });
  });

  it('usa un ícono por defecto para nombres no reconocidos', () => {
    expect(pickTaskIcon('Leer un cuento')).toEqual({ icon: 'checkbox', color: '#7c5cfc' });
  });
});
