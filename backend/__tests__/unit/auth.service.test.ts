import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createMockPrisma } from '../helpers/prisma-mock';

const mockPrisma = createMockPrisma();

jest.mock('../../src/config/db', () => ({
  __esModule: true,
  default: mockPrisma,
}));

import { AuthService } from '../../src/services/auth.service';

const mockUser = {
  id: 'user-1',
  email: 'test@example.com',
  passwordHash: bcrypt.hashSync('password123', 4),
  name: 'Test User',
  avatarUrl: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  deletedAt: null,
};

const mockUserOutput = {
  id: mockUser.id,
  email: mockUser.email,
  name: mockUser.name,
  avatarUrl: mockUser.avatarUrl,
  createdAt: mockUser.createdAt,
  updatedAt: mockUser.updatedAt,
};

beforeEach(() => {
  jest.clearAllMocks();
  AuthService.clearBlacklist();
});

describe('AuthService', () => {
  describe('signup', () => {
    it('should create a new user and return user without password', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(null);
      mockPrisma.user.create.mockResolvedValueOnce(mockUser);

      const result = await AuthService.signup('Test@Example.com', 'password123', 'Test User');

      expect(result).toEqual(mockUserOutput);
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
      expect(mockPrisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: 'test@example.com',
            name: 'Test User',
          }),
        })
      );
    });

    it('should throw when email already registered', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(mockUser);

      await expect(AuthService.signup('test@example.com', 'password123', 'Test'))
        .rejects.toThrow('Email already registered');
    });

    it('should throw when password is too short', async () => {
      await expect(AuthService.signup('test@example.com', '123', 'Test'))
        .rejects.toThrow('Password must be at least 8 characters');
    });

    it('should throw when bcrypt hashing fails', async () {
      mockPrisma.user.findUnique.mockResolvedValueOnce(null);
      const hashSpy = jest.spyOn(bcrypt, 'hash').mockRejectedValueOnce(new Error('hash failed'));

      await expect(AuthService.signup('test@example.com', 'password123', 'Test'))
        .rejects.toThrow('Failed to hash password');
      hashSpy.mockRestore();
    });
  });

  describe('login', () => {
    it('should return user and access token for valid credentials', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(mockUser);

      const result = await AuthService.login('test@example.com', 'password123');

      expect(result.user).toEqual(mockUserOutput);
      expect(result.token).toBeDefined();
      expect(typeof result.token).toBe('string');
      expect(result.expiresIn).toBe(900);
    });

    it('should throw for non-existent email', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(null);

      await expect(AuthService.login('unknown@example.com', 'password123'))
        .rejects.toThrow('Invalid email or password');
    });

    it('should throw for OAuth user without passwordHash', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({ ...mockUser, passwordHash: null });

      await expect(AuthService.login('test@example.com', 'password123'))
        .rejects.toThrow('Invalid email or password');
    });

    it('should throw for wrong password', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(mockUser);

      await expect(AuthService.login('test@example.com', 'wrongpassword'))
        .rejects.toThrow('Invalid email or password');
    });
  });

  describe('verifyJWT', () => {
    it('should return decoded payload for valid token', async () => {
      const token = jwt.sign({ userId: mockUser.id, email: mockUser.email }, 'jwt-secret', { expiresIn: '15m' });
      const result = await AuthService.verifyJWT(token);
      expect(result.userId).toBe(mockUser.id);
      expect(result.email).toBe(mockUser.email);
    });

    it('should handle Bearer prefix', async () => {
      const token = jwt.sign({ userId: mockUser.id, email: mockUser.email }, 'jwt-secret', { expiresIn: '15m' });
      const result = await AuthService.verifyJWT(`Bearer ${token}`);
      expect(result.userId).toBe(mockUser.id);
    });

    it('should throw for expired token', async () => {
      const token = jwt.sign({ userId: mockUser.id, email: mockUser.email }, 'jwt-secret', { expiresIn: '0s' });
      await expect(AuthService.verifyJWT(token)).rejects.toThrow('Access token has expired');
    });

    it('should throw for malformed token', async () => {
      await expect(AuthService.verifyJWT('not-a-token')).rejects.toThrow('Invalid access token');
    });

    it('should throw for token signed with different secret', async () => {
      const token = jwt.sign({ userId: mockUser.id }, 'wrong-secret', { expiresIn: '15m' });
      await expect(AuthService.verifyJWT(token)).rejects.toThrow('Invalid access token');
    });
  });

  describe('refreshToken', () => {
    it('should return new tokens for valid refresh token', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(mockUser);
      const refreshToken = jwt.sign(
        { userId: mockUser.id, email: mockUser.email },
        'refresh-secret',
        { expiresIn: '7d' }
      );

      const result = await AuthService.refreshToken(refreshToken);

      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(typeof result.accessToken).toBe('string');
      expect(typeof result.refreshToken).toBe('string');
    });

    it('should throw for expired refresh token', async () => {
      const refreshToken = jwt.sign(
        { userId: mockUser.id, email: mockUser.email },
        'refresh-secret',
        { expiresIn: '0s' }
      );
      // Wait briefly to ensure expiration
      await new Promise((r) => setTimeout(r, 100));

      await expect(AuthService.refreshToken(refreshToken)).rejects.toThrow('Refresh token has expired');
    }, 10000);

    it('should throw for malformed refresh token', async () => {
      await expect(AuthService.refreshToken('not-a-token')).rejects.toThrow('Invalid refresh token');
    });

    it('should throw for blacklisted refresh token', async () => {
      const refreshToken = jwt.sign(
        { userId: mockUser.id, email: mockUser.email },
        'refresh-secret',
        { expiresIn: '7d' }
      );
      await AuthService.revokeToken(refreshToken);

      await expect(AuthService.refreshToken(refreshToken)).rejects.toThrow('Refresh token has been revoked');
    });

    it('should throw when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(null);
      const refreshToken = jwt.sign(
        { userId: 'nonexistent', email: 'none@example.com' },
        'refresh-secret',
        { expiresIn: '7d' }
      );

      await expect(AuthService.refreshToken(refreshToken)).rejects.toThrow('User not found');
    });

    it('should revoke old token and issue new', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(mockUser);
      const refreshToken = jwt.sign(
        { userId: mockUser.id, email: mockUser.email },
        'refresh-secret',
        { expiresIn: '7d' }
      );

      const result = await AuthService.refreshToken(refreshToken);

      expect(result.accessToken).not.toBe(refreshToken);
      expect(result.refreshToken).not.toBe(refreshToken);
    });
  });

  describe('revokeToken', () => {
    it('should return true for valid token', async () => {
      const token = jwt.sign({ userId: mockUser.id }, 'refresh-secret', { expiresIn: '7d' });
      const result = await AuthService.revokeToken(token);
      expect(result).toBe(true);
    });

    it('should return false for invalid token', async () => {
      const result = await AuthService.revokeToken('invalid-token');
      expect(result).toBe(false);
    });

    it('should return false for expired token', async () => {
      const token = jwt.sign({ userId: mockUser.id }, 'refresh-secret', { expiresIn: '0s' });
      await new Promise((r) => setTimeout(r, 100));
      const result = await AuthService.revokeToken(token);
      expect(result).toBe(false);
    }, 10000);
  });

  describe('updateProfile', () => {
    it('should update and return user profile', async () => {
      mockPrisma.user.update.mockResolvedValueOnce(mockUser);

      const result = await AuthService.updateProfile(mockUser.id, 'New Name', 'http://avatar.url');

      expect(result).toEqual(mockUserOutput);
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: expect.objectContaining({
          name: 'New Name',
          avatarUrl: 'http://avatar.url',
        }),
      });
    });

    it('should allow omitting avatarUrl', async () => {
      mockPrisma.user.update.mockResolvedValueOnce(mockUser);

      const result = await AuthService.updateProfile(mockUser.id, 'New Name');

      expect(result).toEqual(mockUserOutput);
    });
  });

  describe('changePassword', () => {
    it('should change password when current is correct', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(mockUser);
      mockPrisma.user.update.mockResolvedValueOnce(mockUser);

      await AuthService.changePassword(mockUser.id, 'password123', 'newpassword123');

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: expect.objectContaining({
          passwordHash: expect.any(String),
        }),
      });
    });

    it('should throw when current password is wrong', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(mockUser);

      await expect(AuthService.changePassword(mockUser.id, 'wrongpassword', 'newpassword123'))
        .rejects.toThrow('Current password is incorrect');
    });

    it('should throw when user not found or is OAuth', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(null);

      await expect(AuthService.changePassword('no-such-user', 'password123', 'newpassword123'))
        .rejects.toThrow('User not found');
    });

    it('should throw when user has no passwordHash (OAuth)', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({ ...mockUser, passwordHash: null });

      await expect(AuthService.changePassword(mockUser.id, 'any', 'newpassword123'))
        .rejects.toThrow('User not found');
    });
  });

  describe('signAccessToken / signRefreshToken', () => {
    it('should generate valid access token', () => {
      const token = AuthService.signAccessToken(mockUser.id, mockUser.email);
      const decoded = jwt.verify(token, 'jwt-secret') as any;
      expect(decoded.userId).toBe(mockUser.id);
      expect(decoded.email).toBe(mockUser.email);
    });

    it('should generate valid refresh token', () => {
      const token = AuthService.signRefreshToken(mockUser.id, mockUser.email);
      const decoded = jwt.verify(token, 'refresh-secret') as any;
      expect(decoded.userId).toBe(mockUser.id);
    });
  });

  describe('hashPassword', () => {
    it('should return a bcrypt hash', async () => {
      const hash = await AuthService.hashPassword('password123');
      expect(hash).toContain('$2');
      expect(hash.length).toBeGreaterThan(50);
    });
  });

  describe('comparePassword', () => {
    it('should return true for matching password', async () => {
      const hash = await AuthService.hashPassword('password123');
      const result = await AuthService.comparePassword('password123', hash);
      expect(result).toBe(true);
    });

    it('should return false for wrong password', async () => {
      const hash = await AuthService.hashPassword('password123');
      const result = await AuthService.comparePassword('wrongpassword', hash);
      expect(result).toBe(false);
    });

    it('should return false for invalid hash', async () => {
      const result = await AuthService.comparePassword('password123', 'not-a-hash');
      expect(result).toBe(false);
    });
  });
});
