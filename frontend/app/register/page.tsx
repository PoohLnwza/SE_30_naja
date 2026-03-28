"use client";

import type { AxiosError } from "axios";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  Link as MuiLink,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { PersonAddRounded } from "@mui/icons-material";
import NextLink from "next/link";
import { AuthShell } from "@/app/components/auth-shell";
import api from "@/lib/api";

type ApiErrorResponse = {
  message?: string | string[];
};

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    parentFirstName: "",
    parentLastName: "",
    parentNationalId: "",
    phone: "",
    childFirstName: "",
    childLastName: "",
    childNationalId: "",
    childBirthDate: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange =
    (field: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({ ...prev, [field]: event.target.value }));
    };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (!/^\d{13}$/.test(form.parentNationalId) || !/^\d{13}$/.test(form.childNationalId)) {
      setError("Parent and child national IDs must be 13 digits");
      return;
    }

    if (form.password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    try {
      await api.post("/auth/register", {
        userType: "parent",
        password: form.password,
        parentFirstName: form.parentFirstName,
        parentLastName: form.parentLastName,
        parentNationalId: form.parentNationalId,
        phone: form.phone || undefined,
        childFirstName: form.childFirstName,
        childLastName: form.childLastName,
        childNationalId: form.childNationalId,
        childBirthDate: form.childBirthDate,
      });
      router.push("/login");
    } catch (err: unknown) {
      const error = err as AxiosError<ApiErrorResponse>;
      const message = error.response?.data?.message || "Unable to create account right now";
      setError(Array.isArray(message) ? message.join(", ") : message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      eyebrow="Parent registration"
      title="Create family account"
      subtitle="Register the parent and the child together so booking can start immediately after sign in."
    >
      <Alert severity="info" sx={{ mb: 2.5 }}>
        Parent national ID will be used as the login username.
      </Alert>
      {error && (
        <Alert severity="error" sx={{ mb: 2.5 }}>
          {error}
        </Alert>
      )}

      <Box component="form" onSubmit={handleSubmit}>
        <Stack spacing={2.25}>
          <Typography variant="h6">Parent information</Typography>
          <TextField fullWidth label="Parent first name" value={form.parentFirstName} onChange={handleChange("parentFirstName")} required />
          <TextField fullWidth label="Parent last name" value={form.parentLastName} onChange={handleChange("parentLastName")} required />
          <TextField fullWidth label="Parent national ID" value={form.parentNationalId} onChange={handleChange("parentNationalId")} inputProps={{ maxLength: 13 }} required />
          <TextField fullWidth label="Phone number" value={form.phone} onChange={handleChange("phone")} />

          <Divider />

          <Typography variant="h6">Child information</Typography>
          <TextField fullWidth label="Child first name" value={form.childFirstName} onChange={handleChange("childFirstName")} required />
          <TextField fullWidth label="Child last name" value={form.childLastName} onChange={handleChange("childLastName")} required />
          <TextField fullWidth label="Child national ID" value={form.childNationalId} onChange={handleChange("childNationalId")} inputProps={{ maxLength: 13 }} required />
          <TextField
            fullWidth
            label="Child birth date"
            type="date"
            value={form.childBirthDate}
            onChange={handleChange("childBirthDate")}
            slotProps={{ inputLabel: { shrink: true } }}
            required
          />

          <Divider />

          <Typography variant="h6">Password</Typography>
          <TextField fullWidth label="Password" type="password" value={form.password} onChange={handleChange("password")} required />
          <TextField
            fullWidth
            label="Confirm password"
            type="password"
            value={form.confirmPassword}
            onChange={handleChange("confirmPassword")}
            required
          />
        </Stack>
        <Button
          type="submit"
          variant="contained"
          fullWidth
          size="large"
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <PersonAddRounded />}
          sx={{ mt: 3 }}
        >
          {loading ? "Creating..." : "Create family account"}
        </Button>
      </Box>

      <Typography variant="body2" color="text.secondary" sx={{ mt: 3, textAlign: "center" }}>
        Already have an account?{" "}
        <MuiLink component={NextLink} href="/login">
          Sign in
        </MuiLink>
      </Typography>
    </AuthShell>
  );
}
