export class NetworkError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = "NetworkError";
    this.status = status;
  }
}

export function isNetworkError(error: unknown): error is NetworkError {
  return error instanceof NetworkError;
}
