interface Props {
  total: number;
  page: number;
  totalPages: number;
  onPageChange: (p: number) => void;
}

export default function ClientPagination({ total, page, totalPages, onPageChange }: Props) {
  return (
    <div className="cl-footer">
      <span className="cl-footer-count">{total} cliente{total !== 1 ? 's' : ''}</span>
      <div className="pagination">
        <button disabled={page <= 1} onClick={() => onPageChange(page - 1)}>← Anterior</button>
        <span>Pág {page} de {Math.max(totalPages, 1)}</span>
        <button disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>Siguiente →</button>
      </div>
    </div>
  );
}
