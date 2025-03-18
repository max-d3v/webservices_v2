import { NextFunction, Request, Response } from "express";

export class HttpError extends Error {
    constructor(public statusCode: number, message: string) {
      super(message);
    }
  }

  export class HttpErrorWithDetails extends HttpError {
    constructor(public statusCode: number, message: string, public details: unknown) {
      super(statusCode, message);
    }
  }
  export const ErrorHandling = (
    err: any,
    req: Request,
    res: Response,
    next: NextFunction
  ): Response => {
    if (err instanceof HttpErrorWithDetails) {
      return res.status(err.statusCode).json({
        error: err.message,
        details: err.details
      });
    }
  
    if (err instanceof HttpError) {
      return res.status(err.statusCode).json({
        error: err.message
      });
    }
  
    if (err instanceof Error) {
      return res.status(500).json({
        error: err.message
      });
    }
  
    return res.status(500).json({
      error: err?.message 
    });
  };

  
