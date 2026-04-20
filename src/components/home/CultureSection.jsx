import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

const fadeUp = (i) => ({
  initial: { opacity: 0, y: 32 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.1 },
  transition: { delay: i * 0.1, duration: 0.7, ease: [0.16, 1, 0.3, 1] },
});

function isExternal(url) {
  return url && (url.startsWith('http://') || url.startsWith('https://'));
}

function BlockLink({ to, children, className }) {
  if (!to) return <div className={className}>{children}</div>;
  if (isExternal(to)) return <a href={to} target="_blank" rel="noopener noreferrer" className={className}>{children}</a>;
  return <Link to={to} className={className}>{children}</Link>;
}

// Layout: block[0]=large left (col-span-5), block[1]=center tall (col-span-3), block[2]=top-right, block[3]=bottom-right
export default function CultureSection() {
  const { data: dbBlocks = [] } = useQuery({
    queryKey: ['cultureBlocks'],
    queryFn: () => base44.entities.CultureBlock.filter({ is_active: true }, 'sort_order'),
    staleTime: 2 * 60 * 1000,
  });

  if (dbBlocks.length === 0) return null;

  const [b0, b1, b2, b3] = dbBlocks;

  return (
    <section className="bg-[#111010] py-16 md:py-24 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-stretch">

          {/* Block 1 — Large left */}
          {b0 && (
            <motion.div {...fadeUp(0)} className="md:col-span-5 relative rounded-2xl overflow-hidden group cursor-pointer" style={{ minHeight: 480 }}>
              <BlockLink to={b0.link_url} className="absolute inset-0" />
              {b0.image_url && (
                <img src={b0.image_url} alt={b0.title}
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-1000 ease-out"
                  style={{ filter: 'contrast(1.15) saturate(0.5) brightness(0.65)' }} />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
              <div className="relative h-full flex flex-col justify-between p-7 pointer-events-none" style={{ minHeight: 480 }}>
                {b0.label && <span className="text-[10px] font-bold tracking-[0.35em] text-white/50 uppercase">{b0.label}</span>}
                <div>
                  <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight leading-tight mb-3">{b0.title}</h2>
                  {b0.description && <p className="text-white/60 text-sm leading-relaxed mb-5">{b0.description}</p>}
                  {b0.link_label && b0.link_url && (
                    <span className="inline-flex items-center gap-2 text-sm font-semibold text-white border-b border-white/30 pb-0.5 pointer-events-auto">
                      <BlockLink to={b0.link_url} className="inline-flex items-center gap-2 hover:border-white transition-colors">
                        {b0.link_label} <ArrowRight className="w-3.5 h-3.5" />
                      </BlockLink>
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* Block 2 — Center tall */}
          {b1 && (
            <motion.div {...fadeUp(1)} className="md:col-span-3 relative rounded-2xl overflow-hidden group cursor-pointer" style={{ minHeight: 480 }}>
              <BlockLink to={b1.link_url} className="absolute inset-0" />
              {b1.image_url && (
                <img src={b1.image_url} alt={b1.title}
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-1000 ease-out"
                  style={{ filter: 'contrast(1.15) saturate(0.5) brightness(0.7)' }} />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="relative h-full flex flex-col justify-end p-5 pointer-events-none" style={{ minHeight: 480 }}>
                {b1.label && <span className="text-[10px] font-bold tracking-[0.35em] text-white/50 uppercase">{b1.label}</span>}
                {b1.title && <h3 className="text-2xl font-black text-white mt-1">{b1.title}</h3>}
              </div>
            </motion.div>
          )}

          {/* Blocks 3 & 4 — Right column stacked */}
          {(b2 || b3) && (
            <div className="md:col-span-4 flex flex-col gap-3">
              {b2 && (
                <motion.div {...fadeUp(2)} className="relative rounded-2xl overflow-hidden group cursor-pointer flex-1" style={{ minHeight: 230 }}>
                  <BlockLink to={b2.link_url} className="absolute inset-0" />
                  {b2.image_url && (
                    <img src={b2.image_url} alt={b2.title}
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-1000 ease-out"
                      style={{ filter: 'contrast(1.1) saturate(0.5) brightness(0.65)' }} />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                  <div className="relative h-full flex flex-col justify-end p-5 pointer-events-none" style={{ minHeight: 230 }}>
                    {b2.label && <span className="text-[10px] font-bold tracking-[0.35em] text-white/50 uppercase">{b2.label}</span>}
                    {b2.title && <h3 className="text-xl font-black text-white mt-1">{b2.title}</h3>}
                  </div>
                </motion.div>
              )}
              {b3 && (
                <motion.div {...fadeUp(3)} className="relative rounded-2xl overflow-hidden group cursor-pointer flex-1 bg-[#1A1A18]" style={{ minHeight: 230 }}>
                  <BlockLink to={b3.link_url} className="absolute inset-0" />
                  {b3.image_url && (
                    <img src={b3.image_url} alt={b3.title}
                      className="absolute inset-0 w-full h-full object-cover opacity-15 group-hover:opacity-25 transition-opacity duration-700"
                      style={{ filter: 'saturate(0)' }} />
                  )}
                  <div className="relative h-full flex flex-col justify-between p-6 pointer-events-none" style={{ minHeight: 230 }}>
                    {b3.label && <span className="text-[10px] font-bold tracking-[0.35em] text-white/40 uppercase">{b3.label}</span>}
                    <div>
                      {b3.description && <h3 className="text-2xl md:text-3xl font-black text-white tracking-tight leading-tight mb-4">{b3.description}</h3>}
                      {b3.link_label && b3.link_url && (
                        <span className="inline-flex items-center gap-2 text-sm font-semibold text-white border-b border-white/30 pb-0.5 pointer-events-auto">
                          <BlockLink to={b3.link_url} className="inline-flex items-center gap-2 hover:border-white transition-colors">
                            {b3.link_label} <ArrowRight className="w-3.5 h-3.5" />
                          </BlockLink>
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          )}

        </div>
      </div>
    </section>
  );
}