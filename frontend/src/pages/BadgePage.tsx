import { Box, Typography, Button } from '@mui/material';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import CodeOutlinedIcon from '@mui/icons-material/CodeOutlined';
import PictureAsPdfOutlinedIcon from '@mui/icons-material/PictureAsPdfOutlined';
import { OnlokBadge } from '../components/OnlokBadge';
import { useAuth } from '../context/AuthContext';

import domtoimage from 'dom-to-image';
import toast from 'react-hot-toast';

export default function BadgePage() {
  const { user } = useAuth();
  
  // Assuming tier comes from user data, fallback to gold
  const badgeTier = (user as any)?.badge_type ?? 'gold';
  const vendorId = user?.vendor_id ?? 'OL-NG-0000';

  const downloadPNG = async () => {
    const node = document.getElementById('badge-preview');
    if (!node) return;
    try {
      const dataUrl = await domtoimage.toPng(node, { quality: 1, bgcolor: 'transparent' });
      const link = document.createElement('a');
      link.download = `onlok-badge-${vendorId}.png`;
      link.href = dataUrl;
      link.click();
      toast.success('Badge downloaded as PNG!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate PNG.');
    }
  };

  const downloadSVG = async () => {
    const node = document.getElementById('badge-preview');
    if (!node) return;
    try {
      const dataUrl = await domtoimage.toSvg(node, { quality: 1, bgcolor: 'transparent' });
      const link = document.createElement('a');
      link.download = `onlok-badge-${vendorId}.svg`;
      link.href = dataUrl;
      link.click();
      toast.success('Badge downloaded as SVG!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate SVG.');
    }
  };

  const downloadPDF = async () => {
    const node = document.getElementById('badge-preview');
    if (!node) return;
    try {
      toast.loading('Generating PDF...', { id: 'pdf-toast' });
      const dataUrl = await domtoimage.toPng(node, { quality: 1, bgcolor: 'transparent' });
      
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: [300, 300]
      });
      
      doc.addImage(dataUrl, 'PNG', 10, 10, 280, 280);
      doc.save(`onlok-badge-${vendorId}.pdf`);
      
      toast.success('Badge downloaded as PDF!', { id: 'pdf-toast' });
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate PDF.', { id: 'pdf-toast' });
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 5 }, maxWidth: 1100, width: '100%', flexGrow: 1, fontFamily: 'Inter, sans-serif' }}>
      
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography sx={{ fontWeight: 800, fontSize: { xs: '1.5rem', md: '1.8rem' }, color: '#0F172A', mb: 0.5 }}>
          My Badge
        </Typography>
        <Typography sx={{ color: '#64748B', fontSize: '0.95rem' }}>
          Display your ONLOK verification badge on your website or social media
        </Typography>
      </Box>

      {/* Badge Preview Box */}
      <Box sx={{ 
        bgcolor: '#FFFFFF', borderRadius: 3, p: { xs: 3, md: 5 }, mb: 4, 
        border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column'
      }}>
        <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: '#0F172A', mb: 4 }}>
          Badge Preview
        </Typography>
        <Box id="badge-preview" sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <OnlokBadge tier={badgeTier} size={280} tooltip={false} vendorId={vendorId} />
        </Box>
      </Box>

      {/* Download Section */}
      <Box sx={{ 
        bgcolor: '#FFFFFF', borderRadius: 3, p: { xs: 3, md: 4 }, 
        border: '1px solid #E2E8F0'
      }}>
        <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: '#0F172A', mb: 3 }}>
          Download Badge
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Button 
            onClick={downloadPNG}
            variant="contained" 
            startIcon={<ImageOutlinedIcon />} 
            sx={{ 
              bgcolor: '#3B82F6', color: '#fff', borderRadius: 2, textTransform: 'none', 
              fontWeight: 600, px: 3, py: 1.2, boxShadow: 'none', flex: '1 1 200px',
              '&:hover': { bgcolor: '#2563EB' } 
            }}
          >
            Download PNG
          </Button>
          <Button 
            onClick={downloadSVG}
            variant="outlined" 
            startIcon={<FileDownloadOutlinedIcon />} 
            sx={{ 
              borderColor: '#E2E8F0', color: '#475569', borderRadius: 2, textTransform: 'none', 
              fontWeight: 600, px: 3, py: 1.2, flex: '1 1 200px',
              '&:hover': { bgcolor: '#F8FAFC', borderColor: '#CBD5E1' } 
            }}
          >
            Download SVG
          </Button>
          <Button 
            onClick={downloadPDF}
            variant="outlined" 
            startIcon={<PictureAsPdfOutlinedIcon />} 
            sx={{ 
              borderColor: '#E2E8F0', color: '#475569', borderRadius: 2, textTransform: 'none', 
              fontWeight: 600, px: 3, py: 1.2, flex: '1 1 200px',
              '&:hover': { bgcolor: '#F8FAFC', borderColor: '#CBD5E1' } 
            }}
          >
            Download PDF
          </Button>
        </Box>
      </Box>

    </Box>
  );
}
