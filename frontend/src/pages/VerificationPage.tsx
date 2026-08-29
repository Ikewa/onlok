import { useEffect, useState } from 'react';
import { Box, Typography, CircularProgress, Button, Stack, LinearProgress } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import VerifiedUserOutlinedIcon from '@mui/icons-material/VerifiedUserOutlined';
import BadgeOutlinedIcon from '@mui/icons-material/BadgeOutlined';
import CameraAltOutlinedIcon from '@mui/icons-material/CameraAltOutlined';
import AccessTimeOutlinedIcon from '@mui/icons-material/AccessTimeOutlined';
import ErrorOutlineOutlinedIcon from '@mui/icons-material/ErrorOutlineOutlined';
import HourglassEmptyOutlinedIcon from '@mui/icons-material/HourglassEmptyOutlined';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import EditIcon from '@mui/icons-material/Edit';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { useAuth } from '../context/AuthContext';
import { getMyVerification, resubmitVerificationDocuments, uploadSingleDocument } from '../api/verifications';
import { compressImageFile } from '../utils/fileCompressor';
import { uploadFileInChunks } from '../utils/chunkUploader';
import type { VerificationRecord } from '../api/verifications';
import { useLocation, useNavigate } from 'react-router-dom';
import { initializePayment } from '../api/payment';
import toast from 'react-hot-toast';

const fmt = (dateStr: string | null | undefined) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

/** Available subscription tiers and pricing */
const PLANS: Record<'Bronze' | 'Silver' | 'Gold', { monthly: number; annual: number }> = {
  Bronze: { monthly: 850, annual: 10000 },
  Silver: { monthly: 1500, annual: 15000 },
  Gold: { monthly: 2500, annual: 25000 },
};

/** Derive dynamic timeline steps from the real verification record */
function buildTimeline(record: VerificationRecord) {
  const submittedAt = record.submitted_at;
  const reviewedAt = record.reviewed_at;
  const status = record.status;
  const hasNotes = !!record.admin_notes;

  let step2Title = 'Document Review';
  let step2StatusTag: string | null = null;
  let step2BadgeColor = '#854D0E';
  let step2BadgeBg = '#FEF9C3';
  let step3Status = 'Awaiting';
  let step4Status = 'Awaiting';

  if (status === 'approved') {
    step2Title = 'Document Review Passed';
    step2StatusTag = 'APPROVED';
    step2BadgeColor = '#166534';
    step2BadgeBg = '#DCFCE7';
    step3Status = fmt(reviewedAt);
    step4Status = fmt(reviewedAt);
  } else if (status === 'rejected') {
    step2Title = 'Verification Rejected';
    step2StatusTag = 'REJECTED';
    step2BadgeColor = '#991B1B';
    step2BadgeBg = '#FEE2E2';
    step3Status = 'Cancelled';
    step4Status = 'Cancelled';
  } else if (status === 'flagged') {
    step2Title = 'Account Flagged & Suspended';
    step2StatusTag = 'SUSPENDED';
    step2BadgeColor = '#9A3412';
    step2BadgeBg = '#FFEDD5';
    step3Status = 'Blocked';
    step4Status = 'Blocked';
  } else if (status === 'pending' && hasNotes) {
    step2Title = 'Information Requested';
    step2StatusTag = 'ACTION REQUIRED';
    step2BadgeColor = '#854D0E';
    step2BadgeBg = '#FEF9C3';
  } else if (status === 'tier_assigned') {
    step2Title = 'Pre-Approved (Tier Assigned)';
    step2StatusTag = 'PRE-APPROVED';
    step2BadgeColor = '#1E40AF';
    step2BadgeBg = '#DBEAFE';
    step3Status = 'Payment Required';
  } else if (status === 'payment_received') {
    step2Title = 'Documents Approved';
    step2StatusTag = 'PAYMENT RECEIVED';
    step2BadgeColor = '#166534';
    step2BadgeBg = '#DCFCE7';
    step3Status = 'Received';
  }

  const rawSteps = [
    { title: 'Identity Submitted', date: fmt(submittedAt), done: true, tag: null, badgeColor: '', badgeBg: '' },
    { title: step2Title, date: reviewedAt ? fmt(reviewedAt) : 'In progress…', done: ['approved', 'tier_assigned', 'payment_received'].includes(status), tag: step2StatusTag, badgeColor: step2BadgeColor, badgeBg: step2BadgeBg },
    { title: 'Subscription Payment', date: step3Status, done: ['payment_received', 'approved'].includes(status), tag: status === 'tier_assigned' ? 'PAYMENT REQUIRED' : null, badgeColor: '#1E40AF', badgeBg: '#DBEAFE' },
    { title: 'Final Approval', date: step4Status, done: status === 'approved', tag: status === 'approved' ? 'COMPLETED' : status === 'rejected' ? 'REJECTED' : status === 'flagged' ? 'SUSPENDED' : null, badgeColor: status === 'approved' ? '#166534' : '#991B1B', badgeBg: status === 'approved' ? '#DCFCE7' : '#FEE2E2' },
  ];

  let markedActive = false;
  return rawSteps.map((s) => {
    const isFailedOrSuspended = ['rejected', 'flagged'].includes(status);
    const active = !isFailedOrSuspended && !s.done && !markedActive;
    if (active) markedActive = true;
    return { ...s, active };
  });
}

