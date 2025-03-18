import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { HttpError } from '../utils/errorHandler';

interface AuthRequest extends Request {
  user?: any;
}

export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  const tokenInHeader = req.header('Authorization')?.replace('Bearer ', '');
  const tokenInUrl = req.query.token as string; 

  const token = tokenInHeader || tokenInUrl;
  
  if (!token) {
    throw new HttpError(401, 'No token provided');
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string);
    req.user = decoded;
    next();
  } catch (error) {
    throw new HttpError(401, 'Invalid token');
  }
};


//export function generateToken(userId: string): string {
//  return jwt.sign({ userId }, process.env.JWT_SECRET as string);
//}