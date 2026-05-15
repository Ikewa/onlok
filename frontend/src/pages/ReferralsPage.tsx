import { Box, Typography, Button, Paper, Divider } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import GroupOutlinedIcon from '@mui/icons-material/GroupOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutlined';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined';
import AccessTimeFilledIcon from '@mui/icons-material/AccessTimeFilled';
import CancelIcon from '@mui/icons-material/Cancel';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { useState, useEffect } from 'react';
import axiosInstance from '../api/axiosInstance';

const data = [
  { name: 'Mon', uv: 180 },
  { name: 'Tue', uv: 300 },
  { name: 'Wed', uv: 230 },
  { name: 'Thu', uv: 80 },
  { name: 'Fri', uv: 210 },
  { name: 'Sat', uv: 215 },
  { name: 'Sun', uv: 180 },
];

export default function ReferralsPage() {
  const { user } = useAuth();
  
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axiosInstance.get('/users/referrals')
      .then(res => setData(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);
  
  const referralLink = `Onlok.Net/Ref/${user?.first_name ?? 'User'}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(referralLink);
    toast.success('Referral link copied!');
  };

  return (
    <Box sx={{ p: { xs: 2, md: 5 }, maxWidth: 1100, width: '100%', flexGrow: 1, fontFamily: 'Inter, sans-serif' }}>
      
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography sx={{ fontWeight: 800, fontSize: { xs: '1.5rem', md: '1.8rem' }, color: '#0F172A', mb: 0.5 }}>
          Referrals & Rewards
        </Typography>
        <Typography sx={{ color: '#64748B', fontSize: '0.95rem' }}>
          Share your link and earn rewards for every verified referral
        </Typography>
      </Box>

      {/* Referral Banner */}
      <Box sx={{ bgcolor: '#F0F5FF', borderRadius: 3, p: { xs: 2.5, md: 4 }, mb: 4 }}>
        <Typography sx={{ fontSize: '0.9rem', color: '#475569', mb: 1.5, fontWeight: 500 }}>
          Earn Rewards By Referring Others
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box sx={{ bgcolor: '#93A3DF', borderRadius: 2, px: 3, py: 1.8, display: 'flex', alignItems: 'center', width: '100%' }}>
            <Typography sx={{ color: '#1E293B', fontSize: '0.95rem', fontWeight: 500, opacity: 0.9 }}>
              Your Referral Link: {referralLink}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Button 
              onClick={copyToClipboard}
              variant="outlined" 
              startIcon={<ContentCopyIcon sx={{ fontSize: 18 }} />} 
              sx={{ borderColor: '#3B82F6', color: '#3B82F6', borderRadius: 2, textTransform: 'none', fontWeight: 600, px: 3, py: 1, bgcolor: '#fff', '&:hover': { bgcolor: '#F8FAFC' } }}
            >
              Copy Link
            </Button>
            <Button 
              variant="contained" 
              startIcon={<WhatsAppIcon />} 
              sx={{ bgcolor: '#84CC16', color: '#fff', borderRadius: 2, textTransform: 'none', fontWeight: 600, px: 3, py: 1, boxShadow: 'none', '&:hover': { bgcolor: '#65A30D' } }}
            >
              Share On Whatsapp
            </Button>
          </Box>
        </Box>
      </Box>

      {/* Stats Cards */}
      <Box sx={{ display: 'flex', gap: 3, mb: 5, flexWrap: 'wrap' }}>
        <Box sx={{ flex: '1 1 200px', bgcolor: '#F8FAFC', borderRadius: 3, p: 3, border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <GroupOutlinedIcon sx={{ color: '#3B82F6', fontSize: 28, mb: 1 }} />
          <Typography sx={{ fontWeight: 800, fontSize: '1.8rem', color: '#0F172A', lineHeight: 1 }}>{data?.stats?.total ?? 0}</Typography>
          <Typography sx={{ color: '#64748B', fontSize: '0.8rem', fontWeight: 500, mt: 0.5 }}>Referrals</Typography>
        </Box>
        <Box sx={{ flex: '1 1 200px', bgcolor: '#F8FAFC', borderRadius: 3, p: 3, border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <CheckCircleOutlineIcon sx={{ color: '#22C55E', fontSize: 28, mb: 1 }} />
          <Typography sx={{ fontWeight: 800, fontSize: '1.8rem', color: '#0F172A', lineHeight: 1 }}>{data?.stats?.verified ?? 0}</Typography>
          <Typography sx={{ color: '#64748B', fontSize: '0.8rem', fontWeight: 500, mt: 0.5 }}>Verified</Typography>
        </Box>
        <Box sx={{ flex: '1 1 200px', bgcolor: '#FEF9C3', borderRadius: 3, p: 3, border: '1px solid #FEF08A', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <AccountBalanceWalletOutlinedIcon sx={{ color: '#D97706', fontSize: 28, mb: 1 }} />
          <Typography sx={{ fontWeight: 800, fontSize: '1.8rem', color: '#92400E', lineHeight: 1 }}>₦{(data?.stats?.earnings ?? 0).toLocaleString()}</Typography>
          <Typography sx={{ color: '#B45309', fontSize: '0.8rem', fontWeight: 600, mt: 0.5 }}>Earnings</Typography>
        </Box>
      </Box>

      {/* Bottom Section: Activity and Chart */}
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 4 }}>
        
        {/* Recent Activity */}
        <Box sx={{ flex: 1 }}>
          <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: '#0F172A', mb: 2 }}>
            Recent Activity
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {data?.recentActivity?.length > 0 ? data.recentActivity.map((item: any, index: number) => {
              let color = '#F59E0B'; // Pending
              let icon = <AccessTimeFilledIcon sx={{ color: '#F59E0B', fontSize: 18 }}/>;
              if (item.status === 'verified') {
                color = '#22C55E';
                icon = <CheckCircleIcon sx={{ color: '#22C55E', fontSize: 18 }}/>;
              } else if (item.status === 'rejected') {
                color = '#EF4444';
                icon = <CancelIcon sx={{ color: '#EF4444', fontSize: 18 }}/>;
              }

              return (
              <Box key={index} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: '#F8FAFC', p: 2, borderRadius: 2, border: '1px solid #E2E8F0' }}>
                <Typography sx={{ fontWeight: 600, fontSize: '0.95rem', color: '#0F172A' }}>{item.first_name} {item.last_name?.charAt(0)}.</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                  <Typography sx={{ color: color, fontWeight: 700, fontSize: '0.8rem', textTransform: 'capitalize' }}>{item.status}</Typography>
                  {icon}
                </Box>
              </Box>
            )}) : (
              <Typography sx={{ color: '#64748B', fontSize: '0.9rem', fontStyle: 'italic' }}>No recent activity yet.</Typography>
            )}
          </Box>
        </Box>

        {/* Website Traffic Chart */}
        <Box sx={{ flex: 2 }}>
          <Paper elevation={0} sx={{ border: '1px solid #E2E8F0', borderRadius: 3, p: 3, height: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 4, justifyContent: 'center' }}>
              <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: '#8B5CF6' }} />
              <Typography sx={{ color: '#64748B', fontSize: '0.85rem' }}>Visitors</Typography>
              <Typography sx={{ fontWeight: 600, fontSize: '1.1rem', color: '#0F172A', ml: 2 }}>Website Traffic</Typography>
            </Box>
            
            <Box sx={{ width: '100%', height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data?.chartData || []} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={{ stroke: '#94A3B8' }}
                    tickLine={true}
                    tick={{ fill: '#64748B', fontSize: 12 }}
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748B', fontSize: 12 }}
                    dx={-10}
                    ticks={[0, 100, 200, 300, 400]}
                    domain={[0, 400]}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="uv" 
                    stroke="#8B5CF6" 
                    strokeWidth={2}
                    dot={{ fill: '#fff', stroke: '#8B5CF6', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Box>
      </Box>

    </Box>
  );
}
