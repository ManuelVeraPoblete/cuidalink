import { render, screen, fireEvent } from '@testing-library/react-native';
import ErrorState from '../ErrorState';

describe('ErrorState', () => {
  it('muestra el mensaje y reintenta al presionar "Reintentar"', () => {
    const onRetry = jest.fn();
    render(<ErrorState onRetry={onRetry} />);
    expect(screen.getByText('No pudimos cargar la información')).toBeTruthy();
    fireEvent.press(screen.getByText('Reintentar'));
    expect(onRetry).toHaveBeenCalled();
  });

  it('muestra "Volver" solo cuando recibe onBack', () => {
    const onBack = jest.fn();
    const { rerender } = render(<ErrorState onRetry={jest.fn()} />);
    expect(screen.queryByText('Volver')).toBeNull();

    rerender(<ErrorState onRetry={jest.fn()} onBack={onBack} />);
    fireEvent.press(screen.getByText('Volver'));
    expect(onBack).toHaveBeenCalled();
  });
});
