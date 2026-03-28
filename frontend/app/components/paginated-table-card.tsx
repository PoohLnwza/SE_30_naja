"use client";

import {
  Box,
  Pagination,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { DashboardCard } from "./app-shell";

type PaginatedTableCardProps = {
  title: string;
  subtitle?: string;
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  header: React.ReactNode;
  body: React.ReactNode;
  empty: boolean;
  emptyLabel?: string;
};

export function PaginatedTableCard({
  title,
  subtitle,
  page,
  pageCount,
  onPageChange,
  header,
  body,
  empty,
  emptyLabel = "No matching rows found.",
}: PaginatedTableCardProps) {
  return (
    <DashboardCard>
      <Typography variant="h5">{title}</Typography>
      {subtitle && (
        <Typography color="text.secondary" sx={{ mt: 0.75 }}>
          {subtitle}
        </Typography>
      )}

      <TableContainer sx={{ mt: 2.25 }}>
        <Table size="small">
          <TableHead>{header}</TableHead>
          <TableBody>
            {empty ? (
              <TableRow>
                <TableCell colSpan={999}>
                  <Box sx={{ py: 3, px: 1 }}>
                    <Typography color="text.secondary">{emptyLabel}</Typography>
                  </Box>
                </TableCell>
              </TableRow>
            ) : (
              body
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {pageCount > 1 && (
        <Box display="flex" justifyContent="center" sx={{ mt: 2.25 }}>
          <Pagination
            page={page}
            count={pageCount}
            onChange={(_, value) => onPageChange(value)}
            color="primary"
          />
        </Box>
      )}
    </DashboardCard>
  );
}
