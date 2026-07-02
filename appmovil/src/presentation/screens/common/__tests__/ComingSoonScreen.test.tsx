import { render, screen } from '@testing-library/react-native';
import ComingSoonScreen from '../ComingSoonScreen';

describe('ComingSoonScreen', () => {
  it('muestra el título y subtítulo recibidos por route params', () => {
    const route = { params: { title: 'Hoy', subtitle: 'Pendientes de hoy' } } as any;
    render(<ComingSoonScreen route={route} />);
    expect(screen.getByText('Hoy')).toBeTruthy();
    expect(screen.getByText('Pendientes de hoy')).toBeTruthy();
    expect(screen.getByText('Esta función estará disponible próximamente.')).toBeTruthy();
  });
});
