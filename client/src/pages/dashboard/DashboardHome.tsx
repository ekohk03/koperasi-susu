import {
    Card,
    CardContent,
    Grid,
    Typography,
    Box,
    Avatar,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    Chip
} from '@mui/material';
import {
    TrendingUp,
    TrendingDown,
    People,
    AttachMoney,
    LocalShipping,
    MonetizationOn,
    Build,
    CheckCircle,
    Cancel,
    LocalHospital,
    WbSunny
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import {
    CartesianGrid,
    XAxis,
    YAxis,
    Tooltip as RechartsTooltip,
    ResponsiveContainer,
    Legend,
    BarChart,
    Bar,
    AreaChart,
    Area
} from 'recharts';
import dayjs from 'dayjs';
import { formatRupiah, formatNumber } from '../../utils/format';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export default function DashboardHome() {
    const { data: overview } = useQuery({
        queryKey: ['dashboard-overview'],
        queryFn: async () => (await axios.get('/api/dashboard/overview')).data.data
    });

    const { data: weekly } = useQuery({
        queryKey: ['collections-weekly'],
        queryFn: async () => (await axios.get('/api/dashboard/charts/collections-weekly')).data.data
    });

    const { data: financial } = useQuery({
        queryKey: ['financial-monthly'],
        queryFn: async () => (await axios.get('/api/dashboard/charts/financial-monthly')).data.data
    });

    const { data: recentCollections } = useQuery({
        queryKey: ['recent-collections'],
        queryFn: async () => (await axios.get('/api/dashboard/recent-collections')).data.data
    });

    const { data: recentAttendances } = useQuery({
        queryKey: ['recent-attendances'],
        queryFn: async () => (await axios.get('/api/dashboard/recent-attendances')).data.data
    });

    const { data: recentIncomes } = useQuery({
        queryKey: ['recent-incomes'],
        queryFn: async () => (await axios.get('/api/dashboard/recent-incomes')).data.data
    });

    const { data: recentExpenses } = useQuery({
        queryKey: ['recent-expenses'],
        queryFn: async () => (await axios.get('/api/dashboard/recent-expenses')).data.data
    });

    const { data: recentShipments } = useQuery({
        queryKey: ['recent-shipments'],
        queryFn: async () => (await axios.get('/api/dashboard/recent-shipments')).data.data
    });

    const totalPresentToday = overview?.today?.attendances?.present || 0;
    const totalAbsentToday = overview?.today?.attendances?.leave || 0;
    const totalSickToday = overview?.today?.attendances?.sick || 0;
    const totalHolidayToday = overview?.today?.attendances?.holiday || 0;
    const totalRecordsToday = totalPresentToday + totalAbsentToday + totalSickToday + totalHolidayToday;

    // Prepare financial summary data
    const financialSummary = [
        {
            title: 'Total Pemasukan',
            value: formatRupiah(overview?.monthly?.income?.total_amount || 0),
            icon: <TrendingUp sx={{ color: '#4CAF50' }} />,
            color: '#4CAF50'
        },
        {
            title: 'Total Pengeluaran',
            value: formatRupiah(overview?.monthly?.expenses?.total_amount || 0),
            icon: <TrendingDown sx={{ color: '#F44336' }} />,
            color: '#F44336'
        },
        {
            title: 'Biaya Pemeliharaan',
            value: formatRupiah(overview?.monthly?.maintenance?.total_cost || 0),
            icon: <Build sx={{ color: '#FF9800' }} />,
            color: '#FF9800'
        },
        {
            title: 'Profit',
            value: formatRupiah((overview?.monthly?.income?.total_amount || 0) -
                (overview?.monthly?.expenses?.total_amount || 0) -
                (overview?.monthly?.maintenance?.total_cost || 0)),
            icon: <MonetizationOn sx={{ color: '#2196F3' }} />,
            color: '#2196F3'
        }
    ];

    return (
        <Box sx={{ p: 3 }}>
            {/* Header */}
            <Box sx={{ mb: 4 }}>
                <Typography variant="h4" fontWeight={700} gutterBottom>
                    Dashboard Koperasi Susu
                </Typography>
                <Typography variant="body1" color="text.secondary">
                    Selamat datang! Berikut adalah ringkasan aktivitas koperasi hari ini
                </Typography>
            </Box>

            {/* Key Metrics Cards */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={12} sm={6} md={3}>
                    <Card sx={{
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        color: 'white',
                        height: '100%'
                    }}>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', mr: 2 }}>
                                    <People />
                                </Avatar>
                                <Box>
                                    <Typography variant="body2" sx={{ opacity: 0.8 }}>
                                        Total Pengepul
                                    </Typography>
                                    <Typography
                                        variant="h4"
                                        fontWeight={700}
                                        sx={{
                                            fontSize: { xs: 26, sm: 28, md: 32 },
                                            lineHeight: 1.1,
                                            wordBreak: 'break-word',
                                            whiteSpace: 'normal'
                                        }}
                                    >
                                        {formatNumber(overview?.collectors || 0)}
                                    </Typography>
                                </Box>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                    <Card sx={{
                        background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                        color: 'white',
                        height: '100%'
                    }}>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', mr: 2 }}>
                                    <People />
                                </Avatar>
                                <Box>
                                    <Typography variant="body2" sx={{ opacity: 0.8 }}>
                                        Total Karyawan
                                    </Typography>
                                    <Typography
                                        variant="h4"
                                        fontWeight={700}
                                        sx={{
                                            fontSize: { xs: 26, sm: 28, md: 32 },
                                            lineHeight: 1.1,
                                            wordBreak: 'break-word',
                                            whiteSpace: 'normal'
                                        }}
                                    >
                                        {formatNumber(overview?.employees || 0)}
                                    </Typography>
                                </Box>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                    <Card sx={{
                        background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                        color: 'white',
                        height: '100%'
                    }}>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', mr: 2 }}>
                                    <LocalShipping />
                                </Avatar>
                                <Box>
                                    <Typography variant="body2" sx={{ opacity: 0.8 }}>
                                        Susu Hari Ini
                                    </Typography>
                                    <Typography
                                        variant="h4"
                                        fontWeight={700}
                                        sx={{
                                            fontSize: { xs: 26, sm: 28, md: 32 },
                                            lineHeight: 1.1,
                                            wordBreak: 'break-word',
                                            whiteSpace: 'normal'
                                        }}
                                    >
                                        {formatNumber(overview?.today?.collections?.total_milk || 0)} L
                                    </Typography>
                                </Box>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                    <Card sx={{
                        background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
                        color: 'white',
                        height: '100%'
                    }}>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', mr: 2 }}>
                                    <AttachMoney />
                                </Avatar>
                                <Box>
                                    <Typography variant="body2" sx={{ opacity: 0.8 }}>
                                        Pendapatan Bulan Ini
                                    </Typography>
                                    <Typography
                                        variant="h4"
                                        fontWeight={700}
                                        sx={{
                                            fontSize: { xs: 22, sm: 26, md: 30 },
                                            lineHeight: 1.15,
                                            wordBreak: 'break-word',
                                            whiteSpace: 'normal'
                                        }}
                                    >
                                        {formatRupiah(overview?.monthly?.collections?.total_income || 0)}
                                    </Typography>
                                </Box>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Charts Section */}
            <Grid container spacing={3} sx={{ mb: 4}}>
                {/* Koleksi Susu 7 Hari Terakhir */}
                <Grid item xs={12} lg={8}>
                    <Card sx={{ height: '100%' }}>
                        <CardContent>
                            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                                Trend Koleksi Susu (7 Hari Terakhir)
                            </Typography>
                            <Box sx={{ height: 300, mt: 2 }}>
                                <ResponsiveContainer>
                                    <AreaChart data={(weekly ?? []).map((d: any) => ({
                                        ...d,
                                        date: dayjs(d.date).format('DD/MM'),
                                        total_milk: Number(d.total_milk || 0),
                                        total_income: Number(d.total_income || 0)
                                    }))}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                        <XAxis dataKey="date" />
                                        <YAxis yAxisId="left" />
                                        <YAxis yAxisId="right" orientation="right" />
                                        <RechartsTooltip
                                            formatter={(value: any, name: any) => [
                                                name === 'total_milk' ? `${value} L` : formatRupiah(value),
                                                name === 'total_milk' ? 'Total Susu' : 'Pendapatan'
                                            ]}
                                        />
                                        <Legend />
                                        <Area
                                            yAxisId="left"
                                            type="monotone"
                                            dataKey="total_milk"
                                            stroke="#4CAF50"
                                            fill="#4CAF50"
                                            fillOpacity={0.3}
                                            name="Total Susu"
                                        />
                                        <Area
                                            yAxisId="right"
                                            type="monotone"
                                            dataKey="total_income"
                                            stroke="#2196F3"
                                            fill="#2196F3"
                                            fillOpacity={0.3}
                                            name="Pendapatan"
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Absensi Hari Ini */}
                <Grid item xs={12} lg={4}>
                    <Card sx={{ height: '100%' }}>
                        <CardContent>
                            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                                Absensi Hari Ini
                            </Typography>
                            {/* Check if there is any attendance data for today before rendering the summary */}
                            {totalRecordsToday > 0 ? (
                                <Box>
                                    <Grid container spacing={2} sx={{ mb: 2 }}>
                                        <Grid item xs={6}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', p: 1, bgcolor: '#e8f5e9', borderRadius: 1 }}>
                                                <CheckCircle color="success" />
                                                <Box ml={1}>
                                                    <Typography variant="body2" color="text.secondary">Hadir</Typography>
                                                    <Typography variant="h6" fontWeight={700} color="success.main">{totalPresentToday}</Typography>
                                                </Box>
                                            </Box>
                                        </Grid>
                                        <Grid item xs={6}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', p: 1, bgcolor: '#ffebee', borderRadius: 1 }}>
                                                <Cancel color="error" />
                                                <Box ml={1}>
                                                    <Typography variant="body2" color="text.secondary">Ijin</Typography>
                                                    <Typography variant="h6" fontWeight={700} color="error.main">{totalAbsentToday}</Typography>
                                                </Box>
                                            </Box>
                                        </Grid>
                                        <Grid item xs={6}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', p: 1, bgcolor: '#fff3e0', borderRadius: 1 }}>
                                                <LocalHospital color="warning" />
                                                <Box ml={1}>
                                                    <Typography variant="body2" color="text.secondary">Sakit</Typography>
                                                    <Typography variant="h6" fontWeight={700} color="warning.main">{totalSickToday}</Typography>
                                                </Box>
                                            </Box>
                                        </Grid>
                                        <Grid item xs={6}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', p: 1, bgcolor: '#e3f2fd', borderRadius: 1 }}>
                                                <WbSunny color="info" />
                                                <Box ml={1}>
                                                    <Typography variant="body2" color="text.secondary">Libur</Typography>
                                                    <Typography variant="h6" fontWeight={700} color="info.main">{totalHolidayToday}</Typography>
                                                </Box>
                                            </Box>
                                        </Grid>
                                    </Grid>
                                </Box>
                            ) : (
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 6, bgcolor: 'grey.50', borderRadius: 1, color: 'text.secondary' }}>
                                    <Typography>Belum ada data absensi hari ini</Typography>
                                </Box>
                            )}
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Financial Summary */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
                {financialSummary.map((item, index) => (
                    <Grid item xs={12} sm={6} md={3} key={index}>
                        <Card sx={{
                            borderLeft: `4px solid ${item.color}`,
                            height: '100%'
                        }}>
                            <CardContent>
                                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                    {item.icon}
                                    <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                                        {item.title}
                                    </Typography>
                                </Box>
                                <Typography variant="h6" fontWeight={700} color={item.color}>
                                    {item.value}
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>

            {/* Keuangan Bulanan */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={12}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                                Analisis Keuangan Bulanan
                            </Typography>
                            <Box sx={{ height: 400, mt: 2 }}>
                                <ResponsiveContainer>
                                    <BarChart data={(financial ?? []).map((item: any) => ({
                                        ...item,
                                        month: dayjs().month(item.month - 1).format('MMM'),
                                        income: Number(item.income || 0),
                                        expenses: Number(item.expenses || 0),
                                        maintenance: Number(item.maintenance || 0),
                                        profit: Number(item.profit || 0)
                                    }))}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                        <XAxis dataKey="month" />
                                        <YAxis />
                                        <RechartsTooltip
                                            formatter={(value: any, name: any) => [
                                                formatRupiah(value),
                                                name === 'income' ? 'Pemasukan' :
                                                name === 'expenses' ? 'Pengeluaran' :
                                                name === 'maintenance' ? 'Pemeliharaan' : 'Profit'
                                            ]}
                                        />
                                        <Legend />
                                        <Bar dataKey="income" fill="#4CAF50" name="Pemasukan" />
                                        <Bar dataKey="expenses" fill="#F44336" name="Pengeluaran" />
                                        <Bar dataKey="maintenance" fill="#FF9800" name="Pemeliharaan" />
                                        <Bar dataKey="profit" fill="#2196F3" name="Profit" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Recent Activities */}
            <Grid container spacing={3}>
                {/* Recent Collections */}
                <Grid item xs={12} md={6}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                                Koleksi Susu Terbaru
                            </Typography>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Tanggal</TableCell>
                                        <TableCell>Pengepul</TableCell>
                                        <TableCell align="right">Total (L)</TableCell>
                                        <TableCell align="right">Pendapatan</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {(recentCollections ?? []).slice(0, 5).map((row: any) => (
                                        <TableRow key={row.id} hover>
                                            <TableCell>{dayjs(row.date).format('DD/MM/YYYY')}</TableCell>
                                            <TableCell>{row.collector_name}</TableCell>
                                            <TableCell align="right">{formatNumber(row.total_amount)}</TableCell>
                                            <TableCell align="right">{formatRupiah(row.total_income)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Recent Shipments */}
                <Grid item xs={12} md={6}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                                Pengiriman Terbaru
                            </Typography>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Tanggal</TableCell>
                                        <TableCell>Tujuan</TableCell>
                                        <TableCell align="right">Jumlah (L)</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {(recentShipments ?? []).slice(0, 5).map((row: any) => (
                                        <TableRow key={row.id} hover>
                                            <TableCell>{dayjs(row.date).format('DD/MM/YYYY')}</TableCell>
                                            <TableCell>{row.destination}</TableCell>
                                            <TableCell align="right">{formatNumber(row.amount)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Recent Attendances */}
                <Grid item xs={12} md={6}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                                Absensi Terbaru
                            </Typography>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Tanggal</TableCell>
                                        <TableCell>Karyawan</TableCell>
                                        <TableCell>Status</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {(recentAttendances ?? []).slice(0, 5).map((row: any) => (
                                        <TableRow key={row.id} hover>
                                            <TableCell>{dayjs(row.date).format('DD/MM/YYYY')}</TableCell>
                                            <TableCell>{row.employee_name}</TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={row.status === 'hadir' ? 'Hadir' : row.status === 'ijin' ? 'Ijin' : row.status === 'sakit' ? 'Sakit' : 'Libur'}
                                                    color={row.status === 'hadir' ? 'success' : row.status === 'ijin' ? 'error' : row.status === 'sakit' ? 'warning' : 'info'}
                                                    size="small"
                                                />
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Box>
    );
}