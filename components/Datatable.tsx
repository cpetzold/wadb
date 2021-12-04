import { Table, Thead, Tbody, Tr, Th, Td, chakra } from "@chakra-ui/react";
import { TriangleDownIcon, TriangleUpIcon } from "@chakra-ui/icons";
import {
  useTable,
  useSortBy,
  UseSortByColumnProps,
  ColumnInstance,
} from "react-table";
import React from "react";

interface TableColumn<D extends object = {}>
  extends ColumnInstance<D>,
    UseSortByColumnProps<D> {
  isNumeric: boolean;
}

export default function DataTable({ data, columns }) {
  const { getTableProps, getTableBodyProps, headerGroups, rows, prepareRow } =
    useTable({ columns, data }, useSortBy);

  return (
    <Table size="sm" {...getTableProps()}>
      <Thead>
        {headerGroups.map((headerGroup) => (
          <Tr {...headerGroup.getHeaderGroupProps()}>
            {headerGroup.headers.map((c: any) => {
              const column = c as unknown as TableColumn<object>;
              return (
                <Th
                  {...column.getHeaderProps(column.getSortByToggleProps())}
                  isNumeric={column.isNumeric}
                >
                  {column.render("Header")}
                  <chakra.span pl="4">
                    {column.isSorted ? (
                      column.isSortedDesc ? (
                        <TriangleDownIcon aria-label="sorted descending" />
                      ) : (
                        <TriangleUpIcon aria-label="sorted ascending" />
                      )
                    ) : null}
                  </chakra.span>
                </Th>
              );
            })}
          </Tr>
        ))}
      </Thead>
      <Tbody {...getTableBodyProps()}>
        {rows.map((row) => {
          prepareRow(row);
          return (
            <Tr {...row.getRowProps()}>
              {row.cells.map((cell) => {
                const column = cell.column as unknown as TableColumn<object>;
                return (
                  <Td {...cell.getCellProps()} isNumeric={column.isNumeric}>
                    {cell.render("Cell")}
                  </Td>
                );
              })}
            </Tr>
          );
        })}
      </Tbody>
    </Table>
  );
}
