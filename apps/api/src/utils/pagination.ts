import type { PaginationMeta } from "@superlink/shared";

export interface Pagination {
  skip: number;
  take: number;
  page: number;
  limit: number;
}

export function paginate(page: number, limit: number): Pagination {
  return { skip: (page - 1) * limit, take: limit, page, limit };
}

export function paginationMeta(page: number, limit: number, total: number): PaginationMeta {
  return {
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}
