export type DefaultVitalDefinition = {
  name: string;
  unit: string;
  normalRangeMin: number;
  normalRangeMax: number;
};

export const DEFAULT_VITAL_DEFINITIONS: DefaultVitalDefinition[] = [
  { name: 'Temperatura', unit: '°C', normalRangeMin: 36, normalRangeMax: 37.5 },
  { name: 'Presión arterial', unit: 'mmHg', normalRangeMin: 90, normalRangeMax: 140 },
  { name: 'Pulso', unit: 'lpm', normalRangeMin: 60, normalRangeMax: 100 },
  { name: 'Frecuencia respiratoria', unit: 'rpm', normalRangeMin: 12, normalRangeMax: 20 },
  { name: 'Saturación de oxígeno', unit: '%', normalRangeMin: 95, normalRangeMax: 100 },
  { name: 'Dolor', unit: '/10', normalRangeMin: 0, normalRangeMax: 10 },
  { name: 'Glucosa', unit: 'mg/dL', normalRangeMin: 70, normalRangeMax: 140 },
  { name: 'Observaciones', unit: 'texto', normalRangeMin: 0, normalRangeMax: 0 },
];
