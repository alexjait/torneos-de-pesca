import { sortAriaValue, type SortState } from '@/lib/table-sorting';

export function SortableTableHeader<TColumn extends string>({
  column,
  label,
  state,
  onSort,
}: {
  column: TColumn;
  label: string;
  state: SortState<TColumn>;
  onSort: (column: TColumn) => void;
}) {
  const isActive = state.column === column;
  const nextDirection = isActive && state.direction === 'asc' ? 'descendente' : 'ascendente';
  const indicator = isActive ? (state.direction === 'asc' ? '↑' : '↓') : '↕';

  return (
    <th aria-sort={sortAriaValue(state, column)}>
      <button
        type="button"
        className={`table-sort-button ${isActive ? 'is-active' : ''}`}
        onClick={() => onSort(column)}
        aria-label={`Ordenar por ${label} de forma ${nextDirection}`}
      >
        <span>{label}</span>
        <span aria-hidden="true" className="table-sort-indicator">{indicator}</span>
      </button>
    </th>
  );
}
