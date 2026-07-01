import { User } from '@/domain/entities';
import { AuthRepository } from '@/domain/repositories/AuthRepository';

export interface RegisterUseCase {
  execute(name: string, email: string, password: string): Promise<User>;
}

export class RegisterUseCaseImpl implements RegisterUseCase {
  constructor(private readonly repo: AuthRepository) {}
  execute(name: string, email: string, password: string) {
    return this.repo.register(name, email, password);
  }
}
