export type SortDirection = 'asc' | 'desc';

export type SortState<TColumn extends string> = {
  column: TColumn;
  direction: SortDirection;
};

type SortValue = string | number | null | undefined;

const textCollator = new Intl.Collator('es', { sensitivity: 'base', numeric: true });

export function nextSortState<TColumn extends string>(
  current: SortState<TColumn>,
  column: TColumn,
): SortState<TColumn> {
  if (current.column === column && current.direction === 'asc') {
    return { column, direction: 'desc' };
  }

  return { column, direction: 'asc' };
}

export function sortAriaValue<TColumn extends string>(
  state: SortState<TColumn>,
  column: TColumn,
): 'ascending' | 'descending' | 'none' {
  if (state.column !== column) {
    return 'none';
  }

  return state.direction === 'asc' ? 'ascending' : 'descending';
}

export function sortRows<TItem, TColumn extends string>(
  rows: TItem[],
  state: SortState<TColumn>,
  getValue: (row: TItem, column: TColumn) => SortValue,
): TItem[] {
  return [...rows].sort((left, right) => {
    const leftValue = getValue(left, state.column);
    const rightValue = getValue(right, state.column);

    if (leftValue == null && rightValue == null) {
      return 0;
    }

    if (leftValue == null) {
      return 1;
    }

    if (rightValue == null) {
      return -1;
    }

    const result =
      typeof leftValue === 'number' && typeof rightValue === 'number'
        ? leftValue - rightValue
        : textCollator.compare(String(leftValue), String(rightValue));

    return state.direction === 'asc' ? result : -result;
  });
}
