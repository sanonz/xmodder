export interface IResponseBody<T = void> {
  success: boolean;
  data?: T;
  message?: string;
}

export interface IResponsePagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface IResponseError {
  code: string;
  message: string;
  details?: any;
}

export interface IResponseWithPagination<T> extends IResponseBody<T> {
  pagination: IResponsePagination;
}

export interface IResponseWithError extends IResponseBody {
  error: IResponseError;
}
