"use client";

import type { AxiosError } from "axios";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  Box,
  Button,
  Chip,
  MenuItem,
  TableCell,
  TableRow,
  TextField,
} from "@mui/material";
import { AppShell, PageSkeleton, StatCard } from "@/app/components/app-shell";
import { SearchSettingsCard } from "@/app/components/search-settings-card";
import { PaginatedTableCard } from "@/app/components/paginated-table-card";
import { staffNav } from "@/app/components/navigation";
import api from "@/lib/api";
import type { Profile } from "@/lib/access";
import { formatDate, titleCase } from "@/lib/format";

type ResultSummary = {
  child_assessment_id: number;
  total_score: number | null;
  assessed_at: string;
  interpreted_text: string | null;
  child: {
    first_name: string | null;
    last_name: string | null;
  } | null;
  assessment: {
    name: string | null;
  } | null;
  band: {
    severity_level: string;
  } | null;
};

type StaffAssessmentDashboard = {
  summary: {
    totalTemplates: number;
    totalResults: number;
    totalChildrenAssessed: number;
  };
  recentResults: ResultSummary[];
};

type ApiErrorResponse = {
  message?: string | string[];
};

const pageSize = 8;

function isInRange(dateStr: string, range: string): boolean {
  const date = new Date(dateStr);
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (range === "today") return date >= startOfDay;
  if (range === "week") {
    const weekAgo = new Date(startOfDay);
    weekAgo.setDate(weekAgo.getDate() - 7);
    return date >= weekAgo;
  }
  if (range === "month") {
    const monthAgo = new Date(startOfDay);
    monthAgo.setDate(monthAgo.getDate() - 30);
    return date >= monthAgo;
  }
  return true;
}

export default function RecentSubmissionsPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [dashboard, setDashboard] = useState<StaffAssessmentDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [rangeFilter, setRangeFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [{ data: profileData }, { data: dashboardData }] = await Promise.all([
        api.get<Profile>("/auth/profile"),
        api.get<StaffAssessmentDashboard>("/assessment/dashboard"),
      ]);
      setProfile(profileData);
      setDashboard(dashboardData);
    } catch (err: unknown) {
      const e = err as AxiosError<ApiErrorResponse>;
      if (e.response?.status === 401) {
        localStorage.removeItem("access_token");
        router.push("/login");
        return;
      }
      const message = (e.response?.data?.message);
      setError(Array.isArray(message) ? message.join(", ") : (message ?? "Unable to load submissions"));
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  const results = dashboard?.recentResults ?? [];

  const filtered = useMemo(() => {
    return results.filter((r) => {
      const haystack = `${r.child?.first_name ?? ""} ${r.child?.last_name ?? ""} ${r.assessment?.name ?? ""}`.toLowerCase();
      const matchText = haystack.includes(query.toLowerCase());
      const matchRange = isInRange(r.assessed_at, rangeFilter);
      const matchSeverity = severityFilter === "all" || r.band?.severity_level === severityFilter;
      return matchText && matchRange && matchSeverity;
    });
  }, [results, query, rangeFilter, severityFilter]);

  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  const severityColor = (level: string) => {
    switch (level) {
      case "normal": return "success";
      case "mild": return "info";
      case "moderate": return "warning";
      case "severe": return "error";
      default: return "default";
    }
  };

  if (loading) return <PageSkeleton />;

  return (
    <AppShell
      title="Recent submissions"
      subtitle="View all child assessment submissions. Filter by date, severity, or child name."
      navTitle="Clinic Ops"
      navItems={staffNav(profile)}
      badge="Staff"
      profileName={profile?.username}
      profileMeta="Assessment operations"
      actions={
        <>
          <Button variant="outlined" onClick={() => router.back()}>
            Back
          </Button>
          <Button variant="outlined" onClick={() => router.push("/assessments/staff")}>
            New template
          </Button>
          <Button variant="outlined" onClick={() => router.push("/assessments/staff/templates")}>
            Template library
          </Button>
          <Button variant="contained" onClick={() => router.push("/dashboard/staff")}>
            Staff overview
          </Button>
        </>
      }
    >
      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      <Box display="grid" gridTemplateColumns={{ xs: "1fr", md: "repeat(3, 1fr)" }} gap={2} mb={3}>
        <StatCard label="Total results" value={dashboard?.summary.totalResults ?? 0} />
        <StatCard label="Children assessed" value={dashboard?.summary.totalChildrenAssessed ?? 0} />
        <StatCard label="Filtered results" value={filtered.length} helper="Matching current search" />
      </Box>

      <SearchSettingsCard description="Search by child name or assessment. Filter by time range and severity level.">
        <Box display="grid" gridTemplateColumns={{ xs: "1fr", md: "minmax(0,1.5fr) 180px 180px" }} gap={2}>
          <TextField
            label="Search submissions"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setPage(1); }}
            placeholder="Child name, assessment name"
            fullWidth
          />
          <TextField
            select
            label="Time range"
            value={rangeFilter}
            onChange={(e) => { setRangeFilter(e.target.value); setPage(1); }}
            fullWidth
          >
            <MenuItem value="all">All time</MenuItem>
            <MenuItem value="today">Today</MenuItem>
            <MenuItem value="week">Last 7 days</MenuItem>
            <MenuItem value="month">Last 30 days</MenuItem>
          </TextField>
          <TextField
            select
            label="Severity"
            value={severityFilter}
            onChange={(e) => { setSeverityFilter(e.target.value); setPage(1); }}
            fullWidth
          >
            <MenuItem value="all">All severities</MenuItem>
            <MenuItem value="normal">Normal</MenuItem>
            <MenuItem value="mild">Mild</MenuItem>
            <MenuItem value="moderate">Moderate</MenuItem>
            <MenuItem value="severe">Severe</MenuItem>
          </TextField>
        </Box>
      </SearchSettingsCard>

      <Box sx={{ mt: 2.5 }}>
        <PaginatedTableCard
          title="Submissions"
          subtitle={`${filtered.length} submission${filtered.length !== 1 ? "s" : ""} found`}
          page={page}
          pageCount={Math.max(1, Math.ceil(filtered.length / pageSize))}
          onPageChange={setPage}
          empty={filtered.length === 0}
          emptyLabel="No submissions match the current filters."
          header={
            <TableRow>
              <TableCell>Child</TableCell>
              <TableCell>Assessment</TableCell>
              <TableCell>Score</TableCell>
              <TableCell>Severity</TableCell>
              <TableCell>Date</TableCell>
            </TableRow>
          }
          body={
            <>
              {paged.map((result) => (
                <TableRow key={result.child_assessment_id} hover>
                  <TableCell sx={{ fontWeight: 600 }}>
                    {result.child?.first_name || "-"} {result.child?.last_name || ""}
                  </TableCell>
                  <TableCell>{result.assessment?.name || "-"}</TableCell>
                  <TableCell>{result.total_score ?? 0}</TableCell>
                  <TableCell>
                    {result.band?.severity_level ? (
                      <Chip
                        size="small"
                        label={titleCase(result.band.severity_level)}
                        color={severityColor(result.band.severity_level) as any}
                      />
                    ) : "-"}
                  </TableCell>
                  <TableCell>{formatDate(result.assessed_at, "en-US")}</TableCell>
                </TableRow>
              ))}
            </>
          }
        />
      </Box>
    </AppShell>
  );
}
