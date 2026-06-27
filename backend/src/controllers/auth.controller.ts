import { Request, Response } from 'express';
import { OAuth2Client } from 'google-auth-library';
import { AuthService } from '../services/auth.service';
import { GoogleAuthService } from '../services/GoogleAuthService';
import { asyncHandler } from '../middleware/error.middleware';
import { CreateUserRequest, LoginRequest } from '../models';
import { sendSuccess, sendError } from '../utils/response';
import prisma from '../config/db';
import { NotificationService } from '../services/notification.service';

export class AuthController {
  static signup = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { email, password, name, avatarUrl }: CreateUserRequest = req.body;
    const user = await AuthService.signup(email, password, name, avatarUrl);
    sendSuccess(res, user, 201);
  });

  static login = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { email, password }: LoginRequest = req.body;
    const result = await AuthService.login(email, password);

    res.cookie('refreshToken', result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    sendSuccess(res, result);
  });

  static refreshToken = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if (!refreshToken) {
      sendError(res, 401, 'Refresh token required');
      return;
    }

    const result = await AuthService.refreshToken(refreshToken);

    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    sendSuccess(res, {
      accessToken: result.accessToken,
      expiresIn: 900,
    });
  });

  static logout = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if (refreshToken) {
      await AuthService.revokeToken(refreshToken);
    }

    res.clearCookie('refreshToken');
    sendSuccess(res, null);
  });

  static googleLogin = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { idToken } = req.body;

    if (!idToken) {
      sendError(res, 400, 'ID token required');
      return;
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      sendError(res, 500, 'Google auth not configured');
      return;
    }

    const client = new OAuth2Client(clientId);
    let payload: any;
    try {
      const ticket = await client.verifyIdToken({ idToken, audience: clientId });
      payload = ticket.getPayload();
    } catch {
      sendError(res, 401, 'Invalid Google ID token');
      return;
    }

    if (!payload || !payload.email) {
      sendError(res, 400, 'Invalid Google profile');
      return;
    }

    const googleId = payload.sub;
    const email = payload.email.toLowerCase().trim();
    const name = payload.name || email.split('@')[0];
    const avatarUrl = payload.picture || null;
    let isNewUser = false;

    let user = await prisma.user.findUnique({ where: { googleId } });

    if (!user) {
      user = await prisma.user.findUnique({ where: { email } });
      if (user) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { googleId, provider: 'google', emailVerified: true, avatarUrl: avatarUrl || user.avatarUrl, updatedAt: new Date() },
        });
      } else {
        isNewUser = true;
        user = await prisma.user.create({
          data: { googleId, email, name: name.trim(), avatarUrl, provider: 'google', emailVerified: true, passwordHash: '', createdAt: new Date(), updatedAt: new Date() },
        });
      }
    }

    const accessToken = AuthService.signAccessToken(user.id, user.email);
    const refreshToken = AuthService.signRefreshToken(user.id, user.email);

    let workspace: { id: string; name: string } | undefined;

    if (isNewUser) {
      const firstName = name.split(' ')[0];
      const ws = await prisma.workspace.create({
        data: { name: `${firstName}'s Workspace`, ownerId: user.id, createdAt: new Date(), updatedAt: new Date() },
      });
      await prisma.workspaceMember.create({
        data: { workspaceId: ws.id, userId: user.id, role: 'owner' as any, joinedAt: new Date() },
      });
      await prisma.project.createMany({
        data: [
          { workspaceId: ws.id, name: 'Inbox', color: '#6366F1', ownerId: user.id, createdAt: new Date() },
          { workspaceId: ws.id, name: 'Welcome', color: '#10B981', ownerId: user.id, createdAt: new Date() },
        ],
      });
      workspace = { id: ws.id, name: ws.name };

      await NotificationService.notify({
        recipientId: user.id, actorId: user.id,
        type: 'account_created', title: 'Welcome!',
        message: 'Your account has been created successfully.',
        workspaceId: ws.id,
        skipSelf: false,
      });
    }

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    sendSuccess(res, { user: { id: user.id, email: user.email, name: user.name, avatarUrl: user.avatarUrl, provider: user.provider, emailVerified: user.emailVerified, createdAt: user.createdAt, updatedAt: user.updatedAt }, token: accessToken, expiresIn: 900, isNewUser, workspace });
  });

  static getGoogleLoginUrl = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const state = req.query.state as string;

    if (!state) {
      sendError(res, 400, 'State parameter required for CSRF protection');
      return;
    }

    const url = GoogleAuthService.getAuthURL(state);
    sendSuccess(res, { url });
  });

  static googleCallback = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const code = req.query.code as string;
    const state = req.query.state as string;

    if (!code) {
      sendError(res, 400, 'Authorization code required');
      return;
    }

    const sessionState = req.session?.oauthState;
    if (state !== sessionState) {
      sendError(res, 403, 'CSRF token mismatch');
      return;
    }

    const result = await GoogleAuthService.completeOAuthFlow(code);

    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    sendSuccess(res, result);
  });

  static updateProfile = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.auth?.userId;
    if (!userId) { sendError(res, 401, 'Authentication required'); return; }
    const { name, avatarUrl } = req.body;
    if (!name || name.trim().length < 1) { sendError(res, 400, 'Name is required'); return; }
    const user = await AuthService.updateProfile(userId, name, avatarUrl);
    sendSuccess(res, user);
  });

  static changePassword = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.auth?.userId;
    if (!userId) { sendError(res, 401, 'Authentication required'); return; }
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) { sendError(res, 400, 'Current and new password required'); return; }
    if (newPassword.length < 8) { sendError(res, 400, 'New password must be at least 8 characters'); return; }
    await AuthService.changePassword(userId, currentPassword, newPassword);
    sendSuccess(res, null);
  });

  static getMe = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    if (!req.auth) {
      sendError(res, 401, 'Authentication required');
      return;
    }

    sendSuccess(res, req.auth);
  });

  static verifyToken = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { token } = req.body;

    if (!token) {
      sendError(res, 400, 'Token required');
      return;
    }

    try {
      const payload = await AuthService.verifyJWT(token);
      sendSuccess(res, { valid: true, payload });
    } catch (error) {
      sendSuccess(res, {
        valid: false,
        error: error instanceof Error ? error.message : 'Invalid token',
      });
    }
  });
}
