import { useEffect, useState } from 'react';

// material-ui
import { Box, Card, Grid, Typography } from '@mui/material';

// project imports
import SecondaryAction from 'ui-component/cards/CardSecondaryAction';
import { gridSpacing } from 'store/constant';
import MainCard from 'ui-component/cards/MainCard';

// ==============================|| DEFAULT DASHBOARD ||============================== //
const Dashboard = () => {
    // const [isLoading, setLoading] = useState(true);
    const ColorBox = ({ bgcolor, title, data, dark }) => (
        <>
            <Card sx={{ mb: 3 }}>
                <Box
                    sx={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        py: 4.5,
                        bgcolor,
                        color: dark ? 'grey.800' : '#ffffff'
                    }}
                >
                    {title && (
                        <Typography variant="subtitle1" color="inherit">
                            {title}
                        </Typography>
                    )}
                    {!title && <Box sx={{ p: 1.15 }} />}
                </Box>
            </Card>
            {data && (
                <Grid container justifyContent="space-between" alignItems="center">
                    <Grid item>
                        <Typography variant="subtitle2">{data.label}</Typography>
                    </Grid>
                    <Grid item>
                        <Typography variant="subtitle1" sx={{ textTransform: 'uppercase' }}>
                            {data.color}
                        </Typography>
                    </Grid>
                </Grid>
            )}
        </>
    );
    useEffect(() => {
        // setLoading(false);
    }, []);
    return (
        <MainCard title="Color Palette" secondary={<SecondaryAction link="https://next.material-ui.com/system/palette/" />}>
            <Grid container spacing={gridSpacing}>
                <Grid item xs={12}>
                    <Grid container spacing={gridSpacing}>
                        <Grid item xs={12} sm={6} md={3} lg={3}>
                            <ColorBox bgcolor="primary.light" data={{ label: 'Blue-50', color: '#E3F2FD' }} title="primary.light" dark />
                        </Grid>
                        <Grid item xs={12} sm={6} md={3} lg={3}>
                            <ColorBox bgcolor="primary.200" data={{ label: 'Blue-200', color: '#90CAF9' }} title="primary[200]" dark />
                        </Grid>
                        <Grid item xs={12} sm={6} md={3} lg={3}>
                            <ColorBox bgcolor="primary.main" data={{ label: 'Blue-500', color: '#2196F3' }} title="primary.main" />
                        </Grid>
                        <Grid item xs={12} sm={6} md={3} lg={3}>
                            <ColorBox bgcolor="primary.dark" data={{ label: 'Blue-600', color: '#1E88E5' }} title="primary.dark" />
                        </Grid>
                        {/* <Grid item xs={12} sm={6} md={4} lg={2}>
                            <ColorBox bgcolor="primary.800" data={{ label: 'Blue-800', color: '#1565C0' }} title="primary[800]" />
                        </Grid>
                        <Grid item xs={12} sm={6} md={4} lg={2}>
                            <ColorBox bgcolor="primary.800" data={{ label: 'Blue-800', color: '#1565C0' }} title="primary[800]" />
                        </Grid> */}
                    </Grid>
                </Grid>
            </Grid>
        </MainCard>
    );
};

export default Dashboard;
