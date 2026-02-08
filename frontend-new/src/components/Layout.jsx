import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';

export default function Layout() {
  return (
    <div className="os-root">
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 pb-12">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
