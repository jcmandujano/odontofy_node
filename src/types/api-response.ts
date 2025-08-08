export interface ApiResponse<T> {
    success: boolean;
    message: string;
    data: T | null;
    errors: any | null;
  }
  

export interface PaginatedResponse<T> {
total: number;
page: number;
perPage: number;
totalPages: number;
results: T[];
}
  