import { Box, Typography, Button, Divider } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import VerifiedUserOutlinedIcon from '@mui/icons-material/VerifiedUserOutlined';
import BadgeOutlinedIcon from '@mui/icons-material/BadgeOutlined';
import CameraAltOutlinedIcon from '@mui/icons-material/CameraAltOutlined';
import AccessTimeOutlinedIcon from '@mui/icons-material/AccessTimeOutlined';
import ErrorOutlineOutlinedIcon from '@mui/icons-material/ErrorOutlineOutlined';
import { useAuth } from '../context/AuthContext';

export default function VerificationPage() {
  const { user } = useAuth();
  
  return (
    <Box sx={{ p: { xs: 2, md: 5 }, maxWidth: 1100, width: '100%', flexGrow: 1, fontFamily: 'Inter, sans-serif' }}>
      
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography sx={{ fontWeight: 800, fontSize: { xs: '1.5rem', md: '1.8rem' }, color: '#0F172A', mb: 0.5 }}>
          Verification
        </Typography>
        <Typography sx={{ color: '#64748B', fontSize: '0.95rem' }}>
          Your identity and business verification details
        </Typography>
      </Box>

      {/* Verification Banner */}
      {user?.status === 'verified' && (
        <Box sx={{ 
          border: '1px solid #93C5FD', bgcolor: '#F8FAFC', borderRadius: 3, p: 3, 
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 4,
          flexDirection: { xs: 'column', md: 'row' }, gap: 2
        }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
            <Box sx={{ 
              width: 48, height: 48, borderRadius: '50%', bgcolor: '#DCFCE7', 
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
            }}>
              <VerifiedUserOutlinedIcon sx={{ color: '#22C55E' }} />
            </Box>
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <Typography sx={{ fontWeight: 700, fontSize: '1.1rem', color: '#0F172A' }}>
                  Fully Verified
                </Typography>
                <CheckCircleIcon sx={{ color: '#22C55E', fontSize: 20 }} />
              </Box>
              <Typography sx={{ color: '#64748B', fontSize: '0.9rem' }}>
                Your identity and business have been successfully verified.
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: { xs: 'flex-start', md: 'flex-end' } }}>
            <Typography sx={{ color: '#2563EB', fontSize: '0.85rem', fontWeight: 600 }}>Verified: Jan 15, 2026</Typography>
            <Typography sx={{ color: '#2563EB', fontSize: '0.85rem', fontWeight: 600 }}>Expires: Jan 15, 2027</Typography>
          </Box>
        </Box>
      )}

      {user?.status === 'pending' && (
        <Box sx={{ 
          border: '1px solid #FDE047', bgcolor: '#FEFCE8', borderRadius: 3, p: 3, 
          display: 'flex', alignItems: 'flex-start', mb: 4, gap: 2
        }}>
          <Box sx={{ 
            width: 48, height: 48, borderRadius: '50%', bgcolor: '#FEF08A', 
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
          }}>
            <AccessTimeOutlinedIcon sx={{ color: '#CA8A04' }} />
          </Box>
          <Box>
            <Typography sx={{ fontWeight: 700, fontSize: '1.1rem', color: '#854D0E', mb: 0.5 }}>
              Verification Pending Review
            </Typography>
            <Typography sx={{ color: '#A16207', fontSize: '0.9rem', maxWidth: 600 }}>
              Your documents have been submitted and are currently being reviewed by our team. This process typically takes 24-48 hours. The Dashboard will be unlocked once approved.
            </Typography>
          </Box>
        </Box>
      )}

      {user?.status === 'rejected' && (
        <Box sx={{ 
          border: '1px solid #FCA5A5', bgcolor: '#FEF2F2', borderRadius: 3, p: 3, 
          display: 'flex', alignItems: 'flex-start', mb: 4, gap: 2
        }}>
          <Box sx={{ 
            width: 48, height: 48, borderRadius: '50%', bgcolor: '#FECACA', 
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
          }}>
            <ErrorOutlineOutlinedIcon sx={{ color: '#DC2626' }} />
          </Box>
          <Box>
            <Typography sx={{ fontWeight: 700, fontSize: '1.1rem', color: '#991B1B', mb: 0.5 }}>
              Verification Rejected
            </Typography>
            <Typography sx={{ color: '#B91C1C', fontSize: '0.9rem', maxWidth: 600 }}>
              Unfortunately, your verification was not approved. Please check your email for more details or contact support.
            </Typography>
          </Box>
        </Box>
      )}

      {/* Verification Scores - Only show if verified */}
      {user?.status === 'verified' && (
        <Box sx={{ mb: 5 }}>
          <Typography sx={{ fontWeight: 700, fontSize: '1.1rem', color: '#0F172A', mb: 2 }}>
            Verification Scores
          </Typography>
          <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
            {[
              { label: 'Identity Match', score: '98%' },
              { label: 'video recording', score: '96%' },
              { label: 'Business Score', score: '94%' },
            ].map((item, index) => (
              <Box key={index} sx={{ 
                flex: '1 1 200px', border: '1px solid #E2E8F0', borderRadius: 3, p: 2.5, bgcolor: '#F8FAFC' 
              }}>
                <Typography sx={{ color: '#64748B', fontSize: '0.85rem', fontWeight: 500, mb: 1 }}>
                  {item.label}
                </Typography>
                <Typography sx={{ color: '#0F172A', fontSize: '1.8rem', fontWeight: 800 }}>
                  {item.score}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>
      )}

      {/* Two Column Layout for Timeline and Documents */}
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 4 }}>
        
        {/* Left Column: Timeline */}
        <Box sx={{ flex: 1 }}>
          <Typography sx={{ fontWeight: 700, fontSize: '1.1rem', color: '#0F172A', mb: 3 }}>
            Verification Timeline
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0, position: 'relative' }}>
            {/* Connecting line */}
            <Box sx={{ position: 'absolute', left: 15, top: 20, bottom: 20, width: 2, bgcolor: '#DCFCE7', zIndex: 0 }} />
            
            {[
              { title: 'Identity Submitted', date: 'Jan 10, 2026' },
              { title: 'Document Review', date: 'Jan 12, 2026' },
              { title: 'Face Verification', date: 'Jan 13, 2026' },
              { title: 'Business Verification', date: 'Jan 14, 2026' },
              { title: 'Final Approval', date: 'Jan 15, 2026' },
            ].map((step, index) => (
              <Box key={index} sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 3, position: 'relative', zIndex: 1 }}>
                <Box sx={{ 
                  width: 32, height: 32, borderRadius: '50%', bgcolor: '#fff', border: '2px solid #DCFCE7',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <CheckCircleIcon sx={{ color: '#22C55E', fontSize: 18 }} />
                </Box>
                <Box sx={{ pt: 0.5 }}>
                  <Typography sx={{ fontWeight: 600, fontSize: '0.95rem', color: '#0F172A' }}>{step.title}</Typography>
                  <Typography sx={{ color: '#64748B', fontSize: '0.8rem' }}>{step.date}</Typography>
                </Box>
              </Box>
            ))}
          </Box>
        </Box>

        {/* Right Column: Submitted Documents */}
        <Box sx={{ flex: 1.5 }}>
          <Typography sx={{ fontWeight: 700, fontSize: '1.1rem', color: '#0F172A', mb: 3 }}>
            Submitted Documents
          </Typography>
          <Box sx={{ border: '1px solid #E2E8F0', borderRadius: 4, p: { xs: 2, md: 3 }, display: 'flex', flexDirection: 'column', gap: 2 }}>
            
            {[
              { title: 'National ID Card', meta: 'Identity • Uploaded Jan 10, 2026', icon: <BadgeOutlinedIcon sx={{ color: '#64748B' }} /> },
              { title: 'Business Registration Certificate', meta: 'Business • Uploaded Jan 10, 2026', icon: <BadgeOutlinedIcon sx={{ color: '#64748B' }} /> },
              { title: 'video recording', meta: 'Face Match • Uploaded Jan 11, 2026', icon: <CameraAltOutlinedIcon sx={{ color: '#64748B' }} /> },
            ].map((doc, index) => (
              <Box key={index} sx={{ 
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                bgcolor: '#F8FAFC', borderRadius: 3, p: 2, border: '1px solid #E2E8F0'
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{ 
                    width: 40, height: 40, borderRadius: 2, bgcolor: '#fff', border: '1px solid #E2E8F0',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    {doc.icon}
                  </Box>
                  <Box>
                    <Typography sx={{ fontWeight: 600, fontSize: '0.95rem', color: '#0F172A' }}>{doc.title}</Typography>
                    <Typography sx={{ color: '#64748B', fontSize: '0.75rem' }}>{doc.meta}</Typography>
                  </Box>
                </Box>
                <Box sx={{ bgcolor: '#DCFCE7', px: 1.5, py: 0.5, borderRadius: 5 }}>
                  <Typography sx={{ color: '#166534', fontWeight: 700, fontSize: '0.75rem' }}>Verified</Typography>
                </Box>
              </Box>
            ))}

          </Box>
        </Box>

      </Box>
    </Box>
  );
}
