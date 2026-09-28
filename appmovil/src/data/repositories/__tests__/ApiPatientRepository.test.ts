import apiClient from '@/data/http/apiClient';
import { ApiPatientRepository } from '../ApiPatientRepository';
import { JoinPatientError } from '@/domain/repositories/PatientRepository';

const post = apiClient.post as jest.Mock;

function httpError(status: number) {
  return Object.assign(new Error(`Request failed with status code ${status}`), { isAxiosError: true, response: { status } });
}

describe('ApiPatientRepository invitaciones', () => {
  beforeEach(() => post.mockReset());

  it('genera el código de invitación en /patients/:id/invitations', async () => {
    post.mockResolvedValue({ data: { code: 'AB12CD34', expiresAt: '2026-09-29T12:00:00' } });

    const code = await new ApiPatientRepository().getInvitationCode('p1');

    expect(post).toHaveBeenCalledWith('/patients/p1/invitations');
    expect(code).toBe('AB12CD34');
  });

  it('se une con código en /invitations/join', async () => {
    post.mockResolvedValue({ data: undefined });

    await new ApiPatientRepository().joinPatient('AB12CD34');

    expect(post).toHaveBeenCalledWith('/invitations/join', { code: 'AB12CD34' });
  });

  it.each([
    [httpError(400), 'INVALID_CODE'],
    [httpError(409), 'ALREADY_MEMBER'],
    [httpError(500), 'UNKNOWN'],
    [Object.assign(new Error('Network Error'), { isAxiosError: true }), 'NETWORK'],
  ])('traduce el error al unirse a JoinPatientError %#', async (err, reason) => {
    post.mockRejectedValue(err);

    const promise = new ApiPatientRepository().joinPatient('AB12CD34');

    await expect(promise).rejects.toBeInstanceOf(JoinPatientError);
    await expect(promise).rejects.toMatchObject({ reason });
  });
});
