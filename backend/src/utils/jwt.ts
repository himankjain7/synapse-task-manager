import jwt, { JwtPayload, VerifyOptions } from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_only_for_local_debugging_replace_in_production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dev_refresh_secret_only_for_local_debugging_replace_in_production';

interface TokenPayload extends JwtPayload {
  userId: string;
  email: string;
}

interface VerifyResult<T = TokenPayload> {
  valid: boolean;
  payload?: T;
  error?: string;
}

export const verifyAccessToken = (token: string): TokenPayload => {
  try {
    const cleanToken = token.replace(/^Bearer\s+/i, '');

    const options: VerifyOptions = {
      issuer: 'synapse-api',
      algorithms: ['HS256'],
    };

    const decoded = jwt.verify(cleanToken, JWT_SECRET, options) as TokenPayload;

    if (!decoded.userId || !decoded.email) {
      throw new Error('Token missing required fields');
    }

    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Access token has expired');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid access token');
    }
    throw error;
  }
};

export const verifyRefreshToken = (token: string): TokenPayload => {
  try {
    const options: VerifyOptions = {
      issuer: 'synapse-api',
      algorithms: ['HS256'],
    };

    const decoded = jwt.verify(token, JWT_REFRESH_SECRET, options) as TokenPayload;

    if (!decoded.userId || !decoded.email) {
      throw new Error('Token missing required fields');
    }

    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Refresh token has expired');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid refresh token');
    }
    throw error;
  }
};

export const safeVerifyToken = (
  token: string,
  type: 'access' | 'refresh' = 'access'
): VerifyResult => {
  try {
    const payload = type === 'access' ? verifyAccessToken(token) : verifyRefreshToken(token);
    return { valid: true, payload };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Token verification failed',
    };
  }
};
