import { useState, useEffect } from 'react';
import { Box, Typography, Paper, Divider, CircularProgress, Chip, Grid, Button, Avatar, Dialog, DialogTitle, DialogContent, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DescriptionIcon from '@mui/icons-material/Description';

import { getAdminReports } from '../../api/admin';
import toast from 'react-hot-toast';

export default function AdminComplaints() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<any | null>(null);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const data = await getAdminReports();
        setReports(data);
      } catch (err) {
        toast.error('Failed to load reports');
      } finally {
        setLoading(false);
      }
    };
    fetchReports();
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
        <CircularProgress sx={{ color: '#1A1FE8' }} />
      </Box>
    );
  }

  const handleOpenDetails = (report: any) => {
    setSelectedReport(report);
  };

  const handleCloseDetails = () => {
    setSelectedReport(null);
  };

  return (
    <Box sx={{ maxWidth: 1200 }}>
      <Typography variant="h4" fontWeight={800} color="#0F172A" mb={0.5}>
        Complaints & Reports
      </Typography>
      <Typography variant="body1" color="#64748B" mb={4}>
        Review and manage user reports and dispute cases.
      </Typography>

      <Grid container spacing={4}>
        {/* Reports List */}
        <Grid item xs={12} md={selectedReport ? 5 : 12} sx={{ transition: 'all 0.3s' }}>
          <Paper elevation={0} sx={{ borderRadius: 3, border: '1px solid #E2E8F0', bgcolor: '#fff', mb: 4, overflow: 'hidden' }}>
            <Box sx={{ p: 3, borderBottom: '1px solid #F1F5F9' }}>
              <Typography variant="h6" fontWeight={700} color="#0F172A">
                Recent Reports
              </Typography>
            </Box>
            
            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
              {reports.length === 0 && (
                <Typography variant="body2" color="#64748B" textAlign="center" py={4}>No reports found</Typography>
              )}
              {reports.map((report, idx) => (
                <Box key={report.id}>
                  <Box 
                    sx={{ 
                      p: 3, 
                      cursor: 'pointer',
                      bgcolor: selectedReport?.id === report.id ? '#F8FAFC' : '#fff',
                      '&:hover': { bgcolor: '#F8FAFC' }
                    }}
                    onClick={() => handleOpenDetails(report)}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2" fontWeight={700} color="#0F172A">
                        {report.reference_number || `Report #${report.id}`}
                      </Typography>
                      <Chip 
                        label={report.status.toUpperCase()} 
                        size="small"
                        sx={{ 
                          bgcolor: report.status === 'pending' ? '#FEF3C7' : '#DCFCE7', 
                          color: report.status === 'pending' ? '#D97706' : '#16A34A', 
                          fontWeight: 700,
                          fontSize: '0.7rem',
                          borderRadius: 1
                        }} 
                      />
                    </Box>
                    <Typography variant="body2" color="#64748B" mb={1}>
                      Vendor: <Typography component="span" fontWeight={600} color="#0F172A">{report.reported_vendor_id}</Typography>
                    </Typography>
                    <Typography variant="caption" color="#94A3B8">
                      {new Date(report.created_at).toLocaleString()}
                    </Typography>
                  </Box>
                  {idx < reports.length - 1 && <Divider sx={{ borderColor: '#F1F5F9' }} />}
                </Box>
              ))}
            </Box>
          </Paper>
        </Grid>

        {/* Report Details Panel */}
        {selectedReport && (
          <Grid item xs={12} md={7}>
            <Paper elevation={0} sx={{ borderRadius: 3, border: '1px solid #E2E8F0', bgcolor: '#fff', position: 'relative' }}>
              <IconButton onClick={handleCloseDetails} sx={{ position: 'absolute', top: 12, right: 12 }}>
                <CloseIcon />
              </IconButton>
              
              <Box sx={{ p: 4 }}>
                <Typography variant="h5" fontWeight={800} color="#0F172A" mb={1}>
                  Complaint Details
                </Typography>
                <Typography variant="body2" color="#64748B" mb={4}>
                  Reference: {selectedReport.reference_number} • Submitted on {new Date(selectedReport.created_at).toLocaleString()}
                </Typography>

                <Grid container spacing={3} sx={{ mb: 4 }}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" fontWeight={700} color="#64748B" textTransform="uppercase">Complainant (Reporter)</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 1 }}>
                      <Avatar sx={{ width: 36, height: 36, bgcolor: '#1A1FE8' }}>{selectedReport.first_name ? selectedReport.first_name[0] : 'A'}</Avatar>
                      <Box>
                        <Typography variant="body2" fontWeight={700} color="#0F172A">{selectedReport.first_name ? `${selectedReport.first_name} ${selectedReport.last_name}` : 'Anonymous'}</Typography>
                        <Typography variant="caption" color="#64748B" display="block">{selectedReport.contact_email || 'No email provided'}</Typography>
                        {selectedReport.phone_number && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.3 }}>
                            <Typography variant="caption" color="#64748B">{selectedReport.phone_number}</Typography>
                            {selectedReport.is_whatsapp ? (
                              <Chip size="small" label="WhatsApp" sx={{ height: 16, fontSize: '0.6rem', bgcolor: '#DCFCE7', color: '#16A34A', fontWeight: 700 }} />
                            ) : null}
                          </Box>
                        )}
                      </Box>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" fontWeight={700} color="#64748B" textTransform="uppercase">Reported Vendor</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 1 }}>
                      <Avatar sx={{ width: 36, height: 36, bgcolor: '#EF4444' }}>V</Avatar>
                      <Box>
                        <Typography variant="body2" fontWeight={700} color="#0F172A">{selectedReport.reported_vendor_id}</Typography>
                        <Typography variant="caption" color="#64748B">Category: {selectedReport.category}</Typography>
                      </Box>
                    </Box>
                  </Grid>
                </Grid>

                <Divider sx={{ my: 3, borderColor: '#F1F5F9' }} />

                <Typography variant="caption" fontWeight={700} color="#64748B" textTransform="uppercase" display="block" mb={1}>
                  Detailed Description
                </Typography>
                <Paper elevation={0} sx={{ p: 2.5, bgcolor: '#F8FAFC', borderRadius: 2, border: '1px solid #E2E8F0', mb: 4 }}>
                  <Typography variant="body2" color="#334155" sx={{ whiteSpace: 'pre-wrap' }}>
                    {selectedReport.context}
                  </Typography>
                </Paper>

                {selectedReport.evidence_files && selectedReport.evidence_files.length > 0 && (
                  <Box sx={{ mb: 4 }}>
                    <Typography variant="caption" fontWeight={700} color="#64748B" textTransform="uppercase" display="block" mb={1.5}>
                      Evidence Files
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                      {selectedReport.evidence_files.map((file: string, i: number) => (
                        <Button 
                          key={i} 
                          variant="outlined" 
                          startIcon={<DescriptionIcon />} 
                          href={file} 
                          target="_blank"
                          sx={{ textTransform: 'none', borderRadius: 2, color: '#0F172A', borderColor: '#E2E8F0' }}
                        >
                          View Attachment {i + 1}
                        </Button>
                      ))}
                    </Box>
                  </Box>
                )}

                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Button variant="contained" color="success" sx={{ flex: 1, borderRadius: 2, fontWeight: 700 }}>
                    Mark as Reviewed
                  </Button>
                  <Button variant="outlined" color="error" sx={{ flex: 1, borderRadius: 2, fontWeight: 700 }}>
                    Dismiss Report
                  </Button>
                </Box>
              </Box>
            </Paper>
          </Grid>
        )}
      </Grid>
    </Box>
  );
}
