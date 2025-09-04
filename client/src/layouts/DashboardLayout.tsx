import { Logout, Savings, People, AccessTime, Inventory2, Build, Payments, Dashboard, Assessment, LocalShipping } from '@mui/icons-material';
import {
	AppBar,
	Box,
	Divider,
	Drawer,
	IconButton,
	List,
	ListItemButton,
	ListItemIcon,
	ListItemText,
	Toolbar,
	Typography,
	useMediaQuery
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import { useMemo, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

const drawerWidth = 260;

const navItems = [
	{ to: '/', label: 'Dashboard', icon: <Dashboard /> },
	{ to: '/collectors', label: 'Pengepul Susu', icon: <People /> },
	{ to: '/collections', label: 'Koleksi Susu', icon: <Inventory2 /> },
	{ to: '/shipments', label: 'Pengiriman', icon: <LocalShipping /> },
	{ to: '/employees', label: 'Karyawan', icon: <Savings /> },
	{ to: '/attendances', label: 'Absensi', icon: <AccessTime /> },
	{ to: '/incomes', label: 'Pemasukan', icon: <Payments /> },
	{ to: '/maintenances', label: 'Pemeliharaan', icon: <Build /> },
	{ to: '/expenses', label: 'Pengeluaran', icon: <Payments /> },
	{ to: '/reports', label: 'Laporan Bulanan', icon: <Assessment /> }
];

export default function DashboardLayout() {
	const [open, setOpen] = useState(false);
	const isDesktop = useMediaQuery('(min-width:1200px)');
	const { user, logout } = useAuth();
	const location = useLocation();

	const activePath = useMemo(() => location.pathname, [location.pathname]);

	const drawer = (
		<Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
			<Toolbar>
				<Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
					<img src="/logo.png" alt="Logo" style={{ width: 64, height: 64, objectFit: 'contain' }} />
					<Typography variant="h6" noWrap component="div" sx={{ fontWeight: 700 }}>
						Banyu Makmur
					</Typography>
				</Box>
			</Toolbar>
			<Divider />
			<Box sx={{ flexGrow: 1 }}>
				<List>
					{navItems.map((item) => (
						<ListItemButton
							key={item.to}
							component={Link}
							to={item.to}
							selected={activePath === item.to || (item.to !== '/' && activePath.startsWith(item.to))}
						>
							<ListItemIcon>{item.icon}</ListItemIcon>
							<ListItemText primary={item.label} />
						</ListItemButton>
					))}
				</List>
			</Box>
			<Divider />
			<List>
				<ListItemButton onClick={logout}>
					<ListItemIcon>
						<Logout />
					</ListItemIcon>
					<ListItemText primary="Logout" />
				</ListItemButton>
			</List>
		</Box>
	);

	return (
		<Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#f7f9fc' }}>
			<AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }} color="inherit" elevation={1}>
				<Toolbar sx={{ minHeight: { xs: 72, sm: 76 } }}>
					<IconButton color="inherit" edge="start" onClick={() => setOpen(true)} sx={{ mr: 2, display: { xl: 'none' } }}>
						<MenuIcon />
					</IconButton>
					<Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexGrow: 1 }}>
						<img src="/logo.png" alt="Logo" style={{ width: 56, height: 56, objectFit: 'contain' }} />
						<Typography variant="h6" sx={{ fontWeight: 700 }}>
							Banyu Makmur
						</Typography>
					</Box>
					<Typography variant="body1" sx={{ color: 'text.secondary' }}>{user?.fullname}</Typography>
				</Toolbar>
			</AppBar>

			<Drawer
				variant={isDesktop ? 'permanent' : 'temporary'}
				open={isDesktop ? true : open}
				onClose={() => setOpen(false)}
				ModalProps={{ keepMounted: true }}
				sx={{
					width: drawerWidth,
					'& .MuiDrawer-paper': { width: drawerWidth, boxSizing: 'border-box' }
				}}
			>
				{drawer}
			</Drawer>

			<Box component="main" sx={{ flexGrow: 1, p: 3, width: { xl: `calc(100% - ${drawerWidth}px)` } }}>
				<Toolbar />
				<Outlet />
			</Box>
		</Box>
	);
}
