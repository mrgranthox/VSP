interface PaginationInput {
  page: number;
  limit: number;
}

const getPaginationArgs = ({ page, limit }: PaginationInput) => ({
  skip: (page - 1) * limit,
  take: limit
});

const buildPagination = (page: number, limit: number, total: number) => ({
  page,
  limit,
  total,
  hasNext: page * limit < total
});

export { buildPagination, getPaginationArgs };
export type { PaginationInput };
