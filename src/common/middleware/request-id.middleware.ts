import { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';

export interface RequestWithId extends Request {
  id?: string;
}

export function RequestIdMiddleware(req: RequestWithId, res: Response, next: NextFunction): void {
  const headerValue = req.headers['x-request-id'];
  req.id = typeof headerValue === 'string' && headerValue.length > 0 ? headerValue : randomUUID();
  res.setHeader('X-Request-Id', req.id);
  next();
}
