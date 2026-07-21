import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Grid, Paper, Chip, CircularProgress,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TablePagination, IconButton, Tooltip, Select, MenuItem,
  FormControl, InputLabel, type SelectChangeEvent,
} from '@mui/material';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import ReportProblemOutlinedIcon from '@mui/icons-material/ReportProblemOutlined';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

import StatCard from '../../components/admin/StatCard';
import {
  getAdminReports,
  getAdminReportStats,
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

const CATEGORY_COLORS: Record<string, string> = {
  fraud:                '#EF4444',
  impersonation:        '#F97316',
  harassment:           '#8B5CF6',
  inaccurate_information: '#3B82F6',
  others:               '#64748B',
};

// ── Month grouping helpers ────────────────────────────────────────────────────

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function buildTrendData(reports: Report[]) {
  const now = new Date();
  // Build the last 6 calendar months (including current)
  const months: { year: number; month: number; label: string }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ year: d.getFullYear(), month: d.getMonth(), label: MONTH_LABELS[d.getMonth()] });
  }

  return months.map(({ year, month, label }) => {
    const inMonth = reports.filter((r) => {
      const d = new Date(r.created_at);
      return d.getFullYear() === year && d.getMonth() === month;
    });
    return {
      month: label,
      pending:   inMonth.filter((r) => r.status === 'pending').length,
      reviewed:  inMonth.filter((r) => r.status === 'reviewed').length,
      dismissed: inMonth.filter((r) => r.status === 'dismissed').length,
    };
  });
}

