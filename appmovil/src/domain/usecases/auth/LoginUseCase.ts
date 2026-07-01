import { User } from '@/domain/entities';
import { AuthRepository } from '@/domain/repositories/AuthRepository';

export interface LoginUseCase {
  execute(email: string, password: string): Promise<User>;
}

export class LoginUseCaseImpl implements LoginUseCase {
  constructor(private readonly repo: AuthRepository) {}
  execute(email: string, password: string) {
    return this.repo.loginWithEmail(email, password);
  }
}
