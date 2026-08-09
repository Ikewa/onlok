import { useState, useEffect } from 'react';
import { Box, Typography, Button } from '@mui/material';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import CodeOutlinedIcon from '@mui/icons-material/CodeOutlined';
import PictureAsPdfOutlinedIcon from '@mui/icons-material/PictureAsPdfOutlined';
import { OnlokBadge, resolveVendorBadgeTier } from '../components/OnlokBadge';
import { useAuth } from '../context/AuthContext';
import { getDashboard } from '../api/dashboard';
import type { DashboardData } from '../types';
import { downloadBadgeAsPNG, downloadBadgeAsSVG, downloadBadgeAsPDF } from '../utils/badgeCardUtils';
import type { BadgeCardOptions } from '../utils/badgeCardUtils';

import toast from 'react-hot-toast';

export default function BadgePage() {
  const { user } = useAuth();
  const [dashData, setDashData] = useState<DashboardData | null>(null);

  useEffect(() => {
    getDashboard()
      .then((res) => setDashData(res))
      .catch(() => {});
  }, []);

  const dashUser = dashData?.user ?? user;
  const badgeTier = resolveVendorBadgeTier({
    badges: dashData?.badges,
    assigned_tier: dashData?.verification?.assigned_tier,
    badge_type: (dashUser as any)?.badge_type,
    status: dashUser?.status,
  });

  const vendorId     = dashUser?.vendor_id     ?? 'OL-NG-0000';
  const businessName = dashUser?.business_name ?? 'Your Business';

  const cardOpts: BadgeCardOptions = {
    vendorId,
    businessName,
    tier: badgeTier,
  };

  const handleDownloadPNG = async () => {
    const toastId = toast.loading('Generating image…');
    try {
      await downloadBadgeAsPNG(cardOpts);
      toast.success('Badge card downloaded as PNG!', { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate PNG.', { id: toastId });
    }
  };

  const handleDownloadSVG = async () => {
    const toastId = toast.loading('Generating SVG…');
    try {
      await downloadBadgeAsSVG(cardOpts);
      toast.success('Badge card downloaded as SVG!', { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate SVG.', { id: toastId });
    }
  };

  const handleDownloadPDF = async () => {
    const toastId = toast.loading('Generating PDF…');
    try {
      await downloadBadgeAsPDF(cardOpts);
      toast.success('Badge card downloaded as PDF!', { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate PDF.', { id: toastId });
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
          <OnlokBadge tier={badgeTier} size={280} tooltip={false} vendorId={vendorId} businessName={businessName} />
        </Box>
      </Box>

      {/* Download Section */}
      <Box sx={{ 
        bgcolor: '#FFFFFF', borderRadius: 3, p: { xs: 3, md: 4 }, 
        border: '1px solid #E2E8F0'
      }}>
        <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: '#0F172A', mb: 1 }}>
          Download Badge
        </Typography>
        <Typography sx={{ color: '#64748B', fontSize: '0.85rem', mb: 3 }}>
          Downloads a full branded social-media card (1080 × 1350 px) with your vendor details.
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Button 
            onClick={handleDownloadPNG}
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
            onClick={handleDownloadSVG}
            variant="outlined" 
            startIcon={<CodeOutlinedIcon />} 
            sx={{ 
              borderColor: '#E2E8F0', color: '#475569', borderRadius: 2, textTransform: 'none', 
              fontWeight: 600, px: 3, py: 1.2, flex: '1 1 200px',
              '&:hover': { bgcolor: '#F8FAFC', borderColor: '#CBD5E1' } 
            }}
          >
            Download SVG
          </Button>
          <Button 
            onClick={handleDownloadPDF}
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