function buildCategoryData(reports: Report[]) {
  const counts: Record<string, number> = {};
  reports.forEach((r) => {
    counts[r.category] = (counts[r.category] || 0) + 1;
  });
  const total = reports.length || 1;
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([category, count]) => ({
      category,
      count,
      pct: Math.round((count / total) * 100),
    }));
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function AdminComplaints() {
  const navigate = useNavigate();

  // Stats (overview cards)
  const [stats, setStats] = useState({
    total: 0, pending: 0, reviewed: 0, dismissed: 0,
    highPriority: 0, pendingHighPriority: 0,
  });
  const [statsLoading, setStatsLoading] = useState(true);

  // Table data
  const [reports, setReports] = useState<Report[]>([]);
  const [total, setTotal] = useState(0);
  const [tableLoading, setTableLoading] = useState(true);

  // Chart & category data (derived from an unfiltered fetch)
  const [allReports, setAllReports] = useState<Report[]>([]);
  const [chartsLoading, setChartsLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter]     = useState<ReportStatus | ''>('');
  const [priorityFilter, setPriorityFilter] = useState<ReportPriority | ''>('');

  // Pagination
  const [page, setPage]               = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // ── Fetch stats once ────────────────────────────────────────────────────────
  useEffect(() => {
    const fetch = async () => {
      try {
        const data = await getAdminReportStats();
        setStats(data);
      } catch {
        toast.error('Failed to load report statistics');
      } finally {
        setStatsLoading(false);
      }
    };
    fetch();
  }, []);

  // ── Fetch all reports (for chart + category breakdown) once ─────────────────
  useEffect(() => {
    const fetch = async () => {
      try {
        // Use a high limit to get enough data for chart grouping;
        // for production at very high volumes this should be a dedicated endpoint.
        const res = await getAdminReports({ limit: 500, page: 1 });
        setAllReports(res.results);
      } catch {
        // Non-critical — charts just won't render
        toast.error('Failed to load chart data');
      } finally {
        setChartsLoading(false);
      }
    };
    fetch();
  }, []);

  // ── Fetch paginated/filtered table data ─────────────────────────────────────
  const fetchTable = useCallback(async () => {
    setTableLoading(true);
    try {
      const res = await getAdminReports({
        page: page + 1, // API is 1-based
        limit: rowsPerPage,
        ...(statusFilter   ? { status: statusFilter }     : {}),
        ...(priorityFilter ? { priority: priorityFilter } : {}),
      });
      setReports(res.results);
      setTotal(res.total);
    } catch {
      toast.error('Failed to load complaints');
    } finally {
      setTableLoading(false);
    }
  }, [page, rowsPerPage, statusFilter, priorityFilter]);

  useEffect(() => {
    fetchTable();
  }, [fetchTable]);

  // Reset to page 0 when filters change
  const handleStatusChange = (e: SelectChangeEvent) => {
    setStatusFilter(e.target.value as ReportStatus | '');
    setPage(0);
  };
  const handlePriorityChange = (e: SelectChangeEvent) => {
    setPriorityFilter(e.target.value as ReportPriority | '');
    setPage(0);
  };

  // ── Derived data ─────────────────────────────────────────────────────────────
  const trendData    = buildTrendData(allReports);
  const categoryData = buildCategoryData(allReports);

  // ── Render helpers ───────────────────────────────────────────────────────────
  const renderStatusChip = (status: ReportStatus) => {
    const s = STATUS_STYLES[status] ?? { bg: '#F1F5F9', color: '#475569' };
    return (
      <Chip
        label={status.charAt(0).toUpperCase() + status.slice(1)}
        size="small"
        sx={{ bgcolor: s.bg, color: s.color, fontWeight: 700, fontSize: '0.72rem', borderRadius: '12px' }}
      />
    );
  };

  const renderPriorityChip = (priority: ReportPriority) => {
    const p = PRIORITY_STYLES[priority] ?? { bg: '#F1F5F9', color: '#475569' };
    return (
      <Chip
        label={priority.toUpperCase()}
        size="small"
        sx={{ bgcolor: p.bg, color: p.color, fontWeight: 700, fontSize: '0.72rem', borderRadius: '12px' }}
      />
    );
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  const formatCategory = (cat: string) =>
    cat.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  // ── Main render ──────────────────────────────────────────────────────────────
  return (
    <Box sx={{ maxWidth: 1200 }}>
      {/* ── Page Header ─────────────────────────────────────────────────────── */}
      <Typography variant="h4" fontWeight={800} color="#0F172A" mb={0.5}>
        Report / Complains
      </Typography>
      <Typography variant="body2" color="#64748B" mb={4}>
        Identify and report behaviours that violate our community standards.
        This report is secure and confidential.
      </Typography>

      {/* ── Overview Cards ──────────────────────────────────────────────────── */}
      <Grid container spacing={2.5} mb={4}>
        <Grid item xs={12} sm={6} md={12 / 5}>
          <StatCard
            title="Total Disputes"
            value={statsLoading ? '—' : stats.total}
            icon={<AssignmentOutlinedIcon sx={{ fontSize: 24 }} />}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={12 / 5}>
          <StatCard
            title="Pending"
            value={statsLoading ? '—' : stats.pending}
            icon={<HourglassEmptyIcon sx={{ fontSize: 24 }} />}
            subLabel="Awaiting review"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={12 / 5}>
          <StatCard
            title="In Review"
            value={statsLoading ? '—' : stats.reviewed}
            icon={<ReportProblemOutlinedIcon sx={{ fontSize: 24 }} />}
            subLabel={stats.pending > 0 ? 'Requires attention' : undefined}
            subLabelColor={stats.pending > 0 ? '#F59E0B' : undefined}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={12 / 5}>
          <StatCard
            title="Resolved"
            value={statsLoading ? '—' : stats.dismissed}
            icon={<CheckCircleOutlineIcon sx={{ fontSize: 24 }} />}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={12 / 5}>
          <StatCard
            title="High Priority"
            value={statsLoading ? '—' : stats.highPriority}
            icon={<WarningAmberIcon sx={{ fontSize: 24 }} />}
            subLabel={stats.highPriority > 0 ? `${stats.pendingHighPriority} still pending` : 'None outstanding'}
            variant="danger"
          />
        </Grid>
      </Grid>

      {/* ── Charts + Categories row ─────────────────────────────────────────── */}
      <Grid container spacing={2.5} mb={4}>
        {/* Monthly Trend Chart */}
        <Grid item xs={12} md={7}>
          <Paper
            elevation={0}
            sx={{ p: 3, borderRadius: 3, border: '1px solid #E2E8F0', bgcolor: '#fff', height: '100%' }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5 }}>
              <Box>
                <Typography variant="h6" fontWeight={700} color="#0F172A">
                  Monthly Dispute Trends
                </Typography>
                <Typography variant="caption" color="#64748B">
                  Volume comparison across status over 6 months
                </Typography>
              </Box>
              <Chip
                label="Last 6 Months"
                size="small"
                sx={{ bgcolor: '#F1F5F9', color: '#475569', fontWeight: 600, borderRadius: '8px' }}
              />
            </Box>

            {chartsLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                <CircularProgress size={28} sx={{ color: '#1A1FE8' }} />
              </Box>
            ) : (
              <Box sx={{ mt: 3, height: 220 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 12, fill: '#94A3B8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <RechartsTooltip
                      contentStyle={{ borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 12 }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                    <Line type="monotone" dataKey="pending"   stroke="#F59E0B" strokeWidth={2} dot={{ r: 3 }} name="Pending" />
                    <Line type="monotone" dataKey="reviewed"  stroke="#1A1FE8" strokeWidth={2} dot={{ r: 3 }} name="Reviewed" />
                    <Line type="monotone" dataKey="dismissed" stroke="#94A3B8" strokeWidth={2} dot={{ r: 3 }} name="Dismissed" />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Complaint Categories */}
        <Grid item xs={12} md={5}>
          <Paper
            elevation={0}
            sx={{ p: 3, borderRadius: 3, border: '1px solid #E2E8F0', bgcolor: '#fff', height: '100%' }}
          >
            <Typography variant="h6" fontWeight={700} color="#0F172A" mb={2.5}>
              Complaint Categories
            </Typography>

            {chartsLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                <CircularProgress size={28} sx={{ color: '#1A1FE8' }} />
              </Box>
            ) : categoryData.length === 0 ? (
              <Typography variant="body2" color="#94A3B8" textAlign="center" py={4}>
                No data yet
              </Typography>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {categoryData.map(({ category, pct }) => (
                  <Box key={category}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="body2" color="#334155" fontWeight={500}>
                        {formatCategory(category)}
                      </Typography>
                      <Typography variant="body2" fontWeight={700} color="#0F172A">
                        {pct}%
                      </Typography>
                    </Box>
                    <Box sx={{ height: 6, borderRadius: 3, bgcolor: '#F1F5F9', overflow: 'hidden' }}>
                      <Box
                        sx={{
                          height: '100%',
                          width: `${pct}%`,
                          borderRadius: 3,
                          bgcolor: CATEGORY_COLORS[category] ?? '#1A1FE8',
                          transition: 'width 0.6s ease',
                        }}
                      />
                    </Box>
                  </Box>
                ))}
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* ── Active Complaints Table ──────────────────────────────────────────── */}
      <Paper elevation={0} sx={{ borderRadius: 3, border: '1px solid #E2E8F0', bgcolor: '#fff', overflow: 'hidden' }}>
        {/* Table header + filters */}
        <Box
          sx={{
            p: 3,
            borderBottom: '1px solid #F1F5F9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 2,
          }}
        >
          <Typography variant="h6" fontWeight={700} color="#0F172A">
            Active Complaints
          </Typography>

          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
            {/* Status filter */}
            <FormControl size="small" sx={{ minWidth: 130 }}>
              <InputLabel sx={{ fontSize: '0.85rem' }}>Status</InputLabel>
              <Select
                value={statusFilter}
                label="Status"
                onChange={handleStatusChange}
                sx={{ borderRadius: 2, fontSize: '0.85rem' }}
              >
                <MenuItem value="">All Statuses</MenuItem>
                <MenuItem value="pending">Pending</MenuItem>
                <MenuItem value="reviewed">Reviewed</MenuItem>
                <MenuItem value="dismissed">Dismissed</MenuItem>
              </Select>
            </FormControl>

            {/* Priority filter */}
            <FormControl size="small" sx={{ minWidth: 130 }}>
              <InputLabel sx={{ fontSize: '0.85rem' }}>Priority</InputLabel>
              <Select
                value={priorityFilter}
                label="Priority"
                onChange={handlePriorityChange}
                sx={{ borderRadius: 2, fontSize: '0.85rem' }}
              >
                <MenuItem value="">All Priorities</MenuItem>
                <MenuItem value="high">High</MenuItem>
                <MenuItem value="medium">Medium</MenuItem>
                <MenuItem value="low">Low</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </Box>

        {/* Table */}
        <TableContainer>
          <Table sx={{ minWidth: 800 }}>
            <TableHead sx={{ bgcolor: '#F8FAFC' }}>
              <TableRow>
                {['Complaint ID', 'Date Received', 'Complainant', 'Reported Vendor', 'Category', 'Priority', 'Status', 'Actions'].map(
                  (col) => (
                    <TableCell
                      key={col}
                      sx={{ fontWeight: 700, color: '#475569', fontSize: '0.78rem', textTransform: 'uppercase',
                            letterSpacing: '0.04em', borderBottom: '1px solid #E2E8F0', py: 1.5 }}
                    >
                      {col}
                    </TableCell>
                  )
                )}
              </TableRow>
            </TableHead>

            <TableBody>
              {tableLoading ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                    <CircularProgress size={28} sx={{ color: '#1A1FE8' }} />
                  </TableCell>
                </TableRow>
              ) : reports.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 6, color: '#94A3B8' }}>
                    No complaints found for the selected filters.
                  </TableCell>
                </TableRow>
              ) : (
                reports.map((report) => {
                  const complainantName = report.first_name
                    ? `${report.first_name} ${report.last_name ?? ''}`.trim()
                    : report.contact_email ?? 'Anonymous';

                  return (
                    <TableRow
                      key={report.id}
                      hover
                      sx={{
                        cursor: 'pointer',
                        '&:last-child td': { border: 0 },
                        '&:hover': { bgcolor: '#F8FAFC' },
                      }}
                      onClick={() => navigate(`/admin/complaints/${report.id}`)}
                    >
                      <TableCell sx={{ borderBottom: '1px solid #F1F5F9' }}>
                        <Typography variant="body2" fontFamily="monospace" fontWeight={600} color="#0F172A">
                          #{report.reference_number}
                        </Typography>
                      </TableCell>

                      <TableCell sx={{ borderBottom: '1px solid #F1F5F9', color: '#475569', fontSize: '0.875rem' }}>
                        {formatDate(report.created_at)}
                      </TableCell>

                      <TableCell sx={{ borderBottom: '1px solid #F1F5F9' }}>
                        <Typography variant="body2" fontWeight={600} color="#0F172A">
                          {complainantName}
                        </Typography>
                        {report.reporter_vendor_id && (
                          <Typography variant="caption" color="#64748B" display="block">
                            {report.reporter_vendor_id}
                          </Typography>
                        )}
                      </TableCell>

                      <TableCell sx={{ borderBottom: '1px solid #F1F5F9' }}>
                        <Typography variant="body2" fontWeight={600} color="#0F172A">
                          {report.reported_vendor_id}
                        </Typography>
                      </TableCell>

                      <TableCell sx={{ borderBottom: '1px solid #F1F5F9' }}>
                        <Chip
                          label={formatCategory(report.category)}
                          size="small"
                          sx={{
                            bgcolor: `${CATEGORY_COLORS[report.category] ?? '#1A1FE8'}18`,
                            color:   CATEGORY_COLORS[report.category] ?? '#1A1FE8',
                            fontWeight: 600,
                            fontSize: '0.72rem',
                            borderRadius: '8px',
                          }}
                        />
                      </TableCell>

                      <TableCell sx={{ borderBottom: '1px solid #F1F5F9' }}>
                        {renderPriorityChip(report.priority)}
                      </TableCell>

                      <TableCell sx={{ borderBottom: '1px solid #F1F5F9' }}>
                        {renderStatusChip(report.status)}
                      </TableCell>

                      <TableCell sx={{ borderBottom: '1px solid #F1F5F9' }}>
                        <Tooltip title="View details">
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation(); // prevent double-navigate from row click
                              navigate(`/admin/complaints/${report.id}`);
                            }}
                            sx={{ color: '#94A3B8', '&:hover': { color: '#1A1FE8' } }}
                          >
                            <VisibilityOutlinedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          rowsPerPageOptions={[10, 20, 50]}
          component="div"
          count={total}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          sx={{ borderTop: '1px solid #F1F5F9', color: '#64748B', fontSize: '0.85rem' }}
        />
      </Paper>
    </Box>
  );
}
