/**
 * BadgeShowcasePage — Preview all 3 Onlok badge tiers side-by-side.
 * Route: /badges  (add to App.tsx if desired, or view via admin)
 */
import { Box, Typography, Paper, Divider, Chip, Avatar } from '@mui/material';
import { OnlokBadge, BadgeStickerOverlay, BADGE_TIERS, type BadgeTier } from '../components/OnlokBadge';

export default function BadgeShowcasePage() {
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#0F172A', py: 8, px: 2 }}>
      {/* Header */}
      <Box sx={{ textAlign: 'center', mb: 8 }}>
        <Chip label="ONLOK BADGE SYSTEM" sx={{ bgcolor: '#1A1FE8', color: '#fff', fontWeight: 800, mb: 3, letterSpacing: 2 }} />
        <Typography variant="h3" sx={{ color: '#fff', fontWeight: 900, mb: 2, letterSpacing: '-0.03em' }}>
          Verified Sticker Tiers
        </Typography>
        <Typography variant="body1" sx={{ color: '#64748B', maxWidth: 480, mx: 'auto' }}>
          Each badge tier is generated fully in SVG code — scalable, always crisp, no image files needed.
        </Typography>
      </Box>

      {/* 3 Tier Cards */}
      <Box sx={{ display: 'flex', gap: 4, justifyContent: 'center', flexWrap: 'wrap', mb: 10 }}>
        {BADGE_TIERS.map(({ tier, name, label, description }) => {
          const colors: Record<BadgeTier, { glow: string; chip: string }> = {
            gold:   { glow: 'rgba(255,215,0,0.25)',    chip: '#FFD700' },
            silver: { glow: 'rgba(192,192,192,0.25)',  chip: '#C0C0C0' },
            bronze: { glow: 'rgba(205,127,50,0.25)',   chip: '#CD7F32' },
          };
          const c = colors[tier];

          return (
            <Paper
              key={tier}
              elevation={0}
              sx={{
                bgcolor: '#1E293B',
                borderRadius: 4,
                p: 5,
                width: 260,
                textAlign: 'center',
                border: '1px solid #334155',
                boxShadow: `0 0 40px ${c.glow}`,
                transition: 'transform 0.2s',
                '&:hover': { transform: 'translateY(-6px)' },
              }}
            >
              {/* Large badge */}
              <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
                <OnlokBadge tier={tier} size={150} tooltip={false} vendorId="ONL-1234" />
              </Box>

              <Chip
                label={name.toUpperCase()}
                size="small"
                sx={{
                  bgcolor: c.chip,
                  color: tier === 'silver' ? '#1A237E' : '#1A0000',
                  fontWeight: 900,
                  letterSpacing: 2,
                  fontSize: '0.7rem',
                  mb: 2,
                }}
              />

              <Typography variant="h6" sx={{ color: '#fff', fontWeight: 800, mb: 1 }}>
                {label}
              </Typography>
              <Typography variant="body2" sx={{ color: '#64748B', lineHeight: 1.6 }}>
                {description}
              </Typography>
            </Paper>
          );
        })}
      </Box>

      <Divider sx={{ borderColor: '#1E293B', mb: 8 }} />

      {/* Size scale demo */}
      <Box sx={{ textAlign: 'center', mb: 8 }}>
        <Typography variant="h5" sx={{ color: '#fff', fontWeight: 800, mb: 1 }}>
          Scales perfectly at any size
        </Typography>
        <Typography variant="body2" sx={{ color: '#64748B', mb: 5 }}>
          Pure SVG — crisp from 24px to 300px+
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 4, flexWrap: 'wrap' }}>
          {[32, 56, 80, 120, 180].map((s) => (
            <Box key={s} sx={{ textAlign: 'center' }}>
              <OnlokBadge tier="gold" size={s} tooltip={false} vendorId="ONL-1234" />
              <Typography sx={{ color: '#475569', fontSize: '0.7rem', mt: 1 }}>{s}px</Typography>
            </Box>
          ))}
        </Box>
      </Box>

      <Divider sx={{ borderColor: '#1E293B', mb: 8 }} />

      {/* Avatar sticker overlay demo */}
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <Typography variant="h5" sx={{ color: '#fff', fontWeight: 800, mb: 1 }}>
          Avatar Sticker Overlay
        </Typography>
        <Typography variant="body2" sx={{ color: '#64748B', mb: 5 }}>
          Drop <code style={{ color: '#60A5FA' }}>&lt;BadgeStickerOverlay&gt;</code> inside any profile card
        </Typography>
        <Box sx={{ display: 'flex', gap: 5, justifyContent: 'center', flexWrap: 'wrap' }}>
          {(['gold', 'silver', 'bronze'] as BadgeTier[]).map((tier) => (
            <Box key={tier} sx={{ textAlign: 'center' }}>
              <Box sx={{ position: 'relative', display: 'inline-block', mb: 5 }}>
                <Avatar
                  sx={{
                    width: 80,
                    height: 80,
                    bgcolor: '#334155',
                    fontSize: '1.8rem',
                    fontWeight: 900,
                    color: '#fff',
                    border: '3px solid #475569',
                  }}
                >
                  AJ
                </Avatar>
                <BadgeStickerOverlay tier={tier} size={52} position="bottom-right" vendorId="ID" />
              </Box>
              <Typography sx={{ color: '#94A3B8', fontSize: '0.8rem', fontWeight: 600 }}>
                {BADGE_TIERS.find((b) => b.tier === tier)?.name} Vendor
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
}
