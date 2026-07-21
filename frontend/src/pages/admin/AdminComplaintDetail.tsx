import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Paper, Grid, Chip, CircularProgress,
  Button, Divider, Avatar, IconButton, Tooltip, Select,
  MenuItem, FormControl, InputLabel, type SelectChangeEvent,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import toast from 'react-hot-toast';

import {
  getAdminReportById,
  updateAdminReport,
  type Report,
  type ReportStatus,
  type ReportPriority,
} from '../../api/admin';

// ── Style maps ────────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<ReportStatus, { bg: string; color: string }> = {
  pending:   { bg: '#FEF3C7', color: '#D97706' },
  reviewed:  { bg: '#DCFCE7', color: '#15803D' },
  dismissed: { bg: '#F1F5F9', color: '#475569' },
};

const PRIORITY_STYLES: Record<ReportPriority, { bg: string; color: string }> = {
  high:   { bg: '#FEE2E2', color: '#B91C1C' },
  medium: { bg: '#FEF3C7', color: '#D97706' },
  low:    { bg: '#DCFCE7', color: '#15803D' },
};

const formatCategory = (cat: string) =>
  cat.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

// ── Component ─────────────────────────────────────────────────────────────────

export default function AdminComplaintDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  // Inline edit state
  const [statusValue,   setStatusValue]   = useState<ReportStatus   | ''>('');
  const [priorityValue, setPriorityValue] = useState<ReportPriority | ''>('');
  const [saving, setSaving] = useState(false);

  // ── Validate ID from URL then fetch ─────────────────────────────────────────
  useEffect(() => {
    const numericId = Number(id);
    if (!Number.isInteger(numericId) || numericId <= 0) {
      setError('Invalid complaint ID.');
      setLoading(false);
      return;
    }

    const fetchReport = async () => {
      try {
        const data = await getAdminReportById(numericId);
        setReport(data);
        setStatusValue(data.status);
        setPriorityValue(data.priority);
      } catch (err: any) {
        const msg = err?.response?.data?.message ?? 'Failed to load complaint.';
        setError(msg);
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [id]);

  // ── Save status / priority ──────────────────────────────────────────────────
  const handleSave = async () => {
    if (!report) return;

    const payload: { status?: ReportStatus; priority?: ReportPriority } = {};
    if (statusValue   && statusValue   !== report.status)   payload.status   = statusValue;
    if (priorityValue && priorityValue !== report.priority) payload.priority = priorityValue;

    if (Object.keys(payload).length === 0) {
      toast('No changes to save.', { icon: 'ℹ️' });
      return;
    }

    setSaving(true);
    try {
      await updateAdminReport(report.id, payload);
      setReport((prev) => prev ? { ...prev, ...payload } : prev);
      toast.success('Complaint updated successfully.');
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to update complaint.');
    } finally {
      setSaving(false);
    }
  };

  // ── Loading / error states ───────────────────────────────────────────────────
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
        <CircularProgress sx={{ color: '#1A1FE8' }} />
      </Box>
    );
  }

  if (error || !report) {
    return (
      <Box sx={{ maxWidth: 600, mx: 'auto', py: 10, textAlign: 'center' }}>
        <Typography variant="h6" fontWeight={700} color="#EF4444" mb={1}>
          {error ?? 'Complaint not found.'}
        </Typography>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/admin/complaints')}
          sx={{ mt: 2, textTransform: 'none', fontWeight: 600 }}
        >
          Back to Complaints
        </Button>
      </Box>
    );
  }

  const complainantName = report.first_name
    ? `${report.first_name} ${report.last_name ?? ''}`.trim()
    : 'Anonymous';

  const statusStyle   = STATUS_STYLES[report.status]   ?? { bg: '#F1F5F9', color: '#475569' };
  const priorityStyle = PRIORITY_STYLES[report.priority] ?? { bg: '#F1F5F9', color: '#475569' };

  // ── Main render ──────────────────────────────────────────────────────────────
  return (
    <Box sx={{ maxWidth: 900 }}>
      {/* ── Back + header ───────────────────────────────────────────────────── */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
        <Tooltip title="Back to complaints">
          <IconButton onClick={() => navigate('/admin/complaints')} sx={{ color: '#64748B' }}>
            <ArrowBackIcon />
          </IconButton>
        </Tooltip>
        <Box>
          <Typography variant="h5" fontWeight={800} color="#0F172A">
            Complaint Details
          </Typography>
          <Typography variant="caption" color="#64748B">
            Reference: <strong>{report.reference_number}</strong> &nbsp;·&nbsp; Submitted {formatDate(report.created_at)}
          </Typography>
        </Box>
      </Box>

      {/* ── Status + Priority badges ─────────────────────────────────────────── */}
      <Box sx={{ display: 'flex', gap: 1.5, mb: 4 }}>
        <Chip
          label={report.status.charAt(0).toUpperCase() + report.status.slice(1)}
          sx={{ bgcolor: statusStyle.bg, color: statusStyle.color, fontWeight: 700, borderRadius: '12px' }}
        />
        <Chip
          label={`${report.priority.toUpperCase()} PRIORITY`}
          sx={{ bgcolor: priorityStyle.bg, color: priorityStyle.color, fontWeight: 700, borderRadius: '12px' }}
        />
        <Chip
          label={formatCategory(report.category)}
          sx={{ bgcolor: '#EFF6FF', color: '#1D4ED8', fontWeight: 600, borderRadius: '12px' }}
        />
      </Box>

      <Grid container spacing={3}>
        {/* ── Left column: details ─────────────────────────────────────────── */}
        <Grid item xs={12} md={7}>
          <Paper elevation={0} sx={{ p: 3.5, borderRadius: 3, border: '1px solid #E2E8F0', bgcolor: '#fff', mb: 3 }}>
            <Typography variant="subtitle2" fontWeight={700} color="#64748B" textTransform="uppercase" mb={2}>
              Complainant
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ bgcolor: '#1A1FE8', width: 44, height: 44, fontWeight: 700 }}>
                {report.first_name ? report.first_name[0].toUpperCase() : 'A'}
              </Avatar>
              <Box>
                <Typography variant="body1" fontWeight={700} color="#0F172A">{complainantName}</Typography>
                {report.contact_email && (
                  <Typography variant="caption" color="#64748B" display="block">{report.contact_email}</Typography>
                )}
                {report.phone_number && (
                  <Typography variant="caption" color="#64748B" display="block">
                    {report.phone_number}
                    {report.is_whatsapp && (
                      <Chip size="small" label="WhatsApp" sx={{ ml: 0.5, height: 16, fontSize: '0.6rem', bgcolor: '#DCFCE7', color: '#16A34A', fontWeight: 700 }} />
                    )}
                  </Typography>
                )}
                {report.reporter_vendor_id && (
                  <Typography variant="caption" color="#94A3B8">ID: {report.reporter_vendor_id}</Typography>
                )}
              </Box>
            </Box>

            <Divider sx={{ my: 3, borderColor: '#F1F5F9' }} />

            <Typography variant="subtitle2" fontWeight={700} color="#64748B" textTransform="uppercase" mb={2}>
              Reported Vendor
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ bgcolor: '#FEE2E2', color: '#B91C1C', width: 44, height: 44, fontWeight: 700 }}>
                V
              </Avatar>
              <Box>
                <Typography variant="body1" fontWeight={700} color="#0F172A">{report.reported_vendor_id}</Typography>
                <Typography variant="caption" color="#64748B">Category: {formatCategory(report.category)}</Typography>
              </Box>
            </Box>

            <Divider sx={{ my: 3, borderColor: '#F1F5F9' }} />

            <Typography variant="subtitle2" fontWeight={700} color="#64748B" textTransform="uppercase" mb={1.5}>
              Description
            </Typography>
            <Paper elevation={0} sx={{ p: 2.5, bgcolor: '#F8FAFC', borderRadius: 2, border: '1px solid #E2E8F0' }}>
              <Typography variant="body2" color="#334155" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
                {report.context}
              </Typography>
            </Paper>

            {/* Evidence files */}
            {report.evidence_files && report.evidence_files.length > 0 && (
              <>
                <Divider sx={{ my: 3, borderColor: '#F1F5F9' }} />
                <Typography variant="subtitle2" fontWeight={700} color="#64748B" textTransform="uppercase" mb={1.5}>
                  Evidence Files
                </Typography>
                <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                  {report.evidence_files.map((file, i) => (
                    <Button
                      key={i}
                      variant="outlined"
                      size="small"
                      startIcon={<DescriptionOutlinedIcon />}
                      href={file}
                      target="_blank"
                      rel="noopener noreferrer"
                      sx={{ textTransform: 'none', borderRadius: 2, color: '#0F172A', borderColor: '#E2E8F0', fontWeight: 600 }}
                    >
                      Attachment {i + 1}
                    </Button>
                  ))}
                </Box>
              </>
            )}
          </Paper>
        </Grid>

        {/* ── Right column: actions ─────────────────────────────────────────── */}
        <Grid item xs={12} md={5}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid #E2E8F0', bgcolor: '#fff' }}>
            <Typography variant="subtitle2" fontWeight={700} color="#64748B" textTransform="uppercase" mb={2.5}>
              Update Complaint
            </Typography>

            <FormControl fullWidth size="small" sx={{ mb: 2 }}>
              <InputLabel>Status</InputLabel>
              <Select
                value={statusValue}
                label="Status"
                onChange={(e: SelectChangeEvent) => setStatusValue(e.target.value as ReportStatus)}
                sx={{ borderRadius: 2 }}
              >
                <MenuItem value="pending">Pending</MenuItem>
                <MenuItem value="reviewed">Reviewed</MenuItem>
                <MenuItem value="dismissed">Dismissed</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth size="small" sx={{ mb: 3 }}>
              <InputLabel>Priority</InputLabel>
              <Select
                value={priorityValue}
                label="Priority"
                onChange={(e: SelectChangeEvent) => setPriorityValue(e.target.value as ReportPriority)}
                sx={{ borderRadius: 2 }}
              >
                <MenuItem value="high">High</MenuItem>
                <MenuItem value="medium">Medium</MenuItem>
                <MenuItem value="low">Low</MenuItem>
              </Select>
            </FormControl>

            <Button
              variant="contained"
              fullWidth
              disableElevation
              onClick={handleSave}
              disabled={saving}
              sx={{
                bgcolor: '#1A1FE8',
                borderRadius: 2,
                fontWeight: 700,
                textTransform: 'none',
                py: 1.2,
                '&:hover': { bgcolor: '#0F14B0' },
              }}
            >
              {saving ? 'Saving…' : 'Save Changes'}
            </Button>

            <Divider sx={{ my: 3, borderColor: '#F1F5F9' }} />

            {/* Read-only metadata */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {[
                { label: 'Complaint ID', value: `#${report.id}` },
                { label: 'Reference', value: report.reference_number },
                { label: 'Submitted', value: formatDate(report.created_at) },
              ].map(({ label, value }) => (
                <Box key={label} sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="caption" color="#94A3B8" fontWeight={600} textTransform="uppercase">
                    {label}
                  </Typography>
                  <Typography variant="caption" color="#0F172A" fontWeight={600} textAlign="right" sx={{ maxWidth: '60%' }}>
                    {value}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
