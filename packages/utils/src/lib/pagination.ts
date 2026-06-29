import { PaginationQuery } from '@helix/types';

export interface PaginationParams {
  skip: number;
  take: number;
  page: number;
  pageSize: number;
}

export function parsePagination(query: PaginationQuery, defaults = { page: 1, pageSize: 20 }): PaginationParams {
  const page = Math.max(1, query.page ?? defaults.page);
  const pageSize = Math.min(100, Math.max(1, query.pageSize ?? defaults.pageSize));
  const skip = (page - 1) * pageSize;

  return { skip, take: pageSize, page, pageSize };
}

export function buildPaginatedResponse<T>(
  items: T[],
  total: number,
  page: number,
  pageSize: number,
) {
  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}
