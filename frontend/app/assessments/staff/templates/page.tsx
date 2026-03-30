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
  Stack,
  TableCell,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { AppShell, PageSkeleton, StatCard } from "@/app/components/app-shell";
import { SearchSettingsCard } from "@/app/components/search-settings-card";
import { PaginatedTableCard } from "@/app/components/paginated-table-card";
import { staffNav } from "@/app/components/navigation";
import api from "@/lib/api";
import type { Profile } from "@/lib/access";

type TemplateSummary = {
  assessment_id: number;
  name: string | null;
  questionCount: number;
  resultCount: number;
  creator: {
    first_name: string | null;
    last_name: string | null;
    role: string | null;
  } | null;
};

type ApiErrorResponse = {
  message?: string | string[];
};

const pageSize = 8;

export default function TemplateLibraryPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [templates, setTemplates] = useState<TemplateSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);

  const extractMessage = (err: unknown, fallback: string) => {
    const e = err as AxiosError<ApiErrorResponse>;
    const message = e.response?.data?.message;
    return Array.isArray(message) ? message.join(", ") : (message ?? fallback);
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [{ data: profileData }, { data: templateData }] = await Promise.all([
        api.get<Profile>("/auth/profile"),
        api.get<TemplateSummary[]>("/assessment/templates"),
      ]);
      setProfile(profileData);
      setTemplates(templateData);
    } catch (err: unknown) {
      const e = err as AxiosError<ApiErrorResponse>;
      if (e.response?.status === 401) {
        localStorage.removeItem("access_token");
        router.push("/login");
        return;
      }
      setError(extractMessage(err, "Unable to load templates"));
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleDelete = async (assessmentId: number) => {
    if (!window.confirm("Delete this assessment template?")) return;
    try {
      await api.delete(`/assessment/templates/${assessmentId}`);
      setSuccess("Assessment template deleted");
      await load();
    } catch (err: unknown) {
      setError(extractMessage(err, "Unable to delete assessment template"));
    }
  };

  const filtered = useMemo(() => {
    return templates.filter((t) => {
      const matchStatus =
        statusFilter === "all"
          ? true
          : statusFilter === "locked"
            ? t.resultCount > 0
            : t.resultCount === 0;
      const haystack = `${t.name ?? ""} ${t.creator?.first_name ?? ""} ${t.creator?.last_name ?? ""} ${t.creator?.role ?? ""}`.toLowerCase();
      return matchStatus && haystack.includes(query.toLowerCase());
    });
  }, [templates, query, statusFilter]);

  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  if (loading) return <PageSkeleton />;

  return (
    <AppShell
      title="Template library"
      subtitle="View and manage all assessment templates. Locked templates have existing submissions."
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
          <Button variant="outlined" onClick={() => router.push("/assessments/staff/submissions")}>
            Recent submissions
          </Button>
          <Button variant="contained" onClick={() => router.push("/dashboard/staff")}>
            Staff overview
          </Button>
        </>
      }
    >
      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 3 }}>{success}</Alert>}

      <Box display="grid" gridTemplateColumns={{ xs: "1fr", md: "repeat(3, 1fr)" }} gap={2} mb={3}>
        <StatCard label="Templates" value={templates.length} />
        <StatCard label="Locked" value={templates.filter((t) => t.resultCount > 0).length} helper="Has submissions" />
        <StatCard label="Editable" value={templates.filter((t) => t.resultCount === 0).length} helper="No submissions yet" />
      </Box>

      <SearchSettingsCard description="Search by template name or owner. Filter by lock status.">
        <Box display="grid" gridTemplateColumns={{ xs: "1fr", md: "minmax(0,1.5fr) 200px" }} gap={2}>
          <TextField
            label="Search templates"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setPage(1); }}
            placeholder="Template name, owner name, role"
            fullWidth
          />
          <TextField
            select
            label="Status"
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            fullWidth
          >
            <MenuItem value="all">All templates</MenuItem>
            <MenuItem value="locked">Locked (has submissions)</MenuItem>
            <MenuItem value="editable">Editable (no submissions)</MenuItem>
          </TextField>
        </Box>
      </SearchSettingsCard>

      <Box sx={{ mt: 2.5 }}>
        <PaginatedTableCard
          title="Templates"
          subtitle={`${filtered.length} template${filtered.length !== 1 ? "s" : ""} found`}
          page={page}
          pageCount={Math.max(1, Math.ceil(filtered.length / pageSize))}
          onPageChange={setPage}
          empty={filtered.length === 0}
          emptyLabel="No templates match the current search."
          header={
            <TableRow>
              <TableCell>Template name</TableCell>
              <TableCell>Questions</TableCell>
              <TableCell>Results</TableCell>
              <TableCell>Owner</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          }
          body={
            <>
              {paged.map((template) => (
                <TableRow key={template.assessment_id} hover>
                  <TableCell sx={{ fontWeight: 600 }}>{template.name || "-"}</TableCell>
                  <TableCell>{template.questionCount}</TableCell>
                  <TableCell>{template.resultCount}</TableCell>
                  <TableCell>
                    {template.creator?.first_name || "-"} {template.creator?.last_name || ""}
                  </TableCell>
                  <TableCell>
                    {template.resultCount > 0 ? (
                      <Chip size="small" label="Locked" color="warning" />
                    ) : (
                      <Chip size="small" label="Editable" color="success" />
                    )}
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={1}>
                      <Button
                        size="small"
                        variant="outlined"
                        disabled={template.resultCount > 0}
                        onClick={() => router.push(`/assessments/staff?edit=${template.assessment_id}`)}
                      >
                        Edit
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        color="error"
                        disabled={template.resultCount > 0}
                        onClick={() => handleDelete(template.assessment_id)}
                      >
                        Delete
                      </Button>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </>
          }
        />
      </Box>
    </AppShell>
  );
}
