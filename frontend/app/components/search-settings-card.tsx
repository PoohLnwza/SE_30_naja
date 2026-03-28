"use client";

import { Box, type BoxProps, Typography } from "@mui/material";
import { DashboardCard } from "./app-shell";

type SearchSettingsCardProps = {
  title?: string;
  description?: string;
  children: React.ReactNode;
  contentSx?: BoxProps["sx"];
};

export function SearchSettingsCard({
  title = "Search settings",
  description,
  children,
  contentSx,
}: SearchSettingsCardProps) {
  return (
    <DashboardCard>
      <Typography variant="h5">{title}</Typography>
      {description && (
        <Typography color="text.secondary" sx={{ mt: 0.75 }}>
          {description}
        </Typography>
      )}
      <Box sx={{ mt: 2.25, ...contentSx }}>{children}</Box>
    </DashboardCard>
  );
}
