import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { UploadRejected } from '../services/documentAnalysis.js';
import { ApplicationBlocked } from '../services/applicationService.js';

export class NotFound extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFound';
  }
}

/**
 * Turns anything thrown into a citizen-readable message plus a next action.
 * Stack traces stay in the server log.
 */
export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (error instanceof ZodError) {
    console.warn('[api] invalid request:', error.issues);
    res.status(400).json({
      error: {
        code: 'invalid_request',
        message: 'Something in that request did not look right.',
        action: 'Refresh the page and try again.',
      },
    });
    return;
  }

  if (error instanceof NotFound) {
    res.status(404).json({
      error: { code: 'not_found', message: error.message, action: 'Go back and start again.' },
    });
    return;
  }

  if (error instanceof UploadRejected || error instanceof ApplicationBlocked) {
    res.status(400).json({
      error: { code: 'blocked', message: error.message, action: error.action },
    });
    return;
  }

  console.error('[api] unhandled error:', error);
  res.status(500).json({
    error: {
      code: 'server_error',
      message: 'Something went wrong on our side.',
      action: 'Try again in a moment. Nothing you prepared has been lost.',
    },
  });
}

/**
 * Express 4 does not catch rejections from async handlers - they escape the
 * error middleware entirely and surface as unhandled rejections. Every async
 * route goes through this.
 */
export function asyncHandler(
  handler: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    handler(req, res, next).catch(next);
  };
}
