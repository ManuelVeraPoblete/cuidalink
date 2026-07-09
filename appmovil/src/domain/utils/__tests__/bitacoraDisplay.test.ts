import { pickBitacoraEntryStyle } from '../bitacoraDisplay';

describe('pickBitacoraEntryStyle', () => {
  it('estilo para ENTRY', () => {
    expect(pickBitacoraEntryStyle('ENTRY')).toEqual({ icon: 'create-outline', color: '#1a9c7d', label: 'Entrada' });
  });

  it('estilo para OBSERVATION', () => {
    expect(pickBitacoraEntryStyle('OBSERVATION')).toEqual({ icon: 'eye-outline', color: '#7c5cfc', label: 'Observación' });
  });
});
