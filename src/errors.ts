export class ApliiqError extends Error {
    constructor(
      public message: string,
      public statusCode: number,
      public details?: any
    ) {
      super(message);
      Object.setPrototypeOf(this, ApliiqError.prototype);
    }
  }