import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  return {
    base: './',
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      rollupOptions: {
        input: {
          main: path.resolve(__dirname, 'index.html'),
          product: path.resolve(__dirname, 'product.html'),
          checkout: path.resolve(__dirname, 'checkout.html'),
          success: path.resolve(__dirname, 'success.html'),
          myOrders: path.resolve(__dirname, 'my-orders.html'),
          invoice: path.resolve(__dirname, 'invoice.html'),
          login: path.resolve(__dirname, 'login.html'),
          register: path.resolve(__dirname, 'register.html'),
          profile: path.resolve(__dirname, 'profile.html'),
          search: path.resolve(__dirname, 'search.html'),
          settings: path.resolve(__dirname, 'settings.html'),
          offline: path.resolve(__dirname, 'offline.html'),
          adminIndex: path.resolve(__dirname, 'admin/index.html'),
          adminDashboard: path.resolve(__dirname, 'admin/dashboard.html'),
          adminProducts: path.resolve(__dirname, 'admin/products.html'),
          adminCategories: path.resolve(__dirname, 'admin/categories.html'),
          adminOrders: path.resolve(__dirname, 'admin/orders.html'),
          adminInvoices: path.resolve(__dirname, 'admin/invoices.html'),
          adminCustomers: path.resolve(__dirname, 'admin/customers.html'),
          adminBanners: path.resolve(__dirname, 'admin/banners.html'),
          adminMedia: path.resolve(__dirname, 'admin/media.html'),
          adminPayments: path.resolve(__dirname, 'admin/payments.html'),
          adminSettings: path.resolve(__dirname, 'admin/settings.html'),
          adminOffline: path.resolve(__dirname, 'admin/offline.html'),
        },
      },
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
