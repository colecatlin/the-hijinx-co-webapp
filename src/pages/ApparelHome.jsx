import React from 'react';
import { Button } from '@/components/ui/button';
import PageShell from '@/components/shared/PageShell';
import { motion } from 'framer-motion';

export default function ApparelHome() {
  return (
    <PageShell>
      <div className="bg-[#0A0A0A] text-white">
        <div className="max-w-7xl mx-auto px-6 py-32 md:py-48 flex flex-col items-center justify-center text-center min-h-screen">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="font-mono text-xs tracking-[0.3em] text-gray-500 uppercase mb-6 block">Apparel</span>
            <h1 className="text-4xl md:text-6xl font-black tracking-tight mb-6">Coming Soon</h1>
            <p className="text-gray-400 text-lg md:text-xl max-w-xl mx-auto mb-12">
              New Hijinx apparel and merchandise dropping soon. Shop our current collection in the meantime.
            </p>
            <a
              href="https://www.hijinxco.com/store"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button className="bg-[#E5FF00] text-[#0A0A0A] hover:bg-white font-semibold px-8">
                Visit Store
              </Button>
            </a>
          </motion.div>
        </div>
      </div>
    </PageShell>
  );
}