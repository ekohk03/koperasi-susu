import { 
	Card, 
	CardContent, 
	Grid, 
	Typography, 
	Box, 
	Avatar, 
	LinearProgress,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableRow,
	Paper,
	Chip,
	IconButton,
	Tooltip
} from '@mui/material';
import { 
	TrendingUp, 
	TrendingDown, 
	People, 
	AttachMoney, 
	LocalShipping, 
	Assessment,
	Visibility,
	CalendarToday,
	MonetizationOn,
	Build,
	Receipt
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { 
	LineChart, 
	Line, 
	CartesianGrid, 
	XAxis, 
	YAxis, 
	Tooltip as RechartsTooltip, 
	ResponsiveContainer, 
	Legend, 
	BarChart, 
	Bar,
	PieChart,
	Pie,
	Cell,
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

	// Calculate attendance percentage
	const totalAttendance = (overview?.today?.attendances?.present || 0) + 
		(overview?.today?.attendances?.leave || 0) + 
		(overview?.today?.attendances?.holiday || 0);
	const attendancePercentage = totalAttendance > 0 ? 
		((overview?.today?.attendances?.present || 0) / totalAttendance) * 100 : 0;

	// Calculate profit margin
	const totalIncome = overview?.monthly?.income?.total_amount || 0;
	const totalExpenses = (overview?.monthly?.expenses?.total_amount || 0) + 
		(overview?.monthly?.maintenance?.total_cost || 0);
	const profitMargin = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0;

	// Prepare attendance data for pie chart
	const attendanceData = [
		{ name: 'Hadir', value: overview?.today?.attendances?.present || 0, color: '#4CAF50' },
		{ name: 'Ijin', value: overview?.today?.attendances?.leave || 0, color: '#FF9800' },
		{ name: 'Libur', value: overview?.today?.attendances?.holiday || 0, color: '#2196F3' }
	].filter(item => item.value > 0);

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
			<Grid container spacing={3} sx={{ mb: 4 }}>
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
											formatter={(value, name) => [
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
							{(() => {
								const present = overview?.today?.attendances?.present || 0;
								const leave = overview?.today?.attendances?.leave || 0;
								const holiday = overview?.today?.attendances?.holiday || 0;
								const hasData = (present + leave + holiday) > 0 && attendanceData.length > 0;
								return (
									<>
										<Box sx={{ height: hasData ? 240 : 'auto', mt: 1 }}>
											{hasData ? (
												<ResponsiveContainer>
													<PieChart>
														<Pie
															data={attendanceData}
															cx="50%"
															cy="50%"
															labelLine={false}
															label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
															outerRadius={80}
															fill="#8884d8"
															dataKey="value"
														>
															{attendanceData.map((entry, index) => (
																<Cell key={`cell-${index}`} fill={entry.color} />
															))}
														</Pie>
														<RechartsTooltip />
													</PieChart>
												</ResponsiveContainer>
											) : (
												<Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 6, bgcolor: 'grey.50', borderRadius: 1, color: 'text.secondary' }}>
													<Typography>Belum ada data absensi hari ini</Typography>
												</Box>
											)}
										</Box>

										{/* Summary chips */}
										<Box sx={{ display: 'flex', gap: 1, mt: 2, flexWrap: 'wrap' }}>
											<Chip label={`Hadir: ${present}`} color="success" size="small" />
											<Chip label={`Ijin: ${leave}`} color="warning" size="small" />
											<Chip label={`Libur: ${holiday}`} color="info" size="small" />
										</Box>

										{/* Progress only when data exists */}
										{(present + leave + holiday) > 0 ? (
											<Box sx={{ mt: 2 }}>
												<Typography variant="body2" color="text.secondary" gutterBottom>
													Tingkat Kehadiran
												</Typography>
												<LinearProgress 
													variant="determinate" 
													value={attendancePercentage} 
													sx={{ height: 8, borderRadius: 4 }} 
												/>
												<Typography variant="body2" sx={{ mt: 1, fontWeight: 600 }}>
													{attendancePercentage.toFixed(1)}%
												</Typography>
											</Box>
										) : null}
									</>
								);
							})()}
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
											formatter={(value, name) => [
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
													label={row.status === 'hadir' ? 'Hadir' : row.status === 'ijin' ? 'Ijin' : 'Libur'}
													color={row.status === 'hadir' ? 'success' : row.status === 'ijin' ? 'warning' : 'info'}
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