/** Derive document list from real URLs and granular statuses */
function buildDocuments(record: VerificationRecord) {
  const getDocMeta = (url?: string, docStatus?: string, docNotes?: string | null) => {
    const s = docStatus || record.status;
    let label = 'Under Review';
    let color = '#92400E';
    let bg = '#FEF3C7';

    if (s === 'approved') { label = 'Verified'; color = '#166534'; bg = '#DCFCE7'; }
    else if (s === 'rejected') { label = 'Rejected'; color = '#991B1B'; bg = '#FEE2E2'; }

    return { statusLabel: label, statusColor: color, statusBg: bg, notes: docNotes, hasUrl: !!url };
  };

  const govMeta = getDocMeta(record.gov_id_url, record.gov_id_status, record.gov_id_notes);
  const cacMeta = getDocMeta(record.cac_url, record.cac_status, record.cac_notes);
  const vidMeta = getDocMeta(record.video_url, record.video_status, record.video_notes);

  return [
    {
      key: 'gov_id',
      title: 'Government ID',
      meta: `Identity • Submitted ${fmt(record.submitted_at)}`,
      icon: <BadgeOutlinedIcon sx={{ color: '#64748B' }} />,
      ...govMeta,
    },
    ...(record.cac_url || record.cac_status ? [{
      key: 'cac',
      title: 'CAC Registration Document',
      meta: `Business Registration • Submitted ${fmt(record.submitted_at)}`,
      icon: <InfoOutlinedIcon sx={{ color: '#64748B' }} />,
      ...cacMeta,
    }] : []),
    {
      key: 'video',
      title: 'Business Video Verification',
      meta: `Face Match • Submitted ${fmt(record.submitted_at)}`,
      icon: <CameraAltOutlinedIcon sx={{ color: '#64748B' }} />,
      ...vidMeta,
    },
  ];
}

export default function VerificationPage() {
  const { user, login } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);
  const mockStatus = searchParams.get('mock');

  const [record, setRecord] = useState<VerificationRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPaying, setIsPaying] = useState(false);

  // Plan selection state
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [selectedTier, setSelectedTier] = useState<'Bronze' | 'Silver' | 'Gold'>('Bronze');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');

  // Targeted document resubmission state
  const [resubmitModalOpen, setResubmitModalOpen] = useState(false);
  const [activeDocKey, setActiveDocKey] = useState<'govId' | 'cac' | 'video'>('govId');
  const [activeDocTitle, setActiveDocTitle] = useState<string>('Government ID');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isResubmitting, setIsResubmitting] = useState(false);
  const [resubmitProgress, setResubmitProgress] = useState<number>(0);
  const [resubmitPhase, setResubmitPhase] = useState<string>('');

  const openResubmitModal = (key: 'gov_id' | 'cac' | 'video', title: string) => {
    const mapped = key === 'gov_id' ? 'govId' : key === 'cac' ? 'cac' : 'video';
    setActiveDocKey(mapped);
    setActiveDocTitle(title);
    setSelectedFile(null);
    setResubmitProgress(0);
    setResubmitPhase('');
    setResubmitModalOpen(true);
  };

  const handleResubmit = async () => {
    if (!selectedFile) return toast.error('Please select a file to upload');
    setIsResubmitting(true);
    setResubmitProgress(0);

    try {
      let uploadedUrl = '';

      if (activeDocKey === 'video') {
        setResubmitPhase('Uploading video in resilient chunks...');
        const res = await uploadFileInChunks(selectedFile, 'video', {
          onProgress: (pct, current, total) => {
            setResubmitProgress(pct);
            setResubmitPhase(`Uploading chunk ${current}/${total} (${pct}%)...`);
          },
        });
        uploadedUrl = res.url;
        await resubmitVerificationDocuments({ video_url: uploadedUrl });
      } else {
        setResubmitPhase('Optimizing document image...');
        let fileToUpload = selectedFile;
        if (selectedFile.type.startsWith('image/')) {
          try {
            fileToUpload = await compressImageFile(selectedFile);
          } catch (e) {
            console.warn('Compression fallback:', e);
          }
        }
        setResubmitPhase('Uploading document...');
        const fieldName = activeDocKey === 'govId' ? 'gov_id' : 'cac_document';
        const res = await uploadSingleDocument(fileToUpload, fieldName, (pct) => {
          setResubmitProgress(pct);
        });
        uploadedUrl = res.url;

        if (activeDocKey === 'govId') {
          await resubmitVerificationDocuments({ gov_id_url: uploadedUrl });
        } else {
          await resubmitVerificationDocuments({ cac_url: uploadedUrl });
        }
      }

      toast.success(`${activeDocTitle} resubmitted! Account is now under pending review.`);
      setResubmitModalOpen(false);
      const updatedRec = await getMyVerification();
      setRecord(updatedRec);
    } catch (err: any) {
      console.error('Resubmit error:', err);
      toast.error(err.response?.data?.message || err.message || 'Failed to resubmit document.');
    } finally {
      setIsResubmitting(false);
      setResubmitProgress(0);
      setResubmitPhase('');
    }
  };

  const handlePay = async () => {
    if (!record || !user) return;
    setIsPaying(true);
    try {
      const amount = PLANS[selectedTier][billingCycle];

      const res = await initializePayment({
        email: user.email,
        amount,
        plan: selectedTier,
        billingCycle: billingCycle === 'annual' ? 'annually' : 'monthly',
      });

      if (res?.data?.authorization_url) {
        window.location.href = res.data.authorization_url;
      } else {
        toast.error(res?.error || 'Could not initialize payment.');
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.response?.data?.message || 'Failed to initialize payment.';
      toast.error(errorMsg);
    } finally {
      setIsPaying(false);
      setPlanModalOpen(false);
    }
  };

  useEffect(() => {
    if (mockStatus) {
      if (mockStatus === 'none') {
        setRecord(null);
        setLoading(false);
        return;
      }
      setRecord({
        id: 999,
        user_id: user?.id || 1,
        status: mockStatus as any,
        gov_id_url: '',
        cac_url: '',
        business_video_url: '',
        submitted_at: new Date().toISOString(),
        reviewed_at: ['approved', 'rejected', 'flagged'].includes(mockStatus) ? new Date().toISOString() : null,
        admin_notes: mockStatus === 'rejected' ? 'Document is too blurry to read.' : mockStatus === 'flagged' ? 'Suspicious activity detected.' : null,
      });
      setLoading(false);
      return;
    }

    getMyVerification()
      .then((rec) => {
        setRecord(rec);
        if (rec?.assigned_tier) {
          const normalized = rec.assigned_tier.charAt(0).toUpperCase() + rec.assigned_tier.slice(1).toLowerCase();
          if (['Bronze', 'Silver', 'Gold'].includes(normalized)) {
            setSelectedTier(normalized as 'Bronze' | 'Silver' | 'Gold');
          }
        }
        if (user) {
          if (rec.status === 'approved' && user.status !== 'verified') {
            login({ ...user, status: 'verified' });
          } else if (rec.status === 'rejected' && user.status !== 'rejected') {
            login({ ...user, status: 'rejected' });
          } else if (rec.status === 'flagged' && user.status !== 'suspended') {
            login({ ...user, status: 'suspended' });
          } else if (rec.status === 'pending' && user.status !== 'pending') {
            login({ ...user, status: 'pending' });
          }
        }
      })
      .catch((err) => {
        // 404 means no record submitted yet — that's fine
        if (err?.response?.status !== 404) {
          setError('Could not load verification details. Please try again later.');
        }
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

      {/* ── Loading ── */}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
          <CircularProgress size={36} sx={{ color: '#2563EB' }} />
        </Box>
      )}

      {/* ── Error ── */}
      {!loading && error && (
        <Box sx={{ border: '1px solid #FCA5A5', bgcolor: '#FEF2F2', borderRadius: 3, p: 3, mb: 4 }}>
          <Typography sx={{ color: '#991B1B', fontWeight: 600 }}>{error}</Typography>
        </Box>
      )}

      {/* ── No Record Yet ── */}
      {!loading && !error && !record && (
        <Box sx={{
          border: '1px solid #E2E8F0', bgcolor: '#F8FAFC', borderRadius: 3, p: 4,
          display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 1.5, mb: 4,
        }}>
          <HourglassEmptyOutlinedIcon sx={{ color: '#94A3B8', fontSize: 48 }} />
          <Typography sx={{ fontWeight: 700, fontSize: '1.1rem', color: '#0F172A' }}>
            No Verification Submitted Yet
          </Typography>
          <Typography sx={{ color: '#64748B', fontSize: '0.9rem', maxWidth: 500, mb: 2 }}>
            You haven't submitted your verification documents. Complete the "Get Verified" flow to start the process.
          </Typography>
          <Button variant="contained" onClick={() => navigate('/dashboard/update/docs')} sx={{ bgcolor: '#1A1FE8', textTransform: 'none', borderRadius: 2 }}>
            Submit Verification
          </Button>
        </Box>
      )}

      {/* ── Loaded Content ── */}
      {!loading && !error && record && (() => {
        const timeline = buildTimeline(record);
        const documents = buildDocuments(record);
        const isApproved = record.status === 'approved';
        const isPending = record.status === 'pending';
        const isRejected = record.status === 'rejected';

        return (
          <>
            {/* Status Banner – Verified */}
            {(user?.status === 'verified' || isApproved) && (
              <Box sx={{
                border: '1px solid #93C5FD', bgcolor: '#F8FAFC', borderRadius: 3, p: 3,
                display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 4,
                flexDirection: { xs: 'column', md: 'row' }, gap: 2,
              }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                  <Box sx={{
                    width: 48, height: 48, borderRadius: '50%', bgcolor: '#DCFCE7',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
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
                  {record.reviewed_at && (
                    <Typography sx={{ color: '#2563EB', fontSize: '0.85rem', fontWeight: 600 }}>
                      Verified: {fmt(record.reviewed_at)}
                    </Typography>
                  )}
                  {record.reviewed_at && (
                    <Typography sx={{ color: '#2563EB', fontSize: '0.85rem', fontWeight: 600 }}>
                      Expires: {fmt(new Date(new Date(record.reviewed_at).setFullYear(new Date(record.reviewed_at).getFullYear() + 1)).toISOString())}
                    </Typography>
                  )}
                </Box>
              </Box>
            )}

            {/* Status Banner – Pending / Info Requested */}
            {isPending && user?.status !== 'verified' && (
              <Box sx={{
                border: '1px solid #FDE047', bgcolor: '#FEFCE8', borderRadius: 3, p: 3,
                display: 'flex', alignItems: 'flex-start', mb: 4, gap: 2,
              }}>
                <Box sx={{
                  width: 48, height: 48, borderRadius: '50%', bgcolor: '#FEF08A',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  {record.admin_notes ? <InfoOutlinedIcon sx={{ color: '#CA8A04' }} /> : <AccessTimeOutlinedIcon sx={{ color: '#CA8A04' }} />}
                </Box>
                <Box sx={{ flexGrow: 1 }}>
                  <Typography sx={{ fontWeight: 700, fontSize: '1.1rem', color: '#854D0E', mb: 0.5 }}>
                    {record.admin_notes ? 'Action Required: More Information Requested' : 'Verification Pending Review'}
                  </Typography>
                  <Typography sx={{ color: '#A16207', fontSize: '0.9rem', maxWidth: 650, mb: 2 }}>
                    {record.admin_notes 
                      ? `An admin reviewed your submission on ${fmt(record.reviewed_at)} and requested more details. Please review the admin message below and update your documents or business info immediately.`
                      : `Your documents have been submitted on ${fmt(record.submitted_at)} and are currently being reviewed by our team. This process typically takes 24–48 hours. The Dashboard will be unlocked once approved.`}
                  </Typography>
                  
                  {record.admin_notes && (
                    <Box sx={{ bgcolor: '#FEF9C3', p: 2, borderRadius: 2, border: '1px solid #FDE047', mb: 2.5 }}>
                      <Typography sx={{ fontWeight: 700, color: '#854D0E', fontSize: '0.85rem', mb: 0.5 }}>Admin Message:</Typography>
                      <Typography sx={{ color: '#A16207', fontSize: '0.92rem', fontWeight: 600 }}>{record.admin_notes}</Typography>
                    </Box>
                  )}

                  {record.admin_notes && (
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                      <Button
                        variant="contained"
                        startIcon={<CloudUploadIcon />}
                        onClick={() => navigate('/dashboard/update/docs')}
                        sx={{ bgcolor: '#CA8A04', '&:hover': { bgcolor: '#A16207' }, textTransform: 'none', borderRadius: 2, fontWeight: 700 }}
                      >
                        Re-upload Requested Documents
                      </Button>
                      <Button
                        variant="outlined"
                        startIcon={<EditIcon />}
                        onClick={() => navigate('/dashboard/update/bio')}
                        sx={{ borderColor: '#CA8A04', color: '#854D0E', '&:hover': { borderColor: '#A16207', bgcolor: '#FEF08A' }, textTransform: 'none', borderRadius: 2, fontWeight: 700 }}
                      >
                        Update Business Profile Info
                      </Button>
                    </Stack>
                  )}
                </Box>
              </Box>
            )}

            {/* Status Banner – Tier Assigned (Awaiting Payment) */}
            {record.status === 'tier_assigned' && (
              <Box sx={{
                border: '1px solid #93C5FD', bgcolor: '#EFF6FF', borderRadius: 3, p: 3,
                display: 'flex', alignItems: 'flex-start', mb: 4, gap: 2,
              }}>
                <Box sx={{
                  width: 48, height: 48, borderRadius: '50%', bgcolor: '#DBEAFE',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <InfoOutlinedIcon sx={{ color: '#2563EB' }} />
                </Box>
                <Box sx={{ flexGrow: 1 }}>
                  <Typography sx={{ fontWeight: 700, fontSize: '1.1rem', color: '#1E3A8A', mb: 0.5 }}>
                    Subscription Payment Required
                  </Typography>
                  <Typography sx={{ color: '#1E40AF', fontSize: '0.9rem', maxWidth: 600, mb: 2 }}>
                    Your documents have been reviewed and you have been approved for a tier. Please complete your subscription payment to finalize the verification process.
                  </Typography>
                  <Button variant="contained" disabled={isPaying} onClick={() => setPlanModalOpen(true)} sx={{ bgcolor: '#2563EB', '&:hover': { bgcolor: '#1D4ED8' }, textTransform: 'none', borderRadius: 2 }}>
                    {isPaying ? <CircularProgress size={24} color="inherit" /> : 'Proceed to Payment'}
                  </Button>
                </Box>
              </Box>
            )}

            {/* Status Banner – Payment Received */}
            {record.status === 'payment_received' && (
              <Box sx={{
                border: '1px solid #86EFAC', bgcolor: '#F0FDF4', borderRadius: 3, p: 3,
                display: 'flex', alignItems: 'flex-start', mb: 4, gap: 2,
              }}>
                <Box sx={{
                  width: 48, height: 48, borderRadius: '50%', bgcolor: '#DCFCE7',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <CheckCircleIcon sx={{ color: '#16A34A' }} />
                </Box>
                <Box sx={{ flexGrow: 1 }}>
                  <Typography sx={{ fontWeight: 700, fontSize: '1.1rem', color: '#14532D', mb: 0.5 }}>
                    Payment Received
                  </Typography>
                  <Typography sx={{ color: '#166534', fontSize: '0.9rem', maxWidth: 600 }}>
                    We have received your payment. An admin will finalize your verification shortly.
                  </Typography>
                </Box>
              </Box>
            )}

            {/* Status Banner – Rejected */}
            {isRejected && (
              <Box sx={{
                border: '1px solid #FCA5A5', bgcolor: '#FEF2F2', borderRadius: 3, p: 3,
                display: 'flex', alignItems: 'flex-start', mb: 4, gap: 2,
              }}>
                <Box sx={{
                  width: 48, height: 48, borderRadius: '50%', bgcolor: '#FECACA',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <ErrorOutlineOutlinedIcon sx={{ color: '#DC2626' }} />
                </Box>
                <Box sx={{ flexGrow: 1 }}>
                  <Typography sx={{ fontWeight: 700, fontSize: '1.1rem', color: '#991B1B', mb: 0.5 }}>
                    Verification Rejected
                  </Typography>
                  <Typography sx={{ color: '#B91C1C', fontSize: '0.9rem', maxWidth: 600, mb: record.admin_notes ? 2 : 0 }}>
                    Unfortunately, your verification was not approved{record.reviewed_at ? ` on ${fmt(record.reviewed_at)}` : ''}.
                    Please check your email for more details or contact support.
                  </Typography>
                  {record.admin_notes && (
                    <Box sx={{ bgcolor: '#FEE2E2', p: 2, borderRadius: 2, border: '1px solid #FCA5A5', mb: 2 }}>
                      <Typography sx={{ fontWeight: 700, color: '#991B1B', fontSize: '0.85rem', mb: 0.5 }}>Admin Reason:</Typography>
                      <Typography sx={{ color: '#B91C1C', fontSize: '0.9rem' }}>{record.admin_notes}</Typography>
                    </Box>
                  )}
                  <Button variant="contained" onClick={() => navigate('/dashboard/update/docs')} sx={{ bgcolor: '#DC2626', '&:hover': { bgcolor: '#991B1B' }, textTransform: 'none', borderRadius: 2 }}>
                    Resubmit Documents
                  </Button>
                </Box>
              </Box>
            )}

            {/* Status Banner – Flagged */}
            {record.status === 'flagged' && (
              <Box sx={{
                border: '1px solid #FDBA74', bgcolor: '#FFF7ED', borderRadius: 3, p: 3,
                display: 'flex', alignItems: 'flex-start', mb: 4, gap: 2,
              }}>
                <Box sx={{
                  width: 48, height: 48, borderRadius: '50%', bgcolor: '#FFEDD5',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <ErrorOutlineOutlinedIcon sx={{ color: '#EA580C' }} />
                </Box>
                <Box sx={{ flexGrow: 1 }}>
                  <Typography sx={{ fontWeight: 700, fontSize: '1.1rem', color: '#9A3412', mb: 0.5 }}>
                    Account Flagged for Suspicious Activity
                  </Typography>
                  <Typography sx={{ color: '#C2410C', fontSize: '0.9rem', maxWidth: 600, mb: record.admin_notes ? 2 : 0 }}>
                    Your verification has been flagged due to security concerns{record.reviewed_at ? ` on ${fmt(record.reviewed_at)}` : ''}. Your account is currently suspended pending further investigation.
                  </Typography>
                  {record.admin_notes && (
                    <Box sx={{ bgcolor: '#FFEDD5', p: 2, borderRadius: 2, border: '1px solid #FDBA74' }}>
                      <Typography sx={{ fontWeight: 700, color: '#9A3412', fontSize: '0.85rem', mb: 0.5 }}>Admin Warning:</Typography>
                      <Typography sx={{ color: '#C2410C', fontSize: '0.9rem' }}>{record.admin_notes}</Typography>
                    </Box>
                  )}
                </Box>
              </Box>
            )}

            {/* Two Column Layout */}
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 4 }}>

              {/* Left – Timeline */}
              <Box sx={{ flex: 1 }}>
                <Typography sx={{ fontWeight: 700, fontSize: '1.1rem', color: '#0F172A', mb: 3 }}>
                  Verification Timeline
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0, position: 'relative' }}>
                  {/* Connecting line */}
                  <Box sx={{ position: 'absolute', left: 15, top: 20, bottom: 20, width: 2, bgcolor: '#E2E8F0', zIndex: 0 }} />

                  {timeline.map((step, index) => {
                    const isRejectedStep = step.tag === 'REJECTED';
                    const isSuspendedStep = step.tag === 'SUSPENDED';

                    const dotBorder = isRejectedStep
                      ? '2px solid #FCA5A5'
                      : isSuspendedStep
                      ? '2px solid #FDBA74'
                      : step.done
                      ? '2px solid #DCFCE7'
                      : step.active
                      ? '2px solid #FDE047'
                      : '2px solid #E2E8F0';

                    const dotBg = isRejectedStep
                      ? '#FEF2F2'
                      : isSuspendedStep
                      ? '#FFF7ED'
                      : '#fff';

                    return (
                      <Box key={index} sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 3, position: 'relative', zIndex: 1 }}>
                        {/* Step dot */}
                        <Box sx={{
                          width: 32, height: 32, borderRadius: '50%', bgcolor: dotBg, flexShrink: 0,
                          border: dotBorder,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          boxShadow: step.active ? '0 0 0 4px #FEF9C3' : 'none',
                        }}>
                          {isRejectedStep ? (
                            <ErrorOutlineOutlinedIcon sx={{ color: '#DC2626', fontSize: 18 }} />
                          ) : isSuspendedStep ? (
                            <WarningAmberIcon sx={{ color: '#EA580C', fontSize: 18 }} />
                          ) : step.done ? (
                            <CheckCircleIcon sx={{ color: '#22C55E', fontSize: 18 }} />
                          ) : step.active ? (
                            <AccessTimeOutlinedIcon sx={{ color: '#CA8A04', fontSize: 16 }} />
                          ) : (
                            <AccessTimeOutlinedIcon sx={{ color: '#CBD5E1', fontSize: 16 }} />
                          )}
                        </Box>
                        <Box sx={{ pt: 0.5 }}>
                          <Typography sx={{
                            fontWeight: 600, fontSize: '0.95rem',
                            color: isRejectedStep ? '#991B1B' : isSuspendedStep ? '#9A3412' : step.done ? '#0F172A' : step.active ? '#854D0E' : '#94A3B8',
                          }}>
                            {step.title}
                            {step.tag && (
                              <Box component="span" sx={{
                                ml: 1, fontSize: '0.7rem', fontWeight: 700, color: step.badgeColor || '#CA8A04',
                                bgcolor: step.badgeBg || '#FEF9C3', px: 0.8, py: 0.2, borderRadius: 2, verticalAlign: 'middle',
                              }}>
                                {step.tag}
                              </Box>
                            )}
                            {step.active && !step.tag && (
                              <Box component="span" sx={{
                                ml: 1, fontSize: '0.7rem', fontWeight: 700, color: '#CA8A04',
                                bgcolor: '#FEF9C3', px: 0.8, py: 0.2, borderRadius: 2, verticalAlign: 'middle',
                              }}>
                                ACTIVE
                              </Box>
                            )}
                          </Typography>
                          <Typography sx={{ color: isRejectedStep ? '#B91C1C' : isSuspendedStep ? '#C2410C' : step.active ? '#A16207' : '#94A3B8', fontSize: '0.8rem' }}>
                            {step.date}
                          </Typography>
                        </Box>
                      </Box>
                    );
                  })}
                </Box>
              </Box>

              {/* Right – Documents */}
              <Box sx={{ flex: 1.5 }}>
                <Typography sx={{ fontWeight: 700, fontSize: '1.1rem', color: '#0F172A', mb: 3 }}>
                  Submitted Documents
                </Typography>
                <Box sx={{ border: '1px solid #E2E8F0', borderRadius: 4, p: { xs: 2, md: 3 }, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {documents.map((doc, index) => (
                    <Box key={index} sx={{
                      bgcolor: '#F8FAFC', borderRadius: 3, p: 2, border: '1px solid #E2E8F0',
                      display: 'flex', flexDirection: 'column', gap: 1.5
                    }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Box sx={{
                            width: 40, height: 40, borderRadius: 2, bgcolor: '#fff', border: '1px solid #E2E8F0',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            {doc.icon}
                          </Box>
                          <Box>
                            <Typography sx={{ fontWeight: 600, fontSize: '0.95rem', color: '#0F172A' }}>{doc.title}</Typography>
                            <Typography sx={{ color: '#64748B', fontSize: '0.75rem' }}>{doc.meta}</Typography>
                          </Box>
                        </Box>
                        
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box sx={{ bgcolor: doc.statusBg, px: 1.5, py: 0.5, borderRadius: 5 }}>
                            <Typography sx={{ color: doc.statusColor, fontWeight: 700, fontSize: '0.75rem' }}>{doc.statusLabel}</Typography>
                          </Box>
                          {doc.statusLabel !== 'Verified' && (
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => openResubmitModal(doc.key as any, doc.title)}
                              sx={{ textTransform: 'none', borderRadius: 2, fontSize: '0.75rem', fontWeight: 600, borderColor: '#CBD5E1', color: '#334155' }}
                            >
                              Re-upload
                            </Button>
                          )}
                        </Box>
                      </Box>

                      {/* Display Admin Notes for this document if provided */}
                      {doc.notes && (
                        <Box sx={{ bgcolor: '#FEF2F2', p: 1.5, borderRadius: 2, border: '1px solid #FCA5A5' }}>
                          <Typography sx={{ fontWeight: 700, color: '#991B1B', fontSize: '0.78rem', mb: 0.25 }}>Admin Feedback:</Typography>
                          <Typography sx={{ color: '#B91C1C', fontSize: '0.85rem' }}>{doc.notes}</Typography>
                        </Box>
                      )}
                    </Box>
                  ))}
                </Box>
              </Box>

            </Box>
          </>
        );
      })()}

      {/* Plan Selection Dialog */}
      <Dialog open={planModalOpen} onClose={() => setPlanModalOpen(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3, p: 1 } }}>
        <DialogTitle sx={{ fontWeight: 800, color: '#0F172A', pb: 1 }}>
          Choose Your Plan
        </DialogTitle>
        <DialogContent>
          {/* Billing cycle toggle */}
          <Stack direction="row" spacing={1} mb={3}>
            {(['monthly', 'annual'] as const).map((cycle) => (
              <Button
                key={cycle}
                fullWidth
                variant={billingCycle === cycle ? 'contained' : 'outlined'}
                onClick={() => setBillingCycle(cycle)}
                sx={{
                  textTransform: 'none',
                  borderRadius: 2,
                  fontWeight: 700,
                  bgcolor: billingCycle === cycle ? '#2563EB' : 'transparent',
                  borderColor: '#93C5FD',
                  color: billingCycle === cycle ? '#fff' : '#2563EB',
                }}
              >
                {cycle === 'monthly' ? 'Monthly' : 'Annually'}
              </Button>
            ))}
          </Stack>

          {/* Tier options */}
          <Stack spacing={1.5}>
            {(['Bronze', 'Silver', 'Gold'] as const).map((tier) => {
              const price = PLANS[tier][billingCycle];
              const selected = selectedTier === tier;
              
              const tiersOrder = ['Bronze', 'Silver', 'Gold'];
              const minEligibleTier = record?.assigned_tier ? (record.assigned_tier.charAt(0).toUpperCase() + record.assigned_tier.slice(1).toLowerCase()) : 'Bronze';
              const minIndex = tiersOrder.indexOf(minEligibleTier);
              const currentTierIndex = tiersOrder.indexOf(tier);
              const isEligible = currentTierIndex >= minIndex;

              return (
                <Box
                  key={tier}
                  onClick={() => isEligible && setSelectedTier(tier)}
                  sx={{
                    cursor: isEligible ? 'pointer' : 'not-allowed',
                    border: selected ? '2px solid #2563EB' : '1px solid #E2E8F0',
                    bgcolor: selected ? '#EFF6FF' : (isEligible ? '#F8FAFC' : '#F1F5F9'),
                    opacity: isEligible ? 1 : 0.6,
                    borderRadius: 2,
                    p: 2,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <Typography sx={{ fontWeight: 700, color: isEligible ? '#0F172A' : '#64748B' }}>
                    {tier}
                    {!isEligible && (
                        <Typography component="span" sx={{ color: '#94A3B8', fontSize: '0.75rem', ml: 1, fontWeight: 600 }}>
                            (Not Eligible)
                        </Typography>
                    )}
                  </Typography>
                  <Typography sx={{ fontWeight: 700, color: isEligible ? '#2563EB' : '#94A3B8' }}>
                    ₦{price.toLocaleString()}
                    <Typography component="span" sx={{ color: isEligible ? '#64748B' : '#94A3B8', fontWeight: 500, fontSize: '0.75rem' }}>
                      {billingCycle === 'monthly' ? '/mo' : '/yr'}
                    </Typography>
                  </Typography>
                </Box>
              );
            })}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setPlanModalOpen(false)} sx={{ textTransform: 'none', color: '#64748B', fontWeight: 600 }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={isPaying}
            onClick={handlePay}
            sx={{ bgcolor: '#2563EB', color: '#fff', borderRadius: 2, px: 3, fontWeight: 700, textTransform: 'none', '&:hover': { bgcolor: '#1D4ED8' } }}
          >
            {isPaying ? <CircularProgress size={20} color="inherit" /> : 'Continue to Payment'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Targeted Document Resubmission Dialog */}
      <Dialog open={resubmitModalOpen} onClose={() => !isResubmitting && setResubmitModalOpen(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3, p: 1 } }}>
        <DialogTitle sx={{ fontWeight: 800, color: '#0F172A', pb: 1 }}>
          Re-upload {activeDocTitle}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="#64748B" mb={2.5}>
            Select a new file to replace your current <strong>{activeDocTitle}</strong>. Your account status will update to pending review once uploaded.
          </Typography>
          <Button
            component="label"
            variant="outlined"
            disabled={isResubmitting}
            fullWidth
            startIcon={<CloudUploadIcon />}
            sx={{ py: 3, borderStyle: 'dashed', borderRadius: 2, textTransform: 'none', fontWeight: 600, color: '#2563EB', borderColor: '#93C5FD' }}
          >
            {selectedFile ? selectedFile.name : `Choose new file (${activeDocKey === 'video' ? 'MP4/MOV/WebM/MKV' : 'JPG/PNG/WebP/PDF'})`}
            <input
              type="file"
              hidden
              accept={
                activeDocKey === 'video'
                  ? '.mp4,.mov,.mkv,.webm,video/mp4,video/quicktime,video/x-matroska,video/webm'
                  : '.jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf'
              }
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  setSelectedFile(e.target.files[0]);
                }
              }}
            />
          </Button>

          {isResubmitting && (
            <Box sx={{ mt: 2.5 }}>
              <LinearProgress variant="determinate" value={resubmitProgress} sx={{ height: 6, borderRadius: 1 }} />
              <Typography variant="caption" sx={{ color: '#2563EB', mt: 1, display: 'block', fontWeight: 600 }}>
                {resubmitPhase || `Uploading (${resubmitProgress}%)...`}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button disabled={isResubmitting} onClick={() => setResubmitModalOpen(false)} sx={{ textTransform: 'none', color: '#64748B', fontWeight: 600 }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={!selectedFile || isResubmitting}
            onClick={handleResubmit}
            sx={{ bgcolor: '#2563EB', color: '#fff', borderRadius: 2, px: 3, fontWeight: 700, textTransform: 'none', '&:hover': { bgcolor: '#1D4ED8' } }}
          >
            {isResubmitting ? <CircularProgress size={20} color="inherit" /> : 'Upload & Submit'}
          </Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
}
