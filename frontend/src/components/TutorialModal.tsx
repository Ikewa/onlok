import { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, Box, Stepper, Step, StepLabel } from '@mui/material';

const steps = [
  {
    label: 'Welcome to Onlok',
    description: 'This is your dashboard where you can manage your verified vendor profile.',
  },
  {
    label: 'Profile Link',
    description: 'Share your profile link with customers to prove you are a verified and trusted vendor.',
  },
  {
    label: 'QR Code',
    description: 'Download your verification QR code and place it on your physical products, store front, or social media pages.',
  },
  {
    label: 'Subscription',
    description: 'Keep your subscription active to maintain your verified badge and customer trust.',
  },
];

export default function TutorialModal() {
  const [open, setOpen] = useState(false);
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const hasSeenTutorial = localStorage.getItem('onlok_tutorial_seen');
    if (!hasSeenTutorial) {
      setOpen(true);
    }
  }, []);

  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleClose = () => {
    localStorage.setItem('onlok_tutorial_seen', 'true');
    setOpen(false);
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 800 }}>Welcome to Your Onlok Dashboard!</DialogTitle>
      <DialogContent>
        <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 4, mt: 2 }}>
          {steps.map((step) => (
            <Step key={step.label}>
              <StepLabel>{step.label}</StepLabel>
            </Step>
          ))}
        </Stepper>
        <Box sx={{ minHeight: 100, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <Typography variant="h6" gutterBottom fontWeight={600}>
            {steps[activeStep].label}
          </Typography>
          <Typography color="text.secondary">
            {steps[activeStep].description}
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={handleClose} sx={{ color: 'text.secondary' }}>Skip</Button>
        <Box sx={{ flexGrow: 1 }} />
        <Button disabled={activeStep === 0} onClick={handleBack} sx={{ mr: 1 }}>
          Back
        </Button>
        {activeStep === steps.length - 1 ? (
          <Button variant="contained" onClick={handleClose} sx={{ bgcolor: '#0029FF', '&:hover': { bgcolor: '#001ECC' } }}>
            Get Started
          </Button>
        ) : (
          <Button variant="contained" onClick={handleNext} sx={{ bgcolor: '#0029FF', '&:hover': { bgcolor: '#001ECC' } }}>
            Next
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
