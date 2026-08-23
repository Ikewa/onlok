import { useEffect, useState } from 'react';
import { Box, Typography, Button, Container, Paper, CircularProgress } from '@mui/material';
import VerifiedIcon from '@mui/icons-material/Verified';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutlined';
import DownloadIcon from '@mui/icons-material/Download';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { verifyPayment as verifyPaymentApi } from '../api/payment';

export default function PaymentSuccessPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, refreshUser } = useAuth();
  const [verifying, setVerifying] = useState(true);
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    const reference = searchParams.get('reference');
    if (!reference) {
      setVerifying(false);
      return;
    }

    const verifyPayment = async () => {
      try {
        await verifyPaymentApi(reference);
        if (typeof refreshUser === 'function') {
          await refreshUser();
        }
        setVerified(true);
      } catch (error) {
        console.error('Error verifying payment:', error);
        toast.error('Could not verify payment automatically. Please contact support.');
      } finally {
        setVerifying(false);
      }
    };

    verifyPayment();
  }, [searchParams, refreshUser]);

  const handleDownloadReceipt = async () => {
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF();
      
      // Header
      doc.setFontSize(24);
      doc.setTextColor('#1A1FE8');
      doc.text('ONLOK', 20, 25);
      
      doc.setFontSize(10);
      doc.setTextColor('#64748B');
      doc.text('receipt@onlok.net | www.onlok.net', 20, 32);
      
      // Title
      doc.setFontSize(18);
      doc.setTextColor('#0F172A');
      doc.text('Payment Receipt', 20, 50);
      
      // Details
      doc.setFontSize(11);
      doc.text(`Date: ${new Date().toLocaleDateString()}`, 20, 65);
      doc.text(`Transaction ID: TXN-${Math.random().toString(36).substr(2, 9).toUpperCase()}`, 20, 72);
      doc.text(`Billed To: ${user?.first_name || 'Customer'} ${user?.last_name || ''}`, 20, 79);
      
      // Line separator
      doc.setDrawColor(226, 232, 240);
      doc.line(20, 85, 190, 85);
      
      // Table Header
      doc.setFontSize(10);
      doc.setTextColor('#64748B');
      doc.text('DESCRIPTION', 20, 95);
      doc.text('AMOUNT', 170, 95);
      
      // Table Content
      doc.setFontSize(12);
      doc.setTextColor('#0F172A');
      doc.text('Onlok Vendor Verification Subscription', 20, 105);
      doc.text('Paid', 170, 105);
      
      // Line separator
      doc.setDrawColor(226, 232, 240);
      doc.line(20, 115, 190, 115);
      
      // Footer
      doc.setFontSize(10);
      doc.setTextColor('#64748B');
      doc.text('Thank you for your business.', 20, 130);

      doc.save('Onlok-Payment-Receipt.pdf');
      toast.success('Receipt downloaded successfully!');
    } catch (error) {
      console.error(error);
      toast.error('Failed to generate receipt PDF');
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#fff', display: 'flex', flexDirection: 'column' }}>
      <Navbar />

      <Container maxWidth="sm" sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', py: 8 }}>
        <Paper
          elevation={0}
          sx={{
            bgcolor: '#F0F4FF',
            borderRadius: 4,
            p: { xs: 4, md: 6 },
            textAlign: 'center',
            width: '100%',
            border: '1px solid #E2E8F0',
            boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05)'
          }}
        >
          <Box sx={{ mb: 3 }}>
            <VerifiedIcon sx={{ fontSize: 80, color: '#84CC16' }} />
          </Box>
          
          <Typography sx={{ fontWeight: 900, fontSize: { xs: '1.8rem', md: '2.2rem' }, color: '#000', mb: 1.5 }}>
            {verifying ? 'Verifying Payment...' : 'Payment Successful'}
          </Typography>
          
          <Typography sx={{ color: '#475569', fontSize: '0.95rem', fontWeight: 500, lineHeight: 1.6, mb: 5, maxWidth: 400, mx: 'auto' }}>
            {verifying 
              ? 'Please wait while we confirm your transaction...' 
              : 'Your Transaction Was Completed Successfully. Thank You For Your Purchase.'}
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Button 
              variant="contained" 
              onClick={() => navigate('/dashboard')}
              sx={{ 
                bgcolor: '#1A1FE8', 
                color: '#fff', 
                borderRadius: 2, 
                py: 1.5, 
                fontWeight: 700, 
                fontSize: '1rem',
                textTransform: 'none',
                boxShadow: 'none',
                '&:hover': { bgcolor: '#1318C0' }
              }}
            >
              Back To Dashboard
            </Button>
            
            <Button 
              variant="outlined" 
              onClick={handleDownloadReceipt}
              startIcon={<DownloadIcon />}
              sx={{ 
                borderColor: '#CBD5E1', 
                color: '#475569', 
                borderRadius: 2, 
                py: 1.5, 
                fontWeight: 600, 
                fontSize: '1rem',
                textTransform: 'none',
                bgcolor: '#fff',
                '&:hover': { bgcolor: '#F8FAFC' }
              }}
            >
              Download Receipt
            </Button>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}

