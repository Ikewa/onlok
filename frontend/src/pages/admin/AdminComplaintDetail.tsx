import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Paper, Grid, Chip, CircularProgress,
  Button, Avatar, IconButton, Tooltip, TextField,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Divider,
} from '@mui/material';
import ArrowBackIcon           from '@mui/icons-material/ArrowBack';
import FlagIcon                 from '@mui/icons-material/Flag';
import CheckCircleOutlineIcon   from '@mui/icons-material/CheckCircleOutlined';
import CancelOutlinedIcon       from '@mui/icons-material/CancelOutlined';
import PersonOutlinedIcon        from '@mui/icons-material/PersonOutlined';
import StorefrontIcon            from '@mui/icons-material/Storefront';
import AttachFileIcon            from '@mui/icons-material/AttachFile';
import DescriptionOutlinedIcon   from '@mui/icons-material/DescriptionOutlined';
import StickyNote2OutlinedIcon   from '@mui/icons-material/StickyNote2Outlined';
import TimelineOutlinedIcon      from '@mui/icons-material/TimelineOutlined';
import RadioButtonCheckedIcon    from '@mui/icons-material/RadioButtonChecked';
import AssignmentIndOutlinedIcon from '@mui/icons-material/AssignmentIndOutlined';
import AssignmentTurnedInOutlinedIcon from '@mui/icons-material/AssignmentTurnedInOutlined';

import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';

import {
  getAdminReportById,
  updateAdminReport,
  addAdminReportNote,
  type Report,
  type ReportStatus,
  type ReportPriority,
  type ReportNote,
  type TimelineEvent,
} from '../../api/admin';

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<ReportStatus, { bg: string; color: string; label: string }> = {
  pending:   { bg: '#FEF3C7', color: '#D97706', label: 'Pending' },
  reviewed:  { bg: '#DCFCE7', color: '#15803D', label: 'Reviewed' },
  dismissed: { bg: '#F1F5F9', color: '#475569', label: 'Dismissed' },
};

const PRIORITY_STYLES: Record<ReportPriority, { bg: string; color: string; label: string }> = {
  high:   { bg: '#FEE2E2', color: '#B91C1C', label: 'HIGH PRIORITY' },
  medium: { bg: '#FEF3C7', color: '#D97706', label: 'MEDIUM PRIORITY' },
  low:    { bg: '#DCFCE7', color: '#15803D', label: 'LOW PRIORITY' },
};

const TIMELINE_ICONS: Record<string, { icon: React.ReactNode; color: string }> = {
  case_opened:       { icon: <RadioButtonCheckedIcon sx={{ fontSize: 15 }} />, color: '#1A1FE8' },
  status_reviewed:   { icon: <CheckCircleOutlineIcon sx={{ fontSize: 15 }} />, color: '#15803D' },
  status_dismissed:  { icon: <CancelOutlinedIcon sx={{ fontSize: 15 }} />,    color: '#475569' },
  status_reopened:   { icon: <RadioButtonCheckedIcon sx={{ fontSize: 15 }} />, color: '#F59E0B' },
  priority_changed:  { icon: <FlagIcon sx={{ fontSize: 15 }} />,               color: '#EF4444' },
  assigned:          { icon: <AssignmentIndOutlinedIcon sx={{ fontSize: 15 }} />, color: '#8B5CF6' },
  note_added:        { icon: <StickyNote2OutlinedIcon sx={{ fontSize: 15 }} />, color: '#64748B' },
};

const DEFAULT_TIMELINE_STYLE = { icon: <RadioButtonCheckedIcon sx={{ fontSize: 15 }} />, color: '#94A3B8' };

const IMAGE_EXTS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];

const formatCategory = (cat: string) =>
  cat.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

const formatDateFull = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

const timeAgo = (iso: string) =>
  formatDistanceToNow(new Date(iso), { addSuffix: true });

const isImageUrl = (url: string) =>
  IMAGE_EXTS.some((ext) => url.toLowerCase().endsWith(ext));

const initials = (first: string | null, last: string | null) =>
  `${(first?.[0] ?? '').toUpperCase()}${(last?.[0] ?? '').toUpperCase()}` || '?';

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <Typography
      variant="overline"
      fontWeight={800}
      fontSize="0.7rem"
      letterSpacing="0.1em"
      color="#94A3B8"
      display="block"
      mb={2}
    >
      {children}
    </Typography>
  );
}

function MetaRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, py: 1 }}>
      <Typography variant="caption" color="#94A3B8" fontWeight={600} sx={{ whiteSpace: 'nowrap' }}>
        {label}
      </Typography>
      <Typography variant="caption" color="#0F172A" fontWeight={600} textAlign="right">
        {value}
      </Typography>
    </Box>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function AdminComplaintDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [report,  setReport]  = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  // Notes
  const [notes,       setNotes]       = useState<ReportNote[]>([]);
  const [noteText,    setNoteText]    = useState('');
  const [postingNote, setPostingNote] = useState(false);

  // Timeline
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);

  // Action saving
  const [actionLoading, setActionLoading] = useState<ReportStatus | null>(null);

  // Confirm dialog
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    action: ReportStatus | null;
    label: string;
  }>({ open: false, action: null, label: '' });

  const noteRef = useRef<HTMLTextAreaElement>(null);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const numericId = Number(id);
    if (!Number.isInteger(numericId) || numericId <= 0) {
      setError('Invalid complaint ID.');
      setLoading(false);
      return;
    }

    (async () => {
      try {
        const data = await getAdminReportById(numericId);
        setReport(data);
        setNotes(data.notes ?? []);
        setTimeline(data.timeline ?? []);
      } catch (err: any) {
        setError(err?.response?.data?.message ?? 'Failed to load complaint.');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  // ── Post note ──────────────────────────────────────────────────────────────
  const handlePostNote = async () => {
    if (!report || !noteText.trim()) return;
    setPostingNote(true);
    try {
      const newNote = await addAdminReportNote(report.id, noteText.trim());
      setNotes((prev) => [newNote, ...prev]);
      // Optimistically append timeline event
      setTimeline((prev) => [
        ...prev,
        {
          id: Date.now(),
          event_type: 'note_added',
          description: 'Internal note added.',
          created_at: new Date().toISOString(),
        },
      ]);
      setNoteText('');
      toast.success('Note posted.');
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to post note.');
    } finally {
      setPostingNote(false);
    }
  };

  // ── Status action ──────────────────────────────────────────────────────────
  const handleStatusAction = (status: ReportStatus, label: string) => {
    setConfirmDialog({ open: true, action: status, label });
  };

  const confirmAction = async () => {
    const status = confirmDialog.action;
    setConfirmDialog({ open: false, action: null, label: '' });
    if (!report || !status) return;

    setActionLoading(status);
    try {
      await updateAdminReport(report.id, { status });
      setReport((prev) => prev ? { ...prev, status } : prev);
      // Optimistically add to timeline
      const descriptions: Record<string, string> = {
        reviewed:  'Case marked as Reviewed.',
        dismissed: 'Case dismissed.',
        pending:   'Case re-opened.',
      };
      setTimeline((prev) => [
        ...prev,
        {
          id: Date.now(),
          event_type: `status_${status === 'pending' ? 'reopened' : status}`,
          description: descriptions[status] ?? `Status changed to ${status}.`,
          created_at: new Date().toISOString(),
        },
      ]);
      toast.success(`Case ${status}.`);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to update case.');
    } finally {
      setActionLoading(null);
    }
  };

  // ── Loading / error ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 12 }}>
        <CircularProgress sx={{ color: '#1A1FE8' }} />
      </Box>
    );
  }

  if (error || !report) {
    return (
      <Box sx={{ maxWidth: 560, mx: 'auto', py: 12, textAlign: 'center' }}>
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

  const priorityStyle = PRIORITY_STYLES[report.priority] ?? { bg: '#F1F5F9', color: '#475569', label: report.priority.toUpperCase() };
  const statusStyle   = STATUS_STYLES[report.status]     ?? { bg: '#F1F5F9', color: '#475569', label: report.status };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <Box sx={{ maxWidth: 1200, pb: 6 }}>

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3.5, gap: 2, flexWrap: 'wrap' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Tooltip title="Back to complaints">
            <IconButton
              onClick={() => navigate('/admin/complaints')}
              size="small"
              sx={{ color: '#64748B', bgcolor: '#F8FAFC', border: '1px solid #E2E8F0', '&:hover': { bgcolor: '#F1F5F9' } }}
            >
              <ArrowBackIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
              <Typography variant="h5" fontWeight={800} color="#0F172A" lineHeight={1.2}>
                Case #{report.reference_number}
              </Typography>
              <Chip
                label={statusStyle.label}
                size="small"
                sx={{ bgcolor: statusStyle.bg, color: statusStyle.color, fontWeight: 700, borderRadius: '8px', fontSize: '0.72rem' }}
              />
            </Box>
            <Typography variant="body2" color="#64748B" mt={0.5}>
              {formatCategory(report.category)}&nbsp;·&nbsp;
              {report.context.length > 80
                ? report.context.slice(0, 80) + '…'
                : report.context}
            </Typography>
          </Box>
        </Box>

        {/* Priority badge */}
        <Chip
          label={priorityStyle.label}
          sx={{
            bgcolor: priorityStyle.bg,
            color: priorityStyle.color,
            fontWeight: 800,
            fontSize: '0.72rem',
            borderRadius: '8px',
            letterSpacing: '0.05em',
            flexShrink: 0,
          }}
        />
      </Box>

      {/* ── Grid Layout (MUI 9 size prop) ─────────────────────────────────── */}
      <Grid container spacing={3}>

        {/* ── LEFT MAIN CONTENT (7 cols) ────────────────────────────────── */}
        <Grid size={{ xs: 12, md: 7 }}>

          {/* Complaint Narrative */}
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid #E2E8F0', bgcolor: '#fff', mb: 3 }}>
            <SectionLabel>Complaint Narrative</SectionLabel>

            <Paper
              elevation={0}
              sx={{
                p: 2.5,
                bgcolor: '#F8FAFC',
                borderRadius: 2.5,
                border: '1px solid #E2E8F0',
                mb: 3,
                position: 'relative',
                '&::before': {
                  content: '"\u201c"',
                  position: 'absolute',
                  top: 8,
                  left: 12,
                  fontSize: '2rem',
                  color: '#CBD5E1',
                  lineHeight: 1,
                },
              }}
            >
              <Typography
                variant="body2"
                color="#334155"
                sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.8, pl: 2.5, fontStyle: 'italic' }}
              >
                {report.context}
              </Typography>
            </Paper>

            {/* Metadata breakdown */}
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 4 }}>
                <Box sx={{ p: 2, bgcolor: '#F8FAFC', borderRadius: 2, border: '1px solid #E2E8F0' }}>
                  <Typography variant="caption" color="#94A3B8" fontWeight={600} display="block" mb={0.5}>
                    Dispute Reason
                  </Typography>
                  <Typography variant="body2" fontWeight={700} color="#0F172A">
                    {formatCategory(report.category)}
                  </Typography>
                </Box>
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <Box sx={{ p: 2, bgcolor: '#F8FAFC', borderRadius: 2, border: '1px solid #E2E8F0' }}>
                  <Typography variant="caption" color="#94A3B8" fontWeight={600} display="block" mb={0.5}>
                    Filing Date
                  </Typography>
                  <Typography variant="body2" fontWeight={700} color="#0F172A">
                    {new Date(report.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </Typography>
                </Box>
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <Box sx={{ p: 2, bgcolor: '#F8FAFC', borderRadius: 2, border: '1px solid #E2E8F0' }}>
                  <Typography variant="caption" color="#94A3B8" fontWeight={600} display="block" mb={0.5}>
                    Current Status
                  </Typography>
                  <Chip
                    label={statusStyle.label}
                    size="small"
                    sx={{ bgcolor: statusStyle.bg, color: statusStyle.color, fontWeight: 700, borderRadius: '8px', fontSize: '0.72rem' }}
                  />
                </Box>
              </Grid>
            </Grid>
          </Paper>

          {/* Complainant + Vendor profiles side-by-side */}
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid #E2E8F0', bgcolor: '#fff', mb: 3 }}>
            <Grid container spacing={3}>
              {/* Complainant */}
              <Grid size={{ xs: 12, sm: 6 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <PersonOutlinedIcon sx={{ fontSize: 18, color: '#94A3B8' }} />
                  <Typography variant="caption" fontWeight={700} color="#94A3B8" textTransform="uppercase" letterSpacing="0.07em">
                    Complainant Profile
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                  <Avatar sx={{ bgcolor: '#EEF2FF', color: '#1A1FE8', fontWeight: 800, width: 44, height: 44, fontSize: '0.95rem' }}>
                    {report.first_name ? report.first_name[0].toUpperCase() : 'A'}
                  </Avatar>
                  <Box>
                    <Typography variant="body2" fontWeight={700} color="#0F172A">
                      {complainantName}
                    </Typography>
                    {report.contact_email && (
                      <Typography variant="caption" color="#64748B" display="block">
                        {report.contact_email}
                      </Typography>
                    )}
                    {report.reporter_vendor_id && (
                      <Typography variant="caption" color="#94A3B8" display="block">
                        ID: {report.reporter_vendor_id}
                      </Typography>
                    )}
                    {report.phone_number && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                        <Typography variant="caption" color="#64748B">{report.phone_number}</Typography>
                        {report.is_whatsapp && (
                          <Chip size="small" label="WhatsApp" sx={{ height: 18, fontSize: '0.62rem', bgcolor: '#DCFCE7', color: '#16A34A', fontWeight: 700 }} />
                        )}
                      </Box>
                    )}
                  </Box>
                </Box>
              </Grid>

              {/* Vendor */}
              <Grid size={{ xs: 12, sm: 6 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <StorefrontIcon sx={{ fontSize: 18, color: '#94A3B8' }} />
                  <Typography variant="caption" fontWeight={700} color="#94A3B8" textTransform="uppercase" letterSpacing="0.07em">
                    Vendor Profile
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                  <Avatar sx={{ bgcolor: '#FEF2F2', color: '#B91C1C', fontWeight: 800, width: 44, height: 44, fontSize: '0.95rem' }}>
                    {report.reported_vendor_id[0]?.toUpperCase() ?? 'V'}
                  </Avatar>
                  <Box>
                    <Typography variant="body2" fontWeight={700} color="#0F172A">
                      {report.reported_vendor_id}
                    </Typography>
                    <Typography variant="caption" color="#64748B" display="block">
                      Reported vendor
                    </Typography>
                  </Box>
                </Box>
              </Grid>
            </Grid>
          </Paper>

          {/* Evidence & Documentation (if present) */}
          {report.evidence_files && report.evidence_files.length > 0 && (
            <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid #E2E8F0', bgcolor: '#fff', mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <AttachFileIcon sx={{ fontSize: 18, color: '#94A3B8' }} />
                <Typography variant="caption" fontWeight={700} color="#94A3B8" textTransform="uppercase" letterSpacing="0.07em">
                  Evidence &amp; Documentation
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                {report.evidence_files.map((file, i) => {
                  const isImage = isImageUrl(file);
                  const fileName = file.split('/').pop() ?? `File ${i + 1}`;
                  return (
                    <Box
                      key={i}
                      component="a"
                      href={file}
                      target="_blank"
                      rel="noopener noreferrer"
                      sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 96,
                        height: 96,
                        borderRadius: 2,
                        border: '1px solid #E2E8F0',
                        overflow: 'hidden',
                        textDecoration: 'none',
                        bgcolor: '#F8FAFC',
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                        '&:hover': { borderColor: '#1A1FE8', boxShadow: '0 2px 8px rgba(26,31,232,0.12)' },
                      }}
                    >
                      {isImage ? (
                        <Box
                          component="img"
                          src={file}
                          alt={`Evidence ${i + 1}`}
                          sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          onError={(e: any) => { e.currentTarget.style.display = 'none'; }}
                        />
                      ) : (
                        <>
                          <DescriptionOutlinedIcon sx={{ fontSize: 28, color: '#94A3B8', mb: 0.5 }} />
                          <Typography
                            variant="caption"
                            color="#64748B"
                            fontWeight={600}
                            sx={{ px: 0.5, textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%', fontSize: '0.65rem' }}
                          >
                            {fileName}
                          </Typography>
                        </>
                      )}
                    </Box>
                  );
                })}
              </Box>
            </Paper>
          )}

          {/* Internal Investigation Notes */}
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid #E2E8F0', bgcolor: '#fff' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <StickyNote2OutlinedIcon sx={{ fontSize: 18, color: '#94A3B8' }} />
              <Typography variant="caption" fontWeight={700} color="#94A3B8" textTransform="uppercase" letterSpacing="0.07em">
                Internal Investigation Notes
              </Typography>
            </Box>

            <TextField
              inputRef={noteRef}
              multiline
              rows={3}
              fullWidth
              placeholder="Type an internal note… (Only visible to admins)"
              value={noteText}
              onChange={(e) => setNoteText(e.target.value.slice(0, 5000))}
              inputProps={{ maxLength: 5000 }}
              size="small"
              sx={{
                mb: 1.5,
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                  fontSize: '0.875rem',
                  bgcolor: '#FAFBFC',
                },
              }}
            />

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="caption" color="#94A3B8">
                {noteText.length}/5000
              </Typography>
              <Button
                variant="contained"
                size="small"
                disableElevation
                onClick={handlePostNote}
                disabled={postingNote || !noteText.trim()}
                sx={{
                  bgcolor: '#0F172A',
                  borderRadius: 2,
                  fontWeight: 700,
                  textTransform: 'none',
                  px: 2.5,
                  '&:hover': { bgcolor: '#1E293B' },
                }}
              >
                {postingNote ? 'Posting…' : 'Post Note'}
              </Button>
            </Box>

            {/* Posted notes list */}
            {notes.length > 0 && (
              <>
                <Divider sx={{ my: 2.5, borderColor: '#F1F5F9' }} />
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {notes.map((n) => (
                    <Box key={n.id} sx={{ display: 'flex', gap: 1.5 }}>
                      <Avatar
                        sx={{ width: 32, height: 32, bgcolor: '#EEF2FF', color: '#1A1FE8', fontSize: '0.75rem', fontWeight: 800, flexShrink: 0, mt: 0.25 }}
                      >
                        {initials(n.admin_first_name, n.admin_last_name)}
                      </Avatar>
                      <Box sx={{ flex: 1 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                          <Typography variant="caption" fontWeight={700} color="#0F172A">
                            {n.admin_first_name} {n.admin_last_name}
                          </Typography>
                          <Typography variant="caption" color="#94A3B8" sx={{ ml: 1, whiteSpace: 'nowrap' }}>
                            {timeAgo(n.created_at)}
                          </Typography>
                        </Box>
                        <Paper elevation={0} sx={{ p: 1.75, bgcolor: '#F8FAFC', borderRadius: 2, border: '1px solid #E2E8F0' }}>
                          <Typography variant="body2" color="#334155" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.6, fontSize: '0.8125rem' }}>
                            {n.note}
                          </Typography>
                        </Paper>
                      </Box>
                    </Box>
                  ))}
                </Box>
              </>
            )}
          </Paper>

        </Grid>

        {/* ── RIGHT SIDEBAR (5 cols) ────────────────────────────────────── */}
        <Grid size={{ xs: 12, md: 5 }}>

          {/* 1. Case Actions */}
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid #E2E8F0', bgcolor: '#fff', mb: 3 }}>
            <SectionLabel>Case Actions</SectionLabel>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Button
                variant="contained"
                startIcon={<CheckCircleOutlineIcon />}
                onClick={() => handleStatusAction('reviewed', 'Resolve this case')}
                disabled={!!actionLoading || report.status === 'reviewed'}
                disableElevation
                fullWidth
                sx={{
                  py: 1.2,
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 700,
                  bgcolor: '#0F172A',
                  '&:hover': { bgcolor: '#1E293B' },
                  '&.Mui-disabled': { opacity: 0.45 },
                }}
              >
                {actionLoading === 'reviewed' ? 'Saving…' : 'Resolve Case'}
              </Button>

              <Box sx={{ display: 'flex', gap: 1.5 }}>
                <Button
                  variant="outlined"
                  startIcon={<AssignmentTurnedInOutlinedIcon />}
                  onClick={() => handleStatusAction('reviewed', 'Mark as Reviewed')}
                  disabled={!!actionLoading || report.status === 'reviewed'}
                  fullWidth
                  sx={{
                    py: 1,
                    borderRadius: 2,
                    textTransform: 'none',
                    fontWeight: 700,
                    borderColor: '#E2E8F0',
                    color: '#475569',
                    '&:hover': { borderColor: '#1A1FE8', color: '#1A1FE8', bgcolor: '#EEF2FF' },
                    '&.Mui-disabled': { opacity: 0.45 },
                  }}
                >
                  {actionLoading === 'reviewed' ? 'Saving…' : 'Review'}
                </Button>

                <Button
                  variant="outlined"
                  startIcon={<CancelOutlinedIcon />}
                  onClick={() => handleStatusAction('dismissed', 'Dismiss this case')}
                  disabled={!!actionLoading || report.status === 'dismissed'}
                  fullWidth
                  sx={{
                    py: 1,
                    borderRadius: 2,
                    textTransform: 'none',
                    fontWeight: 700,
                    borderColor: '#FECACA',
                    color: '#EF4444',
                    '&:hover': { borderColor: '#EF4444', bgcolor: '#FEF2F2' },
                    '&.Mui-disabled': { opacity: 0.45 },
                  }}
                >
                  {actionLoading === 'dismissed' ? 'Saving…' : 'Reject'}
                </Button>
              </Box>
            </Box>
          </Paper>

          {/* 2. Case Details Summary */}
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid #E2E8F0', bgcolor: '#fff', mb: 3 }}>
            <SectionLabel>Case Details</SectionLabel>
            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
              <MetaRow label="Reference" value={`#${report.reference_number}`} />
              <Divider sx={{ borderColor: '#F8FAFC' }} />
              <MetaRow label="Submitted" value={formatDateFull(report.created_at)} />
              <Divider sx={{ borderColor: '#F8FAFC' }} />
              <MetaRow label="Category" value={formatCategory(report.category)} />
              <Divider sx={{ borderColor: '#F8FAFC' }} />
              <MetaRow
                label="Assigned To"
                value={report.assigned_to ?? <Typography component="span" variant="caption" color="#94A3B8" fontStyle="italic">Unassigned</Typography>}
              />
            </Box>
          </Paper>

          {/* 3. Case Timeline */}
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid #E2E8F0', bgcolor: '#fff' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <TimelineOutlinedIcon sx={{ fontSize: 18, color: '#94A3B8' }} />
              <Typography variant="caption" fontWeight={700} color="#94A3B8" textTransform="uppercase" letterSpacing="0.07em">
                Case Timeline
              </Typography>
            </Box>

            {timeline.length === 0 ? (
              <Typography variant="caption" color="#94A3B8">No events yet.</Typography>
            ) : (
              <Box sx={{ position: 'relative', pl: 3, pt: 1 }}>
                {/* Vertical connecting line */}
                <Box
                  sx={{
                    position: 'absolute',
                    left: 9,
                    top: 12,
                    bottom: 12,
                    width: 2,
                    bgcolor: '#E2E8F0',
                    borderRadius: 1,
                  }}
                />
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                  {[...timeline].reverse().map((event) => {
                    const style = TIMELINE_ICONS[event.event_type] ?? DEFAULT_TIMELINE_STYLE;
                    return (
                      <Box key={event.id} sx={{ display: 'flex', gap: 1.5, position: 'relative' }}>
                        {/* Icon dot */}
                        <Box
                          sx={{
                            position: 'absolute',
                            left: -24,
                            top: 1,
                            width: 20,
                            height: 20,
                            borderRadius: '50%',
                            bgcolor: '#fff',
                            border: `2px solid ${style.color}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: style.color,
                            zIndex: 1,
                          }}
                        >
                          {style.icon}
                        </Box>
                        <Box sx={{ pl: 0.5 }}>
                          <Typography variant="caption" color="#0F172A" fontWeight={600} display="block" lineHeight={1.3}>
                            {event.description}
                          </Typography>
                          <Typography variant="caption" color="#94A3B8" fontSize="0.7rem">
                            {formatDateFull(event.created_at)}
                          </Typography>
                        </Box>
                      </Box>
                    );
                  })}
                </Box>
              </Box>
            )}
          </Paper>

        </Grid>
      </Grid>

      {/* ── Confirm action dialog ─────────────────────────────────────────── */}
      <Dialog
        open={confirmDialog.open}
        onClose={() => setConfirmDialog({ open: false, action: null, label: '' })}
        disableScrollLock
        PaperProps={{ sx: { borderRadius: 3, p: 1 } }}
      >
        <DialogTitle sx={{ fontWeight: 800, color: '#0F172A', pb: 0.5 }}>
          Confirm Action
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="#475569">
            Are you sure you want to <strong>{confirmDialog.label}</strong>? This will be logged in the case timeline.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button
            onClick={() => setConfirmDialog({ open: false, action: null, label: '' })}
            sx={{ textTransform: 'none', fontWeight: 600, color: '#64748B' }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            disableElevation
            onClick={confirmAction}
            sx={{ borderRadius: 2, fontWeight: 700, textTransform: 'none', bgcolor: '#0F172A', '&:hover': { bgcolor: '#1E293B' } }}
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
}
