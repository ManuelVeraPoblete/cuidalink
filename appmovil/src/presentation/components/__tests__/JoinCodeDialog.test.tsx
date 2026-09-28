import { render, screen, fireEvent } from '@testing-library/react-native';
import JoinCodeDialog from '../JoinCodeDialog';

function renderDialog() {
  const onJoin = jest.fn();
  const onClose = jest.fn();
  render(<JoinCodeDialog visible onClose={onClose} onJoin={onJoin} />);
  return { onJoin, onClose };
}

describe('JoinCodeDialog', () => {
  it('envía el código en mayúsculas y sin espacios', () => {
    const { onJoin } = renderDialog();
    fireEvent.changeText(screen.getByPlaceholderText('Código de 8 caracteres'), ' ab12cd34 ');
    fireEvent.press(screen.getByText('Unirse'));
    expect(onJoin).toHaveBeenCalledWith('AB12CD34');
  });

  it('muestra un error y no envía si el código está incompleto', () => {
    const { onJoin } = renderDialog();
    fireEvent.changeText(screen.getByPlaceholderText('Código de 8 caracteres'), 'AB12');
    fireEvent.press(screen.getByText('Unirse'));
    expect(onJoin).not.toHaveBeenCalled();
    expect(screen.getByText('El código debe tener 8 letras o números.')).toBeTruthy();
  });

  it('rechaza caracteres que no son letras o números', () => {
    const { onJoin } = renderDialog();
    fireEvent.changeText(screen.getByPlaceholderText('Código de 8 caracteres'), 'AB12-D34');
    fireEvent.press(screen.getByText('Unirse'));
    expect(onJoin).not.toHaveBeenCalled();
  });

  it('cierra al cancelar', () => {
    const { onClose } = renderDialog();
    fireEvent.press(screen.getByText('Cancelar'));
    expect(onClose).toHaveBeenCalled();
  });
});
