declare module 'express-serve-static-core' {
  interface Request {
    authorUid?: number;
    auth?: {
      userId: number;
    };
    requestId?: string;
    validated?: Partial<Record<'body' | 'headers' | 'params' | 'query', unknown>>;
  }
}

export {};
