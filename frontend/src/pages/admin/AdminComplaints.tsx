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
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutlined';
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
  reviewed:  { bg: '#DCFCE7', color: '#16A34A' },
  dismissed: { bg: '#F3F4F6', color: '#6B7280' },
};

const PRIORITY_STYLES: Record<ReportPriority, { bg: string; color: string }> = {
  high:   { bg: '#FEE2E2', color: '#DC2626' },
  medium: { bg: '#FEF3C7', color: '#D97706' },
  low:    { bg: '#DCFCE7', color: '#16A34A' },
};

const CATEGORY_COLORS: Record<string, string> = {
  fraud:                '#DC2626',
  impersonation:        '#D97706',
  harassment:           '#5B5FEC',
  inaccurate_information: '#2563EB',
  others:               '#6B7280',
};

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function buildTrendData(reports: Report[]) {
  const now = new Date();
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

export default function AdminComplaints() {
  const navigate = useNavigate();

  const [stats, setStats] = useState({
    total: 0, pending: 0, reviewed: 0, dismissed: 0,
    highPriority: 0, pendingHighPriority: 0,
  });
  const [statsLoading, setStatsLoading] = useState(true);

  const [reports, setReports] = useState<Report[]>([]);
  const [total, setTotal] = useState(0);
  const [tableLoading, setTableLoading] = useState(true);

  const [allReports, setAllReports] = useState<Report[]>([]);
  const [chartsLoading, setChartsLoading] = useState(true);

  const [statusFilter, setStatusFilter]     = useState<ReportStatus | ''>('');
  const [priorityFilter, setPriorityFilter] = useState<ReportPriority | ''>('');

  const [page, setPage]               = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

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

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await getAdminReports({ limit: 500, page: 1 });
        setAllReports(res.results);
      } catch {
        toast.error('Failed to load chart data');
      } finally {
        setChartsLoading(false);
      }
    };
    fetch();
  }, []);

  const fetchTable = useCallback(async () => {
    setTableLoading(true);
    try {
      const res = await getAdminReports({
        page: page + 1,
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

  const handleStatusChange = (e: SelectChangeEvent) => {
    setStatusFilter(e.target.value as ReportStatus | '');
    setPage(0);
  };
  const handlePriorityChange = (e: SelectChangeEvent) => {
    setPriorityFilter(e.target.value as ReportPriority | '');
    setPage(0);
  };

  const trendData    = buildTrendData(allReports);
  const categoryData = buildCategoryData(allReports);

  const renderStatusChip = (status: ReportStatus) => {
    const s = STATUS_STYLES[status] ?? { bg: '#F3F4F6', color: '#6B7280' };
    return (
      <Chip
        label={status.charAt(0).toUpperCase() + status.slice(1)}
        size="small"
        sx={{ bgcolor: s.bg, color: s.color, fontWeight: 600, fontSize: '0.75rem', borderRadius: '9999px', px: 0.5 }}
      />
    );
  };

  const renderPriorityChip = (priority: ReportPriority) => {
    const p = PRIORITY_STYLES[priority] ?? { bg: '#F3F4F6', color: '#6B7280' };
    return (
      <Chip
        label={priority.toUpperCase()}
        size="small"
        sx={{ bgcolor: p.bg, color: p.color, fontWeight: 600, fontSize: '0.75rem', borderRadius: '9999px', px: 0.5 }}
      />
    );
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  const formatCategory = (cat: string) =>
    cat.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <Box sx={{ maxWidth: 1200, fontFamily: 'Inter, sans-serif' }}>

      {/* ── Page Header ─────────────────────────────────────────────────────── */}
      <Box mb={3}>
        <Typography variant="h4" fontWeight={700} color="#111827" mb={0.5} sx={{ fontSize: { xs: '1.5rem', md: '1.75rem' }, lineHeight: 1.2 }}>
          Report / Complains
        </Typography>
        <Typography variant="body2" color="#6B7280" sx={{ maxWidth: 520, fontSize: '0.88rem' }}>
          Identify and report behaviours that violate our community standards.
          This report is secure and confidential.
        </Typography>
      </Box>

      {/* ── Overview Cards ──────────────────────────────────────────────────── */}
      <Grid container spacing={2.5} mb={3} sx={{ flexWrap: 'nowrap' }}>
        {[
          {
            title: 'Total Disputes',
            value: statsLoading ? '—' : stats.total,
            icon: <AssignmentOutlinedIcon sx={{ fontSize: 20 }} />,
          },
          {
            title: 'Pending',
            value: statsLoading ? '—' : stats.pending,
            icon: <HourglassEmptyIcon sx={{ fontSize: 20 }} />,
            subLabel: 'Awaiting review',
          },
          {
            title: 'In Review',
            value: statsLoading ? '—' : stats.reviewed,
            icon: <ReportProblemOutlinedIcon sx={{ fontSize: 20 }} />,
            subLabel: stats.pending > 0 ? 'Requires attention' : undefined,
            subLabelColor: stats.pending > 0 ? '#D97706' : undefined,
          },
          {
            title: 'Resolved',
            value: statsLoading ? '—' : stats.dismissed,
            icon: <CheckCircleOutlineIcon sx={{ fontSize: 20 }} />,
          },
          {
            title: 'High Priority',
            value: statsLoading ? '—' : stats.highPriority,
            icon: <WarningAmberIcon sx={{ fontSize: 20 }} />,
            subLabel: stats.highPriority > 0
              ? `${stats.pendingHighPriority} still pending`
              : 'None outstanding',
            variant: 'danger' as const,
          },
        ].map((card) => (
          <Grid
            key={card.title}
            item
            sx={{ flex: '1 1 0', minWidth: 0 }}
          >
            <StatCard {...card} />
          </Grid>
        ))}
      </Grid>

      {/* ── Charts + Categories row ─────────────────────────────────────────── */}
      <Box sx={{ overflow: 'hidden', mb: 3 }}>
        <Grid container spacing={2.5}>
        {/* Monthly Trend Chart */}
        <Grid item xs={12} md={7}>
          <Paper
            elevation={0}
            sx={{ p: 3, borderRadius: '12px', border: '1px solid #E5E7EB', bgcolor: '#FFFFFF', height: '100%' }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5 }}>
              <Box>
                <Typography variant="h6" fontWeight={600} color="#111827" sx={{ fontSize: '1.05rem' }}>
                  Monthly Dispute Trends
                </Typography>
                <Typography variant="caption" color="#6B7280" sx={{ fontSize: '0.78rem' }}>
                  Volume comparison across status over 6 months
                </Typography>
              </Box>
              <Chip
                label="Last 6 Months"
                size="small"
                sx={{ bgcolor: '#F3F4F6', color: '#4B5563', fontWeight: 500, borderRadius: '8px', fontSize: '0.78rem' }}
              />
            </Box>

            {chartsLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                <CircularProgress size={28} sx={{ color: '#5B5FEC' }} />
              </Box>
            ) : (
              <Box sx={{ mt: 3, height: 220 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <RechartsTooltip
                      contentStyle={{ borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 12 }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                    <Line type="monotone" dataKey="pending"   stroke="#D97706" strokeWidth={2} dot={{ r: 3 }} name="Pending" />
                    <Line type="monotone" dataKey="reviewed"  stroke="#5B5FEC" strokeWidth={2} dot={{ r: 3 }} name="Reviewed" />
                    <Line type="monotone" dataKey="dismissed" stroke="#9CA3AF" strokeWidth={2} dot={{ r: 3 }} name="Dismissed" />
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
            sx={{ p: 3, borderRadius: '12px', border: '1px solid #E5E7EB', bgcolor: '#FFFFFF', height: '100%' }}
          >
            <Typography variant="h6" fontWeight={600} color="#111827" mb={2.5} sx={{ fontSize: '1.05rem' }}>
              Complaint Categories
            </Typography>

            {chartsLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                <CircularProgress size={28} sx={{ color: '#5B5FEC' }} />
              </Box>
            ) : categoryData.length === 0 ? (
              <Typography variant="body2" color="#6B7280" textAlign="center" py={4} sx={{ fontSize: '0.88rem' }}>
                No data yet
              </Typography>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {categoryData.map(({ category, pct }) => (
                  <Box key={category}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="body2" color="#374151" fontWeight={500} sx={{ fontSize: '0.85rem' }}>
                        {formatCategory(category)}
                      </Typography>
                      <Typography variant="body2" fontWeight={600} color="#111827" sx={{ fontSize: '0.85rem' }}>
                        {pct}%
                      </Typography>
                    </Box>
                    <Box sx={{ height: 6, borderRadius: 99, bgcolor: '#F3F4F6', overflow: 'hidden' }}>
                      <Box
                        sx={{
                          height: '100%',
                          width: `${pct}%`,
                          borderRadius: 99,
                          bgcolor: CATEGORY_COLORS[category] ?? '#5B5FEC',
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
      </Box>

      {/* ── Active Complaints Table ──────────────────────────────────────────── */}
      <Paper elevation={0} sx={{ borderRadius: '12px', border: '1px solid #E5E7EB', bgcolor: '#FFFFFF', overflow: 'hidden' }}>

        {/* Toolbar: title + filters */}
        <Box
          sx={{
            p: 2.5,
            borderBottom: '1px solid #E5E7EB',
            display: 'flex',
            alignItems: 'center',
            justify: 'space-between',
            flexWrap: 'wrap',
            gap: 2,
          }}
        >
          <Typography variant="h6" fontWeight={600} color="#111827" sx={{ fontSize: '1.05rem' }}>
            Active Complaints
          </Typography>

          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel sx={{ fontSize: '0.85rem' }}>Status</InputLabel>
              <Select
                value={statusFilter}
                label="Status"
                onChange={handleStatusChange}
                sx={{ borderRadius: '8px', fontSize: '0.85rem', bgcolor: '#F3F4F6', '& .MuiOutlinedInput-notchedOutline': { border: 'none' } }}
              >
                <MenuItem value="">All Statuses</MenuItem>
                <MenuItem value="pending">Pending</MenuItem>
                <MenuItem value="reviewed">Reviewed</MenuItem>
                <MenuItem value="dismissed">Dismissed</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel sx={{ fontSize: '0.85rem' }}>Priority</InputLabel>
              <Select
                value={priorityFilter}
                label="Priority"
                onChange={handlePriorityChange}
                sx={{ borderRadius: '8px', fontSize: '0.85rem', bgcolor: '#F3F4F6', '& .MuiOutlinedInput-notchedOutline': { border: 'none' } }}
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
            <TableHead>
              <TableRow sx={{ bgcolor: '#F9FAFB' }}>
                {['Complaint ID', 'Date Received', 'Complainant', 'Reported Vendor', 'Category', 'Priority', 'Status', 'Actions'].map(
                  (col) => (
                    <TableCell
                      key={col}
                      sx={{
                        fontWeight: 500,
                        color: '#6B7280',
                        fontSize: '0.8rem',
                        borderBottom: '1px solid #E5E7EB',
                        py: 1.5,
                        whiteSpace: 'nowrap',
                      }}
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
                  <TableCell colSpan={8} align="center" sx={{ py: 8 }}>
                    <CircularProgress size={28} sx={{ color: '#5B5FEC' }} />
                  </TableCell>
                </TableRow>
              ) : reports.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 6, color: '#6B7280', fontSize: '0.88rem' }}>
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
                        borderBottom: '1px solid #F3F4F6',
                        '&:hover': { bgcolor: '#F9FAFB' },
                      }}
                      onClick={() => navigate(`/admin/complaints/${report.id}`)}
                    >
                      <TableCell sx={{ py: 2 }}>
                        <Typography variant="body2" fontFamily="monospace" fontWeight={600} color="#5B5FEC" fontSize="0.85rem">
                          #{report.reference_number}
                        </Typography>
                      </TableCell>

                      <TableCell sx={{ color: '#4B5563', fontSize: '0.85rem', py: 2, whiteSpace: 'nowrap' }}>
                        {formatDate(report.created_at)}
                      </TableCell>

                      <TableCell sx={{ py: 2 }}>
                        <Typography variant="body2" fontWeight={600} color="#111827" fontSize="0.88rem">
                          {complainantName}
                        </Typography>
                        {report.reporter_vendor_id && (
                          <Typography variant="caption" color="#6B7280" display="block" fontSize="0.78rem">
                            {report.reporter_vendor_id}
                          </Typography>
                        )}
                      </TableCell>

                      <TableCell sx={{ py: 2 }}>
                        <Typography variant="body2" fontWeight={600} color="#111827" fontSize="0.88rem">
                          {report.reported_vendor_id}
                        </Typography>
                      </TableCell>

                      <TableCell sx={{ py: 2 }}>
                        <Chip
                          label={formatCategory(report.category)}
                          size="small"
                          sx={{
                            bgcolor: `${CATEGORY_COLORS[report.category] ?? '#5B5FEC'}18`,
                            color:   CATEGORY_COLORS[report.category] ?? '#5B5FEC',
                            fontWeight: 600,
                            fontSize: '0.75rem',
                            borderRadius: '9999px',
                            px: 0.5,
                          }}
                        />
                      </TableCell>

                      <TableCell sx={{ py: 2 }}>
                        {renderPriorityChip(report.priority)}
                      </TableCell>

                      <TableCell sx={{ py: 2 }}>
                        {renderStatusChip(report.status)}
                      </TableCell>

                      <TableCell sx={{ py: 2 }}>
                        <Tooltip title="View details">
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/admin/complaints/${report.id}`);
                            }}
                            sx={{
                              color: '#9CA3AF',
                              '&:hover': { color: '#5B5FEC', bgcolor: 'rgba(91, 95, 236, 0.08)' },
                            }}
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
          sx={{
            borderTop: '1px solid #E5E7EB',
            color: '#6B7280',
            fontSize: '0.85rem',
            bgcolor: '#F9FAFB',
            '.MuiTablePagination-toolbar': { px: 3 },
          }}
        />
      </Paper>
    </Box>
  );
}
