import { NextFunction, Request, Response } from "express";

export class HttpError extends Error {
    constructor(public statusCode: number, message: string) {
      super(message);
    }
  }

  export class HttpErrorWithDetails extends HttpError {
    constructor(public statusCode: number, message: string, public details: any[]) {
      super(statusCode, message);
    }
  }
export const ErrorHandling = (err: HttpError | HttpErrorWithDetails | Error, req: Request, res: Response, next: NextFunction): Response => {
    console.error(err.stack);
    const statusCode = (err as HttpError).statusCode || 500;
    const message = err.message || 'An unexpected error occurred';
    
    if (err instanceof HttpErrorWithDetails) {
      console.log(err);
      return res.status(statusCode).json({ error: message, details: err.details });
    } else {
        return res.status(statusCode).json({ error: message });
    }
}