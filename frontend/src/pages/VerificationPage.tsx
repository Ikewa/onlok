import { useEffect, useState } from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import VerifiedUserOutlinedIcon from '@mui/icons-material/VerifiedUserOutlined';
import BadgeOutlinedIcon from '@mui/icons-material/BadgeOutlined';
import CameraAltOutlinedIcon from '@mui/icons-material/CameraAltOutlined';
import AccessTimeOutlinedIcon from '@mui/icons-material/AccessTimeOutlined';
import ErrorOutlineOutlinedIcon from '@mui/icons-material/ErrorOutlineOutlined';
import HourglassEmptyOutlinedIcon from '@mui/icons-material/HourglassEmptyOutlined';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { useAuth } from '../context/AuthContext';
import { getMyVerification } from '../api/verifications';
import type { VerificationRecord } from '../api/verifications';

const fmt = (dateStr: string | null | undefined) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

/** Derive timeline steps from the real verification record */
function buildTimeline(record: VerificationRecord) {
  const submittedAt = record.submitted_at;
  const reviewedAt = record.reviewed_at;
  const status = record.status;

  const rawSteps = [
    { title: 'Identity Submitted',   date: fmt(submittedAt),                                        done: true },
    { title: 'Document Review',      date: reviewedAt ? fmt(reviewedAt) : 'In progress…',            done: !!reviewedAt },
    { title: 'Final Approval',       date: status === 'approved' ? fmt(reviewedAt) : 'Awaiting',    done: status === 'approved' },
  ];

  // Mark the first incomplete step as the active (current) step
  let markedActive = false;
  return rawSteps.map((s) => {
    const active = !s.done && !markedActive;
    if (active) markedActive = true;
    return { ...s, active };
  });
}

/** Derive document list from real URLs */
function buildDocuments(record: VerificationRecord) {
  const docStatus = record.status === 'approved' ? 'Verified' : record.status === 'rejected' ? 'Rejected' : 'Under Review';
  const docColor = record.status === 'approved' ? '#166534' : record.status === 'rejected' ? '#991B1B' : '#92400E';
  const docBg = record.status === 'approved' ? '#DCFCE7' : record.status === 'rejected' ? '#FEE2E2' : '#FEF3C7';

  return [
    {
      title: 'Government ID',
      meta: `Identity • Submitted ${fmt(record.submitted_at)}`,
      icon: <BadgeOutlinedIcon sx={{ color: '#64748B' }} />,
      statusLabel: docStatus,
      statusColor: docColor,
      statusBg: docBg,
    },
    {
      title: 'Business Video',
      meta: `Face Match • Submitted ${fmt(record.submitted_at)}`,
      icon: <CameraAltOutlinedIcon sx={{ color: '#64748B' }} />,
      statusLabel: docStatus,
      statusColor: docColor,
      statusBg: docBg,
    },
  ];
}

export default function VerificationPage() {
  const { user, login } = useAuth();
  const [record, setRecord] = useState<VerificationRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getMyVerification()
      .then((rec) => {
        setRecord(rec);
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
          <Typography sx={{ color: '#64748B', fontSize: '0.9rem', maxWidth: 500 }}>
            You haven't submitted your verification documents. Complete the "Get Verified" flow to start the process.
          </Typography>
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

            {/* Status Banner – Pending */}
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
                    {record.admin_notes ? 'More Information Requested' : 'Verification Pending Review'}
                  </Typography>
                  <Typography sx={{ color: '#A16207', fontSize: '0.9rem', maxWidth: 600, mb: record.admin_notes ? 2 : 0 }}>
                    {record.admin_notes 
                      ? `An admin has reviewed your submission on ${fmt(record.reviewed_at)} and requested more details before approving your account.`
                      : `Your documents have been submitted on ${fmt(record.submitted_at)} and are currently being reviewed by our team. This process typically takes 24–48 hours. The Dashboard will be unlocked once approved.`}
                  </Typography>
                  {record.admin_notes && (
                    <Box sx={{ bgcolor: '#FEF9C3', p: 2, borderRadius: 2, border: '1px solid #FDE047' }}>
                      <Typography sx={{ fontWeight: 700, color: '#854D0E', fontSize: '0.85rem', mb: 0.5 }}>Admin Notes:</Typography>
                      <Typography sx={{ color: '#A16207', fontSize: '0.9rem' }}>{record.admin_notes}</Typography>
                    </Box>
                  )}
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
                    <Box sx={{ bgcolor: '#FEE2E2', p: 2, borderRadius: 2, border: '1px solid #FCA5A5' }}>
                      <Typography sx={{ fontWeight: 700, color: '#991B1B', fontSize: '0.85rem', mb: 0.5 }}>Admin Reason:</Typography>
                      <Typography sx={{ color: '#B91C1C', fontSize: '0.9rem' }}>{record.admin_notes}</Typography>
                    </Box>
                  )}
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

                  {timeline.map((step, index) => (
                    <Box key={index} sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 3, position: 'relative', zIndex: 1 }}>
                      {/* Step dot */}
                      <Box sx={{
                        width: 32, height: 32, borderRadius: '50%', bgcolor: '#fff', flexShrink: 0,
                        border: step.done
                          ? '2px solid #DCFCE7'
                          : step.active
                          ? '2px solid #FDE047'
                          : '2px solid #E2E8F0',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: step.active ? '0 0 0 4px #FEF9C3' : 'none',
                      }}>
                        {step.done
                          ? <CheckCircleIcon sx={{ color: '#22C55E', fontSize: 18 }} />
                          : step.active
                          ? <AccessTimeOutlinedIcon sx={{ color: '#CA8A04', fontSize: 16 }} />
                          : <AccessTimeOutlinedIcon sx={{ color: '#CBD5E1', fontSize: 16 }} />
                        }
                      </Box>
                      <Box sx={{ pt: 0.5 }}>
                        <Typography sx={{
                          fontWeight: 600, fontSize: '0.95rem',
                          color: step.done ? '#0F172A' : step.active ? '#854D0E' : '#94A3B8',
                        }}>
                          {step.title}
                          {step.active && (
                            <Box component="span" sx={{
                              ml: 1, fontSize: '0.7rem', fontWeight: 700, color: '#CA8A04',
                              bgcolor: '#FEF9C3', px: 0.8, py: 0.2, borderRadius: 2, verticalAlign: 'middle',
                            }}>ACTIVE</Box>
                          )}
                        </Typography>
                        <Typography sx={{ color: step.active ? '#A16207' : '#94A3B8', fontSize: '0.8rem' }}>
                          {step.date}
                        </Typography>
                      </Box>
                    </Box>
                  ))}
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
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      bgcolor: '#F8FAFC', borderRadius: 3, p: 2, border: '1px solid #E2E8F0',
                    }}>
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
                      <Box sx={{ bgcolor: doc.statusBg, px: 1.5, py: 0.5, borderRadius: 5 }}>
                        <Typography sx={{ color: doc.statusColor, fontWeight: 700, fontSize: '0.75rem' }}>{doc.statusLabel}</Typography>
                      </Box>
                    </Box>
                  ))}
                </Box>
              </Box>

            </Box>
          </>
        );
      })()}

    </Box>
  );
}
