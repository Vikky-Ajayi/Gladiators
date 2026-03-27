import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { motion } from 'motion/react';

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-landrify-bg">
      <Navbar />
      <motion.main 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex-grow pt-20"
      >
        {children}
      </motion.main>
      <Footer />
    </div>
  );
}
