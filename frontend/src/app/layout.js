import './globals.css';
import { AuthProvider } from '../context/AuthContext';
import { SocketProvider } from '../context/SocketContext';
import { ThemeProvider } from '../context/ThemeContext';

export const metadata = {
  title: 'DonChat — Next-Gen Messaging & Fluid Spaces',
  description: 'Next-Generation Autonomous Communication Platform with Multi-Persona Identity, Fluid Spaces, and Privacy Vectors.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'DonChat',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  interactiveWidget: 'resizes-visual'
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark h-full">
      <body className="bg-background text-foreground antialiased h-full">
        <ThemeProvider>
          <AuthProvider>
            <SocketProvider>
              {children}
            </SocketProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
