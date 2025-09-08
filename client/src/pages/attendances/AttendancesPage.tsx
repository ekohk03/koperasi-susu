import { Add, Delete, Visibility } from '@mui/icons-material';
import { Box, Button, Card, CardContent, Dialog, DialogActions, DialogContent, DialogTitle, Grid, MenuItem, Select, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography, Alert, Chip, Tabs, Tab, Paper, Divider } from '@mui/material';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useEffect, useState } from 'react';
import dayjs from 'dayjs';

interface TabPanelProps {
	children?: React.ReactNode;
	index: number;
	value: number;
}

function TabPanel(props: TabPanelProps) {
	const { children, value, index, ...other } = props;

	return (
		<div
			role="tabpanel"
			hidden={value !== index}
			id={`simple-tabpanel-${index}`}
			aria-labelledby={`simple-tab-${index}`}
			{...other}
		>
			{value === index && (
				<Box sx={{ p: 3 }}>
					{children}
				</Box>
			)}
		</div>
	);
}

export default function AttendancesPage() {
	const [tabValue, setTabValue] = useState(0);
	const [filters, setFilters] = useState({ start_date: '', end_date: '', status: '' });
	const { data, refetch } = useQuery({
		queryKey: ['attendances', filters],
		queryFn: async () => (await axios.get('/api/attendances', { params: filters })).data.data
	});

	const [selectedMonth, setSelectedMonth] = useState(dayjs().month() + 1);
	const [selectedYear, setSelectedYear] = useState(dayjs().year());

	const { data: salaries, refetch: refetchSalaries, isLoading: salariesLoading, error: salariesError } = useQuery({
		queryKey: ['salaries', selectedMonth, selectedYear],
		queryFn: async () => {
			const response = await axios.get('/api/attendances/salaries', { 
				params: { month: selectedMonth, year: selectedYear } 
			});
			return response.data.data;
		},
		enabled: !!selectedMonth && !!selectedYear
	});

	const { data: attendanceStats } = useQuery({
		queryKey: ['attendance-stats', selectedMonth, selectedYear],
		queryFn: async () => {
			const response = await axios.get('/api/attendances/stats/attendance-overview', {
				params: { month: selectedMonth, year: selectedYear }
			});
			return response.data.data;
		},
		enabled: !!selectedMonth && !!selectedYear
	});

	// Update selectedMonth and selectedYear based on filters
	useEffect(() => {
		if (filters.start_date) {
			const startDate = new Date(filters.start_date);
			setSelectedMonth(startDate.getMonth() + 1);
			setSelectedYear(startDate.getFullYear());
		}
	}, [filters.start_date]);

	const [open, setOpen] = useState(false);
	const [employees, setEmployees] = useState<any[]>([]);
	const [form, setForm] = useState<any>({ 
		employee_id: '', 
		date: '', 
		status: 'hadir', 
		notes: ''
	});
	const queryClient = useQueryClient();

	// Dialog hapus per bulan
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [deleteForm, setDeleteForm] = useState<any>({ year: dayjs().year(), month: dayjs().month() + 1 });
	const [availableMonths, setAvailableMonths] = useState<any[]>([]);
	const [selectedMonthData, setSelectedMonthData] = useState<any>(null);



	useEffect(() => {
		axios.get('/api/employees').then(res => setEmployees(res.data.data));
		// Load available months for bulk delete
		axios.get('/api/attendances/stats/available-months').then(res => setAvailableMonths(res.data.data));
	}, []);

	const openCreate = () => {
		setForm({ 
			employee_id: '', 
			date: new Date().toISOString().slice(0,10), 
			status: 'hadir', 
			notes: ''
		});
		setOpen(true);
	};

	const save = async () => {
		try {
			await axios.post('/api/attendances', { ...form, employee_id: Number(form.employee_id) });
			alert('Berhasil menambahkan absensi!');
			setOpen(false);
			queryClient.invalidateQueries({ queryKey: ['attendances'] });
		} catch (err: any) {
			console.error('Save error:', err);
			alert('Gagal menyimpan: ' + (err?.response?.data?.message || err?.message || 'Unknown error'));
		}
	};

	const openDeleteDialog = () => {
		setDeleteForm({ year: dayjs().year(), month: dayjs().month() + 1 });
		setSelectedMonthData(null);
		setDeleteDialogOpen(true);
	};

	const handleMonthChange = () => {
		const monthData = availableMonths.find(m => m.year === deleteForm.year && m.month === deleteForm.month);
		setSelectedMonthData(monthData || null);
	};

	const deleteByMonth = async () => {
		if (!selectedMonthData) return;
		
		if (!confirm(`Anda yakin ingin menghapus ${selectedMonthData.record_count} data absensi untuk bulan ${deleteForm.month}/${deleteForm.year}?\n\nTotal: ${selectedMonthData.record_count} record\nHadir: ${selectedMonthData.present_count} record\nIjin: ${selectedMonthData.absent_count} record\nLibur: ${selectedMonthData.holiday_count} record\nSakit: ${selectedMonthData.sick_count} record\n\nTindakan ini tidak dapat dibatalkan!`)) {
			return;
		}

		try {
			await axios.delete('/api/attendances/bulk/delete-by-month', {
				data: { year: deleteForm.year, month: deleteForm.month }
			});
			
			setDeleteDialogOpen(false);
			queryClient.invalidateQueries({ queryKey: ['attendances'] });
			
			// Refresh available months
			const res = await axios.get('/api/attendances/stats/available-months');
			setAvailableMonths(res.data.data);
			
			alert('Data berhasil dihapus!');
		} catch (error: any) {
			alert('Error: ' + (error.response?.data?.message || error.message || 'Gagal menghapus data'));
		}
	};



	const formatCurrency = (amount: number) => {
		return new Intl.NumberFormat('id-ID', {
			style: 'currency',
			currency: 'IDR'
		}).format(amount);
	};



	return (
		<Box sx={{ height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column' }}>
			<Grid container spacing={3} sx={{ flexShrink: 0 }}>
				<Grid item xs={12}>
					<Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
						<Typography variant="h5" fontWeight={700}>Absensi & Gaji Karyawan</Typography>
						<Box sx={{ display: 'flex', gap: 1 }}>
							<Button variant="contained" startIcon={<Add />} onClick={openCreate}>Tambah</Button>
							<Button variant="outlined" color="error" startIcon={<Delete />} onClick={openDeleteDialog}>Hapus Per Bulan</Button>
						</Box>
					</Box>
				</Grid>

				<Grid item xs={12}>
					<Paper sx={{ width: '100%' }}>
						<Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
							<Tab label="Absensi" />
							<Tab label="Gaji" />
						</Tabs>
					</Paper>
				</Grid>
			</Grid>

			<Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
				<TabPanel value={tabValue} index={0}>
					<Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
						{/* Statistik Absensi */}
						{attendanceStats && (
							<Card sx={{ mb: 2, flexShrink: 0 }}>
								<CardContent>
									<Typography variant="h6" gutterBottom>
										Statistik Absensi - {new Date(selectedYear, selectedMonth - 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
									</Typography>
									<Grid container spacing={3}>
										<Grid item xs={12} sm={6} md={3}>
											<Box textAlign="center">
												<Typography variant="h4" color="success.main" fontWeight="bold">
													{attendanceStats.totalPresent}
												</Typography>
												<Typography variant="body2" color="text.secondary">
													Hadir
												</Typography>
											</Box>
										</Grid>
										<Grid item xs={12} sm={6} md={3}>
											<Box textAlign="center">
												<Typography variant="h4" color="error.main" fontWeight="bold">
													{attendanceStats.totalAbsent}
												</Typography>
												<Typography variant="body2" color="text.secondary">
													Ijin
												</Typography>
											</Box>
										</Grid>
										<Grid item xs={12} sm={6} md={3}>
											<Box textAlign="center">
												<Typography variant="h4" color="warning.main" fontWeight="bold">
													{attendanceStats.totalSick}
												</Typography>
												<Typography variant="body2" color="text.secondary">
													Sakit
												</Typography>
											</Box>
										</Grid>
										<Grid item xs={12} sm={6} md={3}>
											<Box textAlign="center">
												<Typography variant="h4" color="info.main" fontWeight="bold">
													{attendanceStats.totalHoliday}
												</Typography>
												<Typography variant="body2" color="text.secondary">
													Libur
												</Typography>
											</Box>
										</Grid>
									</Grid>
									
									<Divider sx={{ my: 2 }} />
									
									<Grid container spacing={2}>
										<Grid item xs={12} sm={6} md={3}>
											<Box textAlign="center">
												<Typography variant="h5" color="primary.main" fontWeight="bold">
													{attendanceStats.attendanceRate}%
												</Typography>
												<Typography variant="body2" color="text.secondary">
													Tingkat Kehadiran
												</Typography>
												<Typography variant="caption" color="text.secondary">
													({attendanceStats.totalPresent} dari {attendanceStats.totalRecords} record)
												</Typography>
											</Box>
										</Grid>
										<Grid item xs={12} sm={6} md={3}>
											<Box textAlign="center">
												<Typography variant="h5" color="secondary.main" fontWeight="bold">
													{attendanceStats.totalEmployees}
												</Typography>
												<Typography variant="body2" color="text.secondary">
													Total Karyawan
												</Typography>
											</Box>
										</Grid>
										<Grid item xs={12} sm={6} md={3}>
											<Box textAlign="center">
												<Typography variant="h5" color="text.secondary" fontWeight="bold">
													{attendanceStats.totalWorkingDays}
												</Typography>
												<Typography variant="body2" color="text.secondary">
													Hari Kerja
												</Typography>
											</Box>
										</Grid>
										<Grid item xs={12} sm={6} md={3}>
											<Box textAlign="center">
												<Typography variant="h5" color="success.main" fontWeight="bold">
													{attendanceStats.overallAttendanceRate}%
												</Typography>
												<Typography variant="body2" color="text.secondary">
													Kehadiran vs Target
												</Typography>
												<Typography variant="caption" color="text.secondary">
													({attendanceStats.totalPresent} dari {attendanceStats.expectedAttendance} target)
												</Typography>
											</Box>
										</Grid>
									</Grid>
								</CardContent>
							</Card>
						)}
						
						{/* Tabel Absensi */}
						<Card sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
							<CardContent sx={{ p: 0, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
								<Box sx={{ 
									width: '100%', 
									overflow: 'auto',
									flexGrow: 1,
									'&::-webkit-scrollbar': {
										width: '8px',
										height: '8px',
									},
									'&::-webkit-scrollbar-track': {
										background: '#f1f1f1',
										borderRadius: '4px',
									},
									'&::-webkit-scrollbar-thumb': {
										background: '#c1c1c1',
										borderRadius: '4px',
										'&:hover': {
											background: '#a8a8a8',
										},
									},
								}}>
									<Table size="small">
										<TableHead sx={{ position: 'sticky', top: 0, zIndex: 1, backgroundColor: 'white' }}>
											<TableRow>
												<TableCell sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5', minWidth: 120 }}>Tanggal</TableCell>
												<TableCell sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5', minWidth: 150 }}>Nama</TableCell>
												<TableCell sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5', minWidth: 120 }}>Posisi</TableCell>
												<TableCell sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5', minWidth: 100 }}>Status</TableCell>
												<TableCell sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5', minWidth: 200 }}>Catatan</TableCell>
											</TableRow>
										</TableHead>
										<TableBody>
											{(data ?? []).map((row: any) => (
												<TableRow key={row.id} hover>
													<TableCell>{dayjs(row.date).format('DD/MM/YYYY')}</TableCell>
													<TableCell>{row.employee_name}</TableCell>
													<TableCell>{row.employee_position}</TableCell>
													<TableCell>
														<Chip 
															label={row.status} 
															color={
																row.status === 'hadir' ? 'success' :
																row.status === 'sakit' ? 'warning' :
																row.status === 'ijin' ? 'error' : 'default'
															}
															size="small"
														/>
													</TableCell>
													<TableCell>{row.notes}</TableCell>
												</TableRow>
											))}
										</TableBody>
									</Table>
								</Box>
							</CardContent>
						</Card>
					</Box>
				</TabPanel>

				<TabPanel value={tabValue} index={1}>
					<Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
						{/* Filter Controls */}
						<Box sx={{ mb: 2, flexShrink: 0 }}>
							<Typography variant="h6" sx={{ mb: 1 }}>Data Gaji Karyawan</Typography>
							<Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
								<Typography variant="body2">Filter Periode:</Typography>
								<TextField
									label="Bulan"
									type="number"
									size="small"
									value={selectedMonth}
									onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
									inputProps={{ min: 1, max: 12 }}
									sx={{ width: 100 }}
								/>
								<TextField
									label="Tahun"
									type="number"
									size="small"
									value={selectedYear}
									onChange={(e) => setSelectedYear(parseInt(e.target.value))}
									inputProps={{ min: 2020, max: 2030 }}
									sx={{ width: 100 }}
								/>
							</Box>
						</Box>
						
						{/* Tabel Gaji */}
						<Card sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
							<CardContent sx={{ p: 0, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
								{salariesLoading ? (
									<Box sx={{ textAlign: 'center', py: 4 }}>
										<Typography>Loading data gaji...</Typography>
									</Box>
								) : salariesError ? (
									<Alert severity="error">
										Error loading salaries: {salariesError?.message}
									</Alert>
								) : salaries && salaries.length > 0 ? (
									<Box sx={{ 
										width: '100%', 
										overflow: 'auto',
										flexGrow: 1,
										'&::-webkit-scrollbar': {
											width: '8px',
											height: '8px',
										},
										'&::-webkit-scrollbar-track': {
											background: '#f1f1f1',
											borderRadius: '4px',
										},
										'&::-webkit-scrollbar-thumb': {
											background: '#c1c1c1',
											borderRadius: '4px',
											'&:hover': {
												background: '#a8a8a8',
											},
										},
									}}>
										<Table size="small" sx={{ minWidth: 1200 }}>
											<TableHead sx={{ position: 'sticky', top: 0, zIndex: 1, backgroundColor: 'white' }}>
												<TableRow>
													<TableCell align="center" sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5', minWidth: 80 }}>Periode</TableCell>
													<TableCell sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5', minWidth: 150 }}>Nama Karyawan</TableCell>
													<TableCell sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5', minWidth: 120 }}>Posisi</TableCell>
													<TableCell align="right" sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5', minWidth: 120 }}>Gaji Pokok</TableCell>
													<TableCell align="center" sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5', minWidth: 80 }}>Hadir</TableCell>
													<TableCell align="center" sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5', minWidth: 80 }}>Ijin</TableCell>
													<TableCell align="center" sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5', minWidth: 80 }}>Sakit</TableCell>
													<TableCell align="center" sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5', minWidth: 80 }}>Libur</TableCell>
													<TableCell align="center" sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5', minWidth: 100 }}>Total Kerja</TableCell>
													<TableCell align="right" sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5', minWidth: 120 }}>Gaji/Hari</TableCell>
													<TableCell align="right" sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5', minWidth: 120 }}>Total Gaji</TableCell>
													<TableCell align="right" sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5', minWidth: 120 }}>Potongan</TableCell>
													<TableCell align="right" sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5', minWidth: 120 }}>Bonus</TableCell>
													<TableCell align="right" sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5', color: '#1976d2', minWidth: 120 }}>Gaji Akhir</TableCell>
												</TableRow>
											</TableHead>
											<TableBody>
												{salaries.map((row: any, index: number) => (
													<TableRow key={row.id} hover sx={{ backgroundColor: index % 2 === 0 ? '#fafafa' : 'white' }}>
														<TableCell align="center" sx={{ fontWeight: 'medium' }}>{row.month}/{row.year}</TableCell>
														<TableCell sx={{ fontWeight: 'medium' }}>{row.employee_name}</TableCell>
														<TableCell>{row.employee_position}</TableCell>
														<TableCell align="right">{formatCurrency(row.base_salary)}</TableCell>
														<TableCell align="center">
															<Chip 
																label={row.present_days} 
																color="success" 
																size="small" 
																variant="outlined"
															/>
														</TableCell>
														<TableCell align="center">
															<Chip 
																label={row.absent_days} 
																color="error" 
																size="small" 
																variant="outlined"
															/>
														</TableCell>
														<TableCell align="center">
															<Chip 
																label={row.sick_days} 
																color="warning" 
																size="small" 
																variant="outlined"
															/>
														</TableCell>
														<TableCell align="center">
															<Chip 
																label={row.holiday_days} 
																color="info" 
																size="small" 
																variant="outlined"
															/>
														</TableCell>
														<TableCell align="center">
															<Chip 
																label={row.total_working_days} 
																color="primary" 
																size="small"
															/>
														</TableCell>
														<TableCell align="right">{formatCurrency(row.salary_per_day)}</TableCell>
														<TableCell align="right">{formatCurrency(row.total_salary)}</TableCell>
														<TableCell align="right" sx={{ color: row.deductions > 0 ? '#d32f2f' : 'inherit' }}>
															{formatCurrency(row.deductions)}
														</TableCell>
														<TableCell align="right" sx={{ color: row.bonuses > 0 ? '#2e7d32' : 'inherit' }}>
															{formatCurrency(row.bonuses)}
														</TableCell>
														<TableCell align="right">
															<Typography variant="body2" fontWeight="bold" color="primary">
																{formatCurrency(row.final_salary)}
															</Typography>
														</TableCell>
													</TableRow>
												))}
											</TableBody>
										</Table>
									</Box>
								) : (
									<Box sx={{ textAlign: 'center', py: 4 }}>
										<Typography color="text.secondary">
											Tidak ada data gaji untuk periode {selectedMonth}/{selectedYear}
										</Typography>
									</Box>
								)}
							</CardContent>
						</Card>
					</Box>
				</TabPanel>
			</Box>

			<Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
				<DialogTitle>Tambah Absensi</DialogTitle>
				<DialogContent>
					<Select fullWidth value={form.employee_id} onChange={(e) => setForm({ ...form, employee_id: e.target.value })} sx={{ mt: 2 }} displayEmpty>
						<MenuItem value="" disabled>Pilih Karyawan</MenuItem>
						{employees.map((e) => (
							<MenuItem key={e.id} value={e.id}>{e.name} - {e.position}</MenuItem>
						))}
					</Select>
					<TextField label="Tanggal" type="date" InputLabelProps={{ shrink: true }} fullWidth margin="normal" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
					<Select fullWidth value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} sx={{ mt: 2 }}>
						<MenuItem value="hadir">Hadir</MenuItem>
						<MenuItem value="ijin">Ijin</MenuItem>
						<MenuItem value="libur">Libur</MenuItem>
						<MenuItem value="sakit">Sakit</MenuItem>
					</Select>

					<TextField label="Catatan" fullWidth margin="normal" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setOpen(false)}>Batal</Button>
					<Button variant="contained" onClick={save}>Simpan</Button>
				</DialogActions>
			</Dialog>

			{/* Dialog Hapus Per Bulan */}
			<Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} fullWidth maxWidth="sm">
				<DialogTitle>Hapus Data Absensi Per Bulan</DialogTitle>
				<DialogContent>
					<Alert severity="warning" sx={{ mb: 2 }}>
						<strong>Peringatan!</strong> Tindakan ini akan menghapus semua data absensi untuk bulan yang dipilih. 
						Tindakan ini tidak dapat dibatalkan!
					</Alert>
					
					<Grid container spacing={2}>
						<Grid item xs={6}>
							<TextField
								label="Tahun"
								type="number"
								fullWidth
								margin="normal"
								value={deleteForm.year}
								onChange={(e) => {
									setDeleteForm({ ...deleteForm, year: parseInt(e.target.value) });
									setTimeout(handleMonthChange, 100);
								}}
								inputProps={{ min: 2020, max: 2030 }}
							/>
						</Grid>
						<Grid item xs={6}>
							<TextField
								label="Bulan"
								type="number"
								fullWidth
								margin="normal"
								value={deleteForm.month}
								onChange={(e) => {
									setDeleteForm({ ...deleteForm, month: parseInt(e.target.value) });
									setTimeout(handleMonthChange, 100);
								}}
								inputProps={{ min: 1, max: 12 }}
							/>
						</Grid>
					</Grid>

					{selectedMonthData && (
						<Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
							<Typography variant="h6" gutterBottom>
								Data untuk {deleteForm.month}/{deleteForm.year}
							</Typography>
							<Grid container spacing={2}>
								<Grid item xs={3}>
									<Typography variant="body2" color="text.secondary">Total Record</Typography>
									<Typography variant="h6" color="primary">
										{selectedMonthData.record_count}
									</Typography>
								</Grid>
								<Grid item xs={3}>
									<Typography variant="body2" color="text.secondary">Hadir</Typography>
									<Typography variant="h6" color="success.main">
										{selectedMonthData.present_count}
									</Typography>
								</Grid>
								<Grid item xs={3}>
									<Typography variant="body2" color="text.secondary">Ijin</Typography>
									<Typography variant="h6" color="warning.main">
										{selectedMonthData.absent_count}
									</Typography>
								</Grid>
								<Grid item xs={3}>
									<Typography variant="body2" color="text.secondary">Libur</Typography>
									<Typography variant="h6" color="info.main">
										{selectedMonthData.holiday_count}
									</Typography>
								</Grid>
								<Grid item xs={3}>
									<Typography variant="body2" color="text.secondary">Sakit</Typography>
									<Typography variant="h6" color="error.main">
										{selectedMonthData.sick_count}
									</Typography>
								</Grid>
							</Grid>
						</Box>
					)}

					{!selectedMonthData && deleteForm.year && deleteForm.month && (
						<Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
							<Typography color="text.secondary">
								Tidak ada data untuk bulan {deleteForm.month}/{deleteForm.year}
							</Typography>
						</Box>
					)}

					<Box sx={{ mt: 2 }}>
						<Typography variant="body2" color="text.secondary" gutterBottom>
							Bulan yang tersedia:
						</Typography>
						<Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
							{availableMonths.slice(0, 10).map((month: any) => (
								<Chip
									key={`${month.year}-${month.month}`}
									label={`${month.month}/${month.year} (${month.record_count})`}
									variant="outlined"
									size="small"
									onClick={() => {
										setDeleteForm({ year: month.year, month: month.month });
										setSelectedMonthData(month);
									}}
									color={month.year === deleteForm.year && month.month === deleteForm.month ? 'primary' : 'default'}
								/>
							))}
						</Box>
					</Box>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setDeleteDialogOpen(false)}>Batal</Button>
					<Button 
						variant="contained" 
						color="error" 
						onClick={deleteByMonth}
						disabled={!selectedMonthData}
					>
						Hapus Data
					</Button>
				</DialogActions>
			</Dialog>


		</Box>
	);
}
