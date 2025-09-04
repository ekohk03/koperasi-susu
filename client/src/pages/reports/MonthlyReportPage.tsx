import { Download, Visibility, Assessment } from '@mui/icons-material';
import { 
	Box, 
	Button, 
	Card, 
	CardContent, 
	Grid, 
	Typography, 
	TextField, 
	Select, 
	MenuItem, 
	Table, 
	TableBody, 
	TableCell, 
	TableHead, 
	TableRow, 
	Paper,
	Divider,
	Alert,
	Chip
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useState, useEffect } from 'react';
import dayjs from 'dayjs';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export default function MonthlyReportPage() {
	const [selectedMonth, setSelectedMonth] = useState(dayjs().month() + 1);
	const [selectedYear, setSelectedYear] = useState(dayjs().year());
	const [availableMonths, setAvailableMonths] = useState<any[]>([]);

	const { data: reportData, refetch } = useQuery({
		queryKey: ['monthly-report', selectedMonth, selectedYear],
		queryFn: async () => {
			const response = await axios.get('/api/reports/monthly', {
				params: { month: selectedMonth, year: selectedYear }
			});
			return response.data.data;
		},
		enabled: false
	});

	useEffect(() => {
		// Load available months
		axios.get('/api/reports/available-months').then(res => {
			setAvailableMonths(res.data.data);
		});
	}, []);

	useEffect(() => {
		if (selectedMonth && selectedYear) {
			refetch();
		}
	}, [selectedMonth, selectedYear, refetch]);

	const formatCurrency = (amount: number) => {
		return new Intl.NumberFormat('id-ID', {
			style: 'currency',
			currency: 'IDR'
		}).format(amount);
	};

	const exportToPDF = () => {
		if (!reportData) return;

		const doc = new jsPDF();
		const pageWidth = doc.internal.pageSize.width;
		const margin = 20;
		const contentWidth = pageWidth - (margin * 2);
		let yPosition = margin;

		// Header
		doc.setFontSize(20);
		doc.setFont('helvetica', 'bold');
		doc.text('LAPORAN BULANAN', pageWidth / 2, yPosition, { align: 'center' });
		yPosition += 10;

		doc.setFontSize(14);
		doc.setFont('helvetica', 'normal');
		doc.text(`Banyu Makmur - ${reportData.period.monthName} ${reportData.period.year}`, pageWidth / 2, yPosition, { align: 'center' });
		yPosition += 20;

		// Summary Section
		doc.setFontSize(16);
		doc.setFont('helvetica', 'bold');
		doc.text('RINGKASAN KEUANGAN', margin, yPosition);
		yPosition += 10;

		doc.setFontSize(12);
		doc.setFont('helvetica', 'normal');
		doc.text(`Total Pendapatan: ${formatCurrency(reportData.summary.totalIncome)}`, margin, yPosition);
		yPosition += 7;
		doc.text(`Nilai Susu: ${formatCurrency(reportData.summary.totalMilkValue)}`, margin, yPosition);
		yPosition += 7;
		doc.text(`Total Pengeluaran: ${formatCurrency(reportData.summary.totalExpense)}`, margin, yPosition);
		yPosition += 7;
		doc.text(`Total Pemeliharaan: ${formatCurrency(reportData.summary.totalMaintenance)}`, margin, yPosition);
		yPosition += 7;
		doc.text(`Total Gaji: ${formatCurrency(reportData.summary.totalSalary)}`, margin, yPosition);
		yPosition += 10;

		doc.setFontSize(14);
		doc.setFont('helvetica', 'bold');
		doc.text(`PENDAPATAN BERSIH: ${formatCurrency(reportData.summary.netIncome)}`, margin, yPosition);
		yPosition += 20;

		// Milk Collections Table
		if (reportData.milkCollections.summary.length > 0) {
			doc.setFontSize(16);
			doc.setFont('helvetica', 'bold');
			doc.text('KOLEKSI SUSU', margin, yPosition);
			yPosition += 10;

			const collectionsData = reportData.milkCollections.summary.map((item: any) => [
				item.collector_name,
				`${item.total_amount} L`,
				formatCurrency(item.avg_price),
				formatCurrency(item.total_value),
				`${item.collection_days} hari`
			]);

			(doc as any).autoTable({
				startY: yPosition,
				head: [['Pengepul', 'Total (L)', 'Harga/L', 'Total Nilai', 'Hari']],
				body: collectionsData,
				theme: 'grid',
				headStyles: { fillColor: [41, 128, 185] },
				margin: { left: margin, right: margin }
			});

			yPosition = (doc as any).lastAutoTable.finalY + 10;
		}

		// Attendance Table
		if (reportData.attendance.length > 0) {
			doc.setFontSize(16);
			doc.setFont('helvetica', 'bold');
			doc.text('ABSENSI KARYAWAN', margin, yPosition);
			yPosition += 10;

			const attendanceData = reportData.attendance.map((item: any) => [
				item.employee_name,
				item.employee_position,
				item.present_days,
				item.absent_days,
				item.sick_days,
				item.holiday_days,
				item.total_days
			]);

			(doc as any).autoTable({
				startY: yPosition,
				head: [['Nama', 'Posisi', 'Hadir', 'Ijin', 'Sakit', 'Libur', 'Total']],
				body: attendanceData,
				theme: 'grid',
				headStyles: { fillColor: [41, 128, 185] },
				margin: { left: margin, right: margin }
			});

			yPosition = (doc as any).lastAutoTable.finalY + 10;
		}

		// Salaries Table
		if (reportData.salaries.length > 0) {
			doc.setFontSize(16);
			doc.setFont('helvetica', 'bold');
			doc.text('GAJI KARYAWAN', margin, yPosition);
			yPosition += 10;

			const salariesData = reportData.salaries.map((item: any) => [
				item.employee_name,
				item.employee_position,
				formatCurrency(item.base_salary),
				item.total_working_days,
				formatCurrency(item.final_salary)
			]);

			(doc as any).autoTable({
				startY: yPosition,
				head: [['Nama', 'Posisi', 'Gaji Pokok', 'Hari Kerja', 'Gaji Akhir']],
				body: salariesData,
				theme: 'grid',
				headStyles: { fillColor: [41, 128, 185] },
				margin: { left: margin, right: margin }
			});

			yPosition = (doc as any).lastAutoTable.finalY + 10;
		}

		// Incomes Table
		if (reportData.incomes.items.length > 0) {
			doc.setFontSize(16);
			doc.setFont('helvetica', 'bold');
			doc.text('PENDAPATAN', margin, yPosition);
			yPosition += 10;

			const incomesData = reportData.incomes.items.map((item: any) => [
				item.source,
				formatCurrency(item.amount),
				dayjs(item.date).format('DD/MM/YYYY'),
				item.description
			]);

			(doc as any).autoTable({
				startY: yPosition,
				head: [['Sumber', 'Jumlah', 'Tanggal', 'Keterangan']],
				body: incomesData,
				theme: 'grid',
				headStyles: { fillColor: [41, 128, 185] },
				margin: { left: margin, right: margin }
			});

			yPosition = (doc as any).lastAutoTable.finalY + 10;
		}

		// Expenses Table
		if (reportData.expenses.items.length > 0) {
			doc.setFontSize(16);
			doc.setFont('helvetica', 'bold');
			doc.text('PENGELUARAN', margin, yPosition);
			yPosition += 10;

			const expensesData = reportData.expenses.items.map((item: any) => [
				item.category,
				formatCurrency(item.amount),
				dayjs(item.date).format('DD/MM/YYYY'),
				item.description
			]);

			(doc as any).autoTable({
				startY: yPosition,
				head: [['Kategori', 'Jumlah', 'Tanggal', 'Keterangan']],
				body: expensesData,
				theme: 'grid',
				headStyles: { fillColor: [41, 128, 185] },
				margin: { left: margin, right: margin }
			});

			yPosition = (doc as any).lastAutoTable.finalY + 10;
		}

		// Footer
		const totalPages = doc.getNumberOfPages();
		for (let i = 1; i <= totalPages; i++) {
			doc.setPage(i);
			doc.setFontSize(10);
			doc.setFont('helvetica', 'normal');
			doc.text(`Halaman ${i} dari ${totalPages}`, pageWidth / 2, doc.internal.pageSize.height - 10, { align: 'center' });
		}

		// Save PDF
		doc.save(`Laporan_Bulanan_${reportData.period.monthName}_${reportData.period.year}.pdf`);
	};

	return (
		<Grid container spacing={3}>
			<Grid item xs={12}>
				<Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
					<Typography variant="h5" fontWeight={700}>Laporan Bulanan</Typography>
					<Box sx={{ display: 'flex', gap: 1 }}>
						<Button 
							variant="contained" 
							startIcon={<Download />} 
							onClick={exportToPDF}
							disabled={!reportData}
						>
							Ekspor PDF
						</Button>
					</Box>
				</Box>
			</Grid>

			<Grid item xs={12}>
				<Card>
					<CardContent>
						<Grid container spacing={2} alignItems="center">
							<Grid item xs={12} sm={6} md={3}>
								<TextField
									select
									fullWidth
									label="Bulan"
									value={selectedMonth}
									onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
								>
									{Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
										<MenuItem key={month} value={month}>
											{new Date(2024, month - 1).toLocaleDateString('id-ID', { month: 'long' })}
										</MenuItem>
									))}
								</TextField>
							</Grid>
							<Grid item xs={12} sm={6} md={3}>
								<TextField
									select
									fullWidth
									label="Tahun"
									value={selectedYear}
									onChange={(e) => setSelectedYear(parseInt(e.target.value))}
								>
									{Array.from({ length: 5 }, (_, i) => dayjs().year() - 2 + i).map((year) => (
										<MenuItem key={year} value={year}>
											{year}
										</MenuItem>
									))}
								</TextField>
							</Grid>
							<Grid item xs={12} sm={6} md={3}>
								<Button 
									variant="outlined" 
									startIcon={<Visibility />}
									onClick={() => refetch()}
									fullWidth
								>
									Tampilkan
								</Button>
							</Grid>
						</Grid>
					</CardContent>
				</Card>
			</Grid>

			{reportData && (
				<>
					{/* Summary Cards */}
					<Grid item xs={12}>
						<Grid container spacing={3}>
							<Grid item xs={12} sm={6} md={3}>
								<Card sx={{ bgcolor: 'success.light', color: 'white' }}>
									<CardContent>
										<Typography variant="h6" gutterBottom>Total Pendapatan</Typography>
										<Typography variant="h4" fontWeight="bold">
											{formatCurrency(reportData.summary.totalIncome)}
										</Typography>
									</CardContent>
								</Card>
							</Grid>
							<Grid item xs={12} sm={6} md={3}>
								<Card sx={{ bgcolor: 'info.light', color: 'white' }}>
									<CardContent>
										<Typography variant="h6" gutterBottom>Nilai Susu</Typography>
										<Typography variant="h4" fontWeight="bold">
											{formatCurrency(reportData.summary.totalMilkValue)}
										</Typography>
									</CardContent>
								</Card>
							</Grid>
							<Grid item xs={12} sm={6} md={3}>
								<Card sx={{ bgcolor: 'error.light', color: 'white' }}>
									<CardContent>
										<Typography variant="h6" gutterBottom>Total Pengeluaran</Typography>
										<Typography variant="h4" fontWeight="bold">
											{formatCurrency(reportData.summary.totalExpense)}
										</Typography>
									</CardContent>
								</Card>
							</Grid>
							<Grid item xs={12} sm={6} md={3}>
								<Card sx={{ bgcolor: 'warning.light', color: 'white' }}>
									<CardContent>
										<Typography variant="h6" gutterBottom>Pendapatan Bersih</Typography>
										<Typography variant="h4" fontWeight="bold">
											{formatCurrency(reportData.summary.netIncome)}
										</Typography>
									</CardContent>
								</Card>
							</Grid>
							<Grid item xs={12} sm={6} md={3}>
								<Card sx={{ bgcolor: 'info.light', color: 'white' }}>
									<CardContent>
										<Typography variant="h6" gutterBottom>Total Gaji</Typography>
										<Typography variant="h4" fontWeight="bold">
											{formatCurrency(reportData.summary.totalSalary)}
										</Typography>
									</CardContent>
								</Card>
							</Grid>
							<Grid item xs={12} sm={6} md={3}>
								<Card sx={{ bgcolor: 'secondary.light', color: 'white' }}>
									<CardContent>
										<Typography variant="h6" gutterBottom>Total Pemeliharaan</Typography>
										<Typography variant="h4" fontWeight="bold">
											{formatCurrency(reportData.summary.totalMaintenance)}
										</Typography>
									</CardContent>
								</Card>
							</Grid>
						</Grid>
					</Grid>

					{/* Milk Collections */}
					{reportData.milkCollections.summary.length > 0 && (
						<Grid item xs={12}>
							<Card>
								<CardContent>
									<Typography variant="h6" gutterBottom>
										<Assessment sx={{ mr: 1, verticalAlign: 'middle' }} />
										Koleksi Susu - {reportData.period.monthName} {reportData.period.year}
									</Typography>
									<Table>
										<TableHead>
											<TableRow>
												<TableCell>Pengepul</TableCell>
												<TableCell align="right">Total (L)</TableCell>
												<TableCell align="right">Harga/L</TableCell>
												<TableCell align="right">Total Nilai</TableCell>
												<TableCell align="right">Hari</TableCell>
											</TableRow>
										</TableHead>
										<TableBody>
											{reportData.milkCollections.summary.map((item: any, index: number) => (
												<TableRow key={index} hover>
													<TableCell>{item.collector_name}</TableCell>
													<TableCell align="right">{item.total_amount} L</TableCell>
													<TableCell align="right">{formatCurrency(item.avg_price)}</TableCell>
													<TableCell align="right">{formatCurrency(item.total_value)}</TableCell>
													<TableCell align="right">{item.collection_days} hari</TableCell>
												</TableRow>
											))}
											<TableRow sx={{ bgcolor: 'grey.50' }}>
												<TableCell><strong>TOTAL</strong></TableCell>
												<TableCell align="right"><strong>{reportData.milkCollections.total.total_amount} L</strong></TableCell>
												<TableCell align="right"><strong>{formatCurrency(reportData.milkCollections.total.avg_price)}</strong></TableCell>
												<TableCell align="right"><strong>{formatCurrency(reportData.milkCollections.total.total_value)}</strong></TableCell>
												<TableCell align="right"><strong>{reportData.milkCollections.total.total_days} hari</strong></TableCell>
											</TableRow>
										</TableBody>
									</Table>
								</CardContent>
							</Card>
						</Grid>
					)}

					{/* Attendance */}
					{reportData.attendance.length > 0 && (
						<Grid item xs={12}>
							<Card>
								<CardContent>
									<Typography variant="h6" gutterBottom>
										<Assessment sx={{ mr: 1, verticalAlign: 'middle' }} />
										Absensi Karyawan - {reportData.period.monthName} {reportData.period.year}
									</Typography>
									<Table>
										<TableHead>
											<TableRow>
												<TableCell>Nama</TableCell>
												<TableCell>Posisi</TableCell>
												<TableCell align="center">Hadir</TableCell>
												<TableCell align="center">Ijin</TableCell>
												<TableCell align="center">Sakit</TableCell>
												<TableCell align="center">Libur</TableCell>
												<TableCell align="center">Total</TableCell>
											</TableRow>
										</TableHead>
										<TableBody>
											{reportData.attendance.map((item: any, index: number) => (
												<TableRow key={index} hover>
													<TableCell>{item.employee_name}</TableCell>
													<TableCell>{item.employee_position}</TableCell>
													<TableCell align="center">
														<Chip label={item.present_days} color="success" size="small" />
													</TableCell>
													<TableCell align="center">
														<Chip label={item.absent_days} color="error" size="small" />
													</TableCell>
													<TableCell align="center">
														<Chip label={item.sick_days} color="warning" size="small" />
													</TableCell>
													<TableCell align="center">
														<Chip label={item.holiday_days} color="default" size="small" />
													</TableCell>
													<TableCell align="center">
														<strong>{item.total_days}</strong>
													</TableCell>
												</TableRow>
											))}
										</TableBody>
									</Table>
								</CardContent>
							</Card>
						</Grid>
					)}

					{/* Salaries */}
					{reportData.salaries.length > 0 && (
						<Grid item xs={12}>
							<Card>
								<CardContent>
									<Typography variant="h6" gutterBottom>
										<Assessment sx={{ mr: 1, verticalAlign: 'middle' }} />
										Gaji Karyawan - {reportData.period.monthName} {reportData.period.year}
									</Typography>
									<Table>
										<TableHead>
											<TableRow>
												<TableCell>Nama</TableCell>
												<TableCell>Posisi</TableCell>
												<TableCell align="right">Gaji Pokok</TableCell>
												<TableCell align="center">Hari Kerja</TableCell>
												<TableCell align="right">Potongan</TableCell>
												<TableCell align="right">Bonus</TableCell>
												<TableCell align="right">Gaji Akhir</TableCell>
											</TableRow>
										</TableHead>
										<TableBody>
											{reportData.salaries.map((item: any, index: number) => (
												<TableRow key={index} hover>
													<TableCell>{item.employee_name}</TableCell>
													<TableCell>{item.employee_position}</TableCell>
													<TableCell align="right">{formatCurrency(item.base_salary)}</TableCell>
													<TableCell align="center">{item.total_working_days}</TableCell>
													<TableCell align="right">{formatCurrency(item.deductions)}</TableCell>
													<TableCell align="right">{formatCurrency(item.bonuses)}</TableCell>
													<TableCell align="right">
														<Typography variant="body2" fontWeight="bold" color="primary">
															{formatCurrency(item.final_salary)}
														</Typography>
													</TableCell>
												</TableRow>
											))}
											<TableRow sx={{ bgcolor: 'grey.50' }}>
												<TableCell colSpan={6}><strong>TOTAL GAJI</strong></TableCell>
												<TableCell align="right">
													<strong>{formatCurrency(reportData.summary.totalSalary)}</strong>
												</TableCell>
											</TableRow>
										</TableBody>
									</Table>
								</CardContent>
							</Card>
						</Grid>
					)}

					{/* Incomes */}
					{reportData.incomes.items.length > 0 && (
						<Grid item xs={12}>
							<Card>
								<CardContent>
									<Typography variant="h6" gutterBottom>
										<Assessment sx={{ mr: 1, verticalAlign: 'middle' }} />
										Pendapatan - {reportData.period.monthName} {reportData.period.year}
									</Typography>
									<Table>
										<TableHead>
											<TableRow>
												<TableCell>Sumber</TableCell>
												<TableCell align="right">Jumlah</TableCell>
												<TableCell>Tanggal</TableCell>
												<TableCell>Keterangan</TableCell>
											</TableRow>
										</TableHead>
										<TableBody>
											{reportData.incomes.items.map((item: any, index: number) => (
												<TableRow key={index} hover>
													<TableCell>{item.source}</TableCell>
													<TableCell align="right">{formatCurrency(item.amount)}</TableCell>
													<TableCell>{dayjs(item.date).format('DD/MM/YYYY')}</TableCell>
													<TableCell>{item.description}</TableCell>
												</TableRow>
											))}
											<TableRow sx={{ bgcolor: 'grey.50' }}>
												<TableCell><strong>TOTAL PENDAPATAN</strong></TableCell>
												<TableCell align="right">
													<strong>{formatCurrency(reportData.incomes.total)}</strong>
												</TableCell>
												<TableCell colSpan={2}></TableCell>
											</TableRow>
										</TableBody>
									</Table>
								</CardContent>
							</Card>
						</Grid>
					)}

					{/* Expenses */}
					{reportData.expenses.items.length > 0 && (
						<Grid item xs={12}>
							<Card>
								<CardContent>
									<Typography variant="h6" gutterBottom>
										<Assessment sx={{ mr: 1, verticalAlign: 'middle' }} />
										Pengeluaran - {reportData.period.monthName} {reportData.period.year}
									</Typography>
									<Table>
										<TableHead>
											<TableRow>
												<TableCell>Kategori</TableCell>
												<TableCell align="right">Jumlah</TableCell>
												<TableCell>Tanggal</TableCell>
												<TableCell>Keterangan</TableCell>
											</TableRow>
										</TableHead>
										<TableBody>
											{reportData.expenses.items.map((item: any, index: number) => (
												<TableRow key={index} hover>
													<TableCell>{item.category}</TableCell>
													<TableCell align="right">{formatCurrency(item.amount)}</TableCell>
													<TableCell>{dayjs(item.date).format('DD/MM/YYYY')}</TableCell>
													<TableCell>{item.description}</TableCell>
												</TableRow>
											))}
											<TableRow sx={{ bgcolor: 'grey.50' }}>
												<TableCell><strong>TOTAL PENGELUARAN</strong></TableCell>
												<TableCell align="right">
													<strong>{formatCurrency(reportData.expenses.total)}</strong>
												</TableCell>
												<TableCell colSpan={2}></TableCell>
											</TableRow>
										</TableBody>
									</Table>
								</CardContent>
							</Card>
						</Grid>
					)}

					{/* Maintenances */}
					{reportData.maintenances.items.length > 0 && (
						<Grid item xs={12}>
							<Card>
								<CardContent>
									<Typography variant="h6" gutterBottom>
										<Assessment sx={{ mr: 1, verticalAlign: 'middle' }} />
										Pemeliharaan - {reportData.period.monthName} {reportData.period.year}
									</Typography>
									<Table>
										<TableHead>
											<TableRow>
												<TableCell>Item</TableCell>
												<TableCell>Periode</TableCell>
												<TableCell align="right">Biaya</TableCell>
												<TableCell>Keterangan</TableCell>
											</TableRow>
										</TableHead>
										<TableBody>
											{reportData.maintenances.items.map((item: any, index: number) => (
												<TableRow key={index} hover>
													<TableCell>{item.item_name}</TableCell>
													<TableCell>
														{dayjs(item.start_date).format('DD/MM/YYYY')} - {dayjs(item.end_date).format('DD/MM/YYYY')}
													</TableCell>
													<TableCell align="right">{formatCurrency(item.cost)}</TableCell>
													<TableCell>{item.description}</TableCell>
												</TableRow>
											))}
											<TableRow sx={{ bgcolor: 'grey.50' }}>
												<TableCell><strong>TOTAL PEMELIHARAAN</strong></TableCell>
												<TableCell></TableCell>
												<TableCell align="right">
													<strong>{formatCurrency(reportData.maintenances.total)}</strong>
												</TableCell>
												<TableCell></TableCell>
											</TableRow>
										</TableBody>
									</Table>
								</CardContent>
							</Card>
						</Grid>
					)}
				</>
			)}

			{!reportData && (
				<Grid item xs={12}>
					<Alert severity="info">
						Pilih bulan dan tahun untuk menampilkan laporan bulanan
					</Alert>
				</Grid>
			)}
		</Grid>
	);
}
