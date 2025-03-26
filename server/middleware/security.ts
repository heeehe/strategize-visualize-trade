import { Request, Response, NextFunction } from 'express';

export const securityHeaders = (req: Request, res: Response, next: NextFunction) => {
  res.set({
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Content-Security-Policy': "default-src 'self'",
    'X-XSS-Protection': '1; mode=block'
  });
  next();
};

export const rateLimiter = (windowMs: number, max: number) => {
  const requests = new Map();
  
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip;
    const current = requests.get(ip) || { count: 0, start: Date.now() };
    
    if (Date.now() - current.start > windowMs) {
      requests.delete(ip);
    } else if (current.count >= max) {
      return res.status(429).send('Too many requests');
    }
    
    requests.set(ip, { count: current.count + 1, start: current.start });
    next();
  };
};
