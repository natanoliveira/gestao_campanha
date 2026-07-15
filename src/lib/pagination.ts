export type PaginationParams = { page?: number; limit?: number };

export function parsePagination(params: PaginationParams) {
  const page = Math.max(1, params.page ?? 1);
  const limit = Math.min(100, Math.max(1, params.limit ?? 20));
  return { skip: (page - 1) * limit, take: limit, page, limit };
}

export function paginatedResponse<T>(data: T[], total: number, page: number, limit: number) {
  return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
}
