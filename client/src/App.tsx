import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import { SnackbarProvider } from 'notistack';
import { Navigate, Route, Routes } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import DashboardLayout from './layouts/DashboardLayout';
import DashboardHome from './pages/dashboard/DashboardHome';
import CollectorsPage from './pages/collectors/CollectorsPage';
import CollectionsPage from './pages/collections/CollectionsPage';
import EmployeesPage from './pages/employees/EmployeesPage';
import AttendancesPage from './pages/attendances/AttendancesPage';
import IncomesPage from './pages/incomes/IncomesPage';
import MaintenancesPage from './pages/maintenances/MaintenancesPage';
import ExpensesPage from './pages/expenses/ExpensesPage';
import ShipmentsPage from './pages/shipments/ShipmentsPage';

import MonthlyReportPage from './pages/reports/MonthlyReportPage';
import { AuthProvider } from './auth/AuthContext';
import ProtectedRoute from './auth/ProtectedRoute';

const theme = createTheme({
	palette: {
		mode: 'light',
		primary: { main: '#2E7D32' },
		secondary: { main: '#1976d2' }
	},
	typography: {
		fontFamily: 'Inter, Roboto, Arial, sans-serif'
	}
});

export default function App() {
	return (
		<ThemeProvider theme={theme}>
			<CssBaseline />
			<SnackbarProvider maxSnack={3} autoHideDuration={2500}>
				<AuthProvider>
					<Routes>
						<Route path="/login" element={<LoginPage />} />
						<Route
							path="/"
							element={
								<ProtectedRoute>
									<DashboardLayout />
								</ProtectedRoute>
							}
						>
							<Route index element={<DashboardHome />} />
							<Route path="collectors" element={<CollectorsPage />} />
							<Route path="collections" element={<CollectionsPage />} />
							<Route path="employees" element={<EmployeesPage />} />
							<Route path="attendances" element={<AttendancesPage />} />
							<Route path="incomes" element={<IncomesPage />} />
							<Route path="maintenances" element={<MaintenancesPage />} />
							<Route path="expenses" element={<ExpensesPage />} />
							<Route path="shipments" element={<ShipmentsPage />} />
							<Route path="reports" element={<MonthlyReportPage />} />
							<Route path="*" element={<Navigate to="/" replace />} />
						</Route>
					</Routes>
				</AuthProvider>
			</SnackbarProvider>
		</ThemeProvider>
	);
}

