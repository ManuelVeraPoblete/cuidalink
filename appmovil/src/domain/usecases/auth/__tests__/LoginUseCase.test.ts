import { LoginUseCaseImpl } from '../LoginUseCase';
import { AuthRepository } from '@/domain/repositories/AuthRepository';
import { User } from '@/domain/entities';

const mockUser: User = { id: '1', name: 'Ana', email: 'ana@test.com', role: 'CAREGIVER' };

const mockRepo: jest.Mocked<AuthRepository> = {
  loginWithEmail: jest.fn(),
  register: jest.fn(),
  logout: jest.fn(),
  getMe: jest.fn(),
  updateFcmToken: jest.fn(),
  updateProfile: jest.fn(),
};

describe('LoginUseCase', () => {
  const useCase = new LoginUseCaseImpl(mockRepo);

  beforeEach(() => jest.clearAllMocks());

  it('delega al repositorio con email y password', async () => {
    mockRepo.loginWithEmail.mockResolvedValue(mockUser);
    const result = await useCase.execute('ana@test.com', 'password123');
    expect(mockRepo.loginWithEmail).toHaveBeenCalledWith('ana@test.com', 'password123');
    expect(result).toEqual(mockUser);
  });

  it('propaga errores del repositorio', async () => {
    mockRepo.loginWithEmail.mockRejectedValue(new Error('Auth error'));
    await expect(useCase.execute('x@x.com', 'wrong')).rejects.toThrow('Auth error');
  });
});
