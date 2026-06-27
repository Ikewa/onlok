import { Box, Typography, Button, Paper, Container } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DownloadIcon from '@mui/icons-material/Download';
import PrintIcon from '@mui/icons-material/Print';
import EmailIcon from '@mui/icons-material/Email';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import ListAltIcon from '@mui/icons-material/ListAlt';
import DashboardIcon from '@mui/icons-material/Dashboard';
import { useLocation, Link as RouterLink } from 'react-router-dom';
import Navbar from '../components/Navbar';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useRef } from 'react';

export default function ReportSuccessPage() {
  const location = useLocation();
  const state = location.state as { 
    reference_number: string, 
    reported_vendor_id: string, 
    category: string, 
    date: string,
    complainantName?: string,
  } | undefined;
  const receiptRef = useRef<HTMLDivElement>(null);

  const handleCopyId = () => {
    if (state?.reference_number) {
      navigator.clipboard.writeText(state.reference_number);
      toast.success('Reference ID copied!');
    }
  };

  const handleDownloadPDF = async () => {
    if (!receiptRef.current) return;
    try {
      const canvas = await html2canvas(receiptRef.current, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Complaint_Receipt_${state?.reference_number || 'Unknown'}.pdf`);
      toast.success('PDF Downloaded');
    } catch (err) {
      toast.error('Failed to generate PDF');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (!state) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', bgcolor: '#F8FAFC' }}>
        <Navbar />
        <Container sx={{ mt: 10, textAlign: 'center' }}>
          <Typography variant="h5">No report data found.</Typography>
          <Button component={RouterLink} to="/report" sx={{ mt: 2 }} variant="contained">Back to Report</Button>
        </Container>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', bgcolor: '#F8FAFC' }}>
      <Navbar />
      <Container maxWidth="md" sx={{ pt: 6, pb: 10 }}>
        <Paper elevation={0} sx={{ borderRadius: 4, overflow: 'hidden', border: '1px solid #E2E8F0', bgcolor: '#fff' }}>
          
          {/* Content to be printed/PDF */}
          <Box ref={receiptRef} sx={{ p: { xs: 3, md: 6 }, bgcolor: '#fff' }}>
            <Box sx={{ textAlign: 'center', mb: 5 }}>
              <Box sx={{ width: 64, height: 64, bgcolor: '#E8FAEE', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 3 }}>
                <CheckCircleIcon sx={{ fontSize: 32, color: '#10B981' }} />
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 800, color: '#0F172A', mb: 1.5 }}>Submission Successful</Typography>
              <Typography variant="body1" sx={{ color: '#64748B', maxWidth: 450, mx: 'auto', lineHeight: 1.6 }}>
                Your complaint has been successfully submitted. Please keep your Complaint Reference Number for future tracking.
              </Typography>
            </Box>

            <Box sx={{ bgcolor: '#F8FAFC', borderRadius: 2, p: 3, border: '1px solid #E2E8F0', mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
              <Box>
                <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: 1 }}>Complaint Reference Number</Typography>
                <Typography variant="h5" sx={{ fontWeight: 800, color: '#0F172A', mt: 0.5 }}>{state.reference_number}</Typography>
              </Box>
              <Button onClick={handleCopyId} startIcon={<ContentCopyIcon />} variant="outlined" sx={{ borderRadius: 2, color: '#0F172A', borderColor: '#E2E8F0', textTransform: 'none', fontWeight: 600, bgcolor: '#fff' }}>
                Copy ID
              </Button>
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 4, mb: 5 }}>
              <Box>
                <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: 1, mb: 1, display: 'block' }}>Complainant Name</Typography>
                <Typography variant="body1" sx={{ fontWeight: 600, color: '#0F172A' }}>{state.complainantName || 'Anonymous'}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: 1, mb: 1, display: 'block' }}>Reported Vendor</Typography>
                <Typography variant="body1" sx={{ fontWeight: 600, color: '#0F172A' }}>{state.reported_vendor_id}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: 1, mb: 1, display: 'block' }}>Category</Typography>
                <Typography variant="body1" sx={{ fontWeight: 600, color: '#0F172A', textTransform: 'capitalize' }}>{state.category.replace('_', ' ')}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: 1, mb: 1, display: 'block' }}>Assigned Department</Typography>
                <Typography variant="body1" sx={{ fontWeight: 600, color: '#0F172A' }}>Fraud & Compliance</Typography>
              </Box>
              <Box>
                <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: 1, mb: 1, display: 'block' }}>Submission Date & Time</Typography>
                <Typography variant="body1" sx={{ fontWeight: 600, color: '#0F172A' }}>{state.date}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: 1, mb: 1, display: 'block' }}>Current Status</Typography>
                <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, px: 1.5, py: 0.5, bgcolor: '#DBEAFE', color: '#1D4ED8', borderRadius: 10, mt: 0.5 }}>
                  <Typography variant="caption" sx={{ fontWeight: 700 }}>● PENDING REVIEW</Typography>
                </Box>
              </Box>
            </Box>

            <Box sx={{ bgcolor: '#F1F5F9', borderRadius: 2, p: 3, display: 'flex', gap: 2, alignItems: 'flex-start' }}>
              <AccessTimeIcon sx={{ color: '#64748B', mt: 0.5 }} />
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 600, color: '#0F172A', mb: 0.5 }}>Estimated Review Time</Typography>
                <Typography variant="body2" sx={{ color: '#475569', lineHeight: 1.6 }}>
                  Typically processed within <b>3-5 Business Days</b>. You will receive an email notification once an agent is assigned.
                </Typography>
              </Box>
            </Box>
          </Box>

          {/* Action Buttons */}
          <Box sx={{ px: { xs: 3, md: 6 }, pb: { xs: 3, md: 6 }, display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 2 }}>
            <Button onClick={handleDownloadPDF} variant="contained" startIcon={<DownloadIcon />} sx={{ bgcolor: '#1A1FE8', '&:hover': { bgcolor: '#1318C0' }, py: 1.5, borderRadius: 2, textTransform: 'none', fontWeight: 700 }}>
              Download PDF Receipt
            </Button>
            <Button onClick={handlePrint} variant="outlined" startIcon={<PrintIcon />} sx={{ borderColor: '#E2E8F0', color: '#0F172A', py: 1.5, borderRadius: 2, textTransform: 'none', fontWeight: 700 }}>
              Print Receipt
            </Button>
            <Button variant="outlined" startIcon={<EmailIcon />} sx={{ borderColor: '#E2E8F0', color: '#0F172A', py: 1.5, borderRadius: 2, textTransform: 'none', fontWeight: 700 }}>
              Email Receipt
            </Button>
          </Box>

        </Paper>

        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 4, mt: 4 }}>
          <Button component={RouterLink} to="/dashboard/reports" startIcon={<ListAltIcon />} sx={{ color: '#0F172A', textTransform: 'none', fontWeight: 600 }}>
            Go to My Complaints
          </Button>
          <Button component={RouterLink} to="/dashboard" startIcon={<DashboardIcon />} sx={{ color: '#0F172A', textTransform: 'none', fontWeight: 600 }}>
            Return to Dashboard
          </Button>
        </Box>
      </Container>
    </Box>
  );
}
