declare module 'express-serve-static-core' {
  interface Request {
    authorUid?: number;
    requestId?: string;
    validated?: Partial<Record<'body' | 'params' | 'query', unknown>>;
  }
}

export {};
