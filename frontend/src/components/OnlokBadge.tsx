import React from 'react';
import { Box, Tooltip, Typography } from '@mui/material';

export type BadgeTier = 'gold' | 'silver' | 'bronze';

const T = {
  gold: {
    label: 'Gold Verified',
    textColor: '#000000ff',
    src: '/badges/badge-gold.png',
    chipColor: '#C8960C',
  },
  silver: {
    label: 'Silver Verified',
    textColor: '#000000ff',
    src: '/badges/badge-silver.png',
    chipColor: '#9E9E9E',
  },
  bronze: {
    label: 'Bronze Verified',
    textColor: '#000000ff',
    src: '/badges/badge-bronze.png',
    chipColor: '#A0522D',
  },
} as const;

interface OnlokBadgeProps {
  tier: BadgeTier;
  size?: number;
  showLabel?: boolean;
  tooltip?: boolean;
  vendorId?: string;
  businessName?: string;
  sx?: object;
  onClick?: () => void;
}

function OnlokBadgeImage({ tier, size = 120, vendorId, businessName }: { tier: BadgeTier; size?: number; vendorId?: string; businessName?: string }) {
  const p = T[tier];

  return (
    <Box sx={{ position: 'relative', width: size, height: size, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <img src={p.src} alt={`${p.label} Badge`} style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block', filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.18))' }} />
      {(vendorId || businessName) && (
        <Box sx={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 2, pointerEvents: 'none' }}>
          <svg viewBox="0 0 100 103" width="100%" height="100%">
            {vendorId && (
              <>
                {/* The curve: arches upwards in the middle.
                    Adjust the Q (quadratic bezier) control point to change the curve's height. */}
                <path id={`ribbon-curve-${tier}`} d="M 18 62 Q 50 54 82 62" fill="transparent" />
                <text 
                  fill={p.textColor} 
                  fontSize="7.0" 
                  fontWeight="900" 
                  fontFamily="Inter, sans-serif" 
                  letterSpacing="0.05em"
                >
                  <textPath href={`#ribbon-curve-${tier}`} startOffset="50%" textAnchor="middle">
                    {vendorId}
                  </textPath>
                </text>
              </>
            )}
            {businessName && (
              <text 
                x="50" 
                y="67.5" 
                fill={p.textColor} 
                fontSize="5" 
                fontWeight="800" 
                fontFamily="Inter, sans-serif" 
                textAnchor="middle"
                opacity="0.85"
                letterSpacing="0.02em"
              >
                {businessName.toUpperCase().slice(0, 16)}
              </text>
            )}
          </svg>
        </Box>
      )}
    </Box>
  );
}

export function OnlokBadge({ tier, size = 120, showLabel = false, tooltip = true, vendorId, businessName, sx = {}, onClick }: OnlokBadgeProps) {
  const p = T[tier];
  
  const badge = (
    <Box onClick={onClick} sx={{
      display: 'inline-flex', flexDirection: 'column', alignItems: 'center',
      cursor: onClick ? 'pointer' : 'default', userSelect: 'none',
      transition: 'transform 0.2s',
      '&:hover': onClick ? { transform: 'scale(1.07)' } : {},
      ...sx,
    }}>
      <OnlokBadgeImage tier={tier} size={size} vendorId={vendorId} businessName={businessName} />
      {showLabel && (
        <Typography sx={{ mt: 0.8, fontSize: size * 0.11, fontWeight: 800, color: p.chipColor, letterSpacing: '0.04em' }}>
          {p.label}
        </Typography>
      )}
    </Box>
  );

  if (!tooltip) return badge;
  
  return (
    <Tooltip title={<Box sx={{ textAlign: 'center' }}>
      <Typography sx={{ fontWeight: 800, fontSize: '0.85rem' }}>{p.label}</Typography>
      <Typography sx={{ fontSize: '0.72rem', opacity: 0.8 }}>Onlok Verified Sticker</Typography>
    </Box>} arrow placement="top">{badge}</Tooltip>
  );
}

// ─── Corner overlay sticker ───────────────────────────────────────────────────
interface BadgeStickerOverlayProps {
  tier: BadgeTier | null;
  size?: number;
  vendorId?: string;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

export function BadgeStickerOverlay({ tier, size = 52, vendorId, position = 'bottom-right' }: BadgeStickerOverlayProps) {
  if (!tier) return null;
  const pos: Record<string, object> = {
    'top-right':    { top: -size * 0.28, right: -size * 0.28 },
    'top-left':     { top: -size * 0.28, left: -size * 0.28 },
    'bottom-right': { bottom: -size * 0.28, right: -size * 0.28 },
    'bottom-left':  { bottom: -size * 0.28, left: -size * 0.28 },
  };
  return (
    <Box sx={{ position: 'absolute', zIndex: 10, pointerEvents: 'none', ...pos[position] }}>
      <OnlokBadgeImage tier={tier} size={size} vendorId={vendorId} />
    </Box>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
export function getTierFromBadgeType(badge_type: string): BadgeTier | null {
  const t = badge_type.toLowerCase();
  if (t.includes('gold')   || t.includes('premium'))  return 'gold';
  if (t.includes('silver') || t.includes('standard')) return 'silver';
  if (t.includes('bronze') || t.includes('starter'))  return 'bronze';
  if (t.includes('verified'))                          return 'silver';
  return null;
}

export const BADGE_TIERS: Array<{ tier: BadgeTier; name: string; label: string; description: string }> = [
  { tier: 'gold',   name: 'Gold',   label: 'Gold Verified',   description: 'Premium full-verification badge' },
  { tier: 'silver', name: 'Silver', label: 'Silver Verified', description: 'Standard identity-verified badge' },
  { tier: 'bronze', name: 'Bronze', label: 'Bronze Verified', description: 'Starter basic-verified badge' },
];

export default OnlokBadge;
