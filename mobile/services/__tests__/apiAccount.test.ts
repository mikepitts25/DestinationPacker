import { usersApi } from '../api';
import { supabase } from '@/lib/supabase';

jest.mock('@/lib/supabase', () => ({
  supabase: {
    functions: {
      invoke: jest.fn(),
    },
    auth: {
      signOut: jest.fn(),
      getUser: jest.fn(),
      getSession: jest.fn(),
      signUp: jest.fn(),
      signInWithPassword: jest.fn(),
      resetPasswordForEmail: jest.fn(),
      updateUser: jest.fn(),
    },
    from: jest.fn(),
  },
}));

describe('usersApi account deletion', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deletes the account through the Edge Function and clears the local session', async () => {
    (supabase.functions.invoke as jest.Mock).mockResolvedValue({ data: { deleted: true }, error: null });
    (supabase.auth.signOut as jest.Mock).mockResolvedValue({ error: null });

    await usersApi.deleteAccount();

    expect(supabase.functions.invoke).toHaveBeenCalledWith('delete-account');
    expect(supabase.auth.signOut).toHaveBeenCalledTimes(1);
  });
});
