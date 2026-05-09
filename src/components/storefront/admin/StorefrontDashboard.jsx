import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import {
  ShoppingCart, Package, Users, Tag, TrendingUp, AlertCircle,
  CheckCircle2, Clock, ArrowRight, DollarSign, Star, XCircle, RefreshCw
} from 'lucide-react';

function StatCard({ icon: Icon, label, value, sub, color = 'text-gray-900', iconBg = 'bg-gray-100', iconColor = 'text-gray-600' }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-9 h-9 rounded-lg ${iconBg} flex items-center justify-center`}>
          <Icon className={`w-4 h-4 ${iconColor}`} />
        </div>
      </div>
      <p className={`text-2xl font-black ${color}`}>{value}</p>
      <p className="text-sm font-medium text-gray-600 mt-0.5">{label}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

const STATUS_CONFIG = {
  pending:    { label: 'Pending',    color: 'bg-amber-50 text-amber-700 border-amber-200',    icon: Clock },
  confirmed:  { label: 'Confirmed',  color: 'bg-blue-50 text-blue-700 border-blue-200',       icon: CheckCircle2 },
  processing: { label: 'Processing', color: 'bg-purple-50 text-purple-700 border-purple-200', icon: RefreshCw },
  shipped:    { label: 'Shipped',    color: 'bg-green-50 text-green-700 border-green-200',     icon: TrendingUp },
  delivered:  { label: 'Delivered',  color: 'bg-green-50 text-green-700 border-green-200',    icon: CheckCircle2 },
  cancelled:  { label: 'Cancelled',  color: 'bg-red-50 text-red-700 border-red-200',          icon: XCircle },
  refunded:   { label: 'Refunded',   color: 'bg-gray-50 text-gray-600 border-gray-200',       icon: RefreshCw },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${cfg.color}`}>
      <Icon className="w-2.5 h-2.5" />
      {cfg.label}
    </span>
  );
}

function NotificationItem({ icon: Icon, iconBg, iconColor, title, desc, action, to }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-gray-100 last:border-0">
      <div className={`w-8 h-8 rounded-lg ${iconBg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
        <Icon className={`w-3.5 h-3.5 ${iconColor}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-800">{title}</p>
        <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
      </div>
      {to && (
        <Link to={to} className="text-xs text-blue-600 hover:text-blue-800 font-medium whitespace-nowrap flex items-center gap-1 mt-0.5">
          {action} <ArrowRight className="w-3 h-3" />
        </Link>
      )}
    </div>
  );
}

export default function StorefrontDashboard() {
  const { data: orders = [] } = useQuery({
    queryKey: ['sf_orders'],
    queryFn: () => base44.entities.Order.list('-created_date', 50),
  });
  const { data: products = [] } = useQuery({
    queryKey: ['sf_products'],
    queryFn: () => base44.entities.Product.list(),
  });
  const { data: variants = [] } = useQuery({
    queryKey: ['sf_variants'],
    queryFn: () => base44.entities.ProductVariant.list(),
  });
  const { data: customers = [] } = useQuery({
    queryKey: ['sf_customers'],
    queryFn: () => base44.entities.Customer.list(),
  });
  const { data: reviews = [] } = useQuery({
    queryKey: ['sf_reviews'],
    queryFn: () => base44.entities.Review.filter({ status: 'pending' }),
  });
  const { data: discounts = [] } = useQuery({
    queryKey: ['sf_discounts'],
    queryFn: () => base44.entities.DiscountCode.filter({ active: true }),
  });

  // Derived stats
  const totalRevenue = orders
    .filter(o => ['confirmed', 'processing', 'shipped', 'delivered'].includes(o.status))
    .reduce((s, o) => s + (o.total || 0), 0);

  const pendingOrders = orders.filter(o => o.status === 'pending').length;
  const confirmedOrders = orders.filter(o => o.status === 'confirmed').length;
  const recentOrders = orders.slice(0, 8);

  const lowStockVariants = variants.filter(v => v.available && (v.inventory ?? 0) <= 3);
  const outOfStockVariants = variants.filter(v => v.available === false || (v.inventory ?? 0) === 0);
  const activeProducts = products.filter(p => p.status === 'active').length;
  const draftProducts = products.filter(p => p.status === 'draft').length;

  // Build notifications
  const notifications = [];
  if (pendingOrders > 0) notifications.push({
    icon: ShoppingCart, iconBg: 'bg-amber-50', iconColor: 'text-amber-600',
    title: `${pendingOrders} order${pendingOrders > 1 ? 's' : ''} awaiting payment confirmation`,
    desc: 'These orders are pending Stripe confirmation.',
    action: 'View Orders', to: '/admin/orders',
  });
  if (confirmedOrders > 0) notifications.push({
    icon: CheckCircle2, iconBg: 'bg-blue-50', iconColor: 'text-blue-600',
    title: `${confirmedOrders} order${confirmedOrders > 1 ? 's' : ''} confirmed — ready to fulfill`,
    desc: 'Payment received. Mark as processing when you ship.',
    action: 'Fulfill', to: '/admin/orders',
  });
  if (reviews.length > 0) notifications.push({
    icon: Star, iconBg: 'bg-yellow-50', iconColor: 'text-yellow-600',
    title: `${reviews.length} review${reviews.length > 1 ? 's' : ''} pending approval`,
    desc: 'Customer reviews waiting for moderation.',
    action: 'Review', to: '/admin/reviews',
  });
  if (lowStockVariants.length > 0) notifications.push({
    icon: AlertCircle, iconBg: 'bg-orange-50', iconColor: 'text-orange-600',
    title: `${lowStockVariants.length} variant${lowStockVariants.length > 1 ? 's' : ''} running low on stock`,
    desc: lowStockVariants.slice(0, 2).map(v => `${v.color || ''} ${v.size || ''} (${v.inventory} left)`).join(', '),
    action: 'Manage', to: '/admin/variants',
  });
  if (outOfStockVariants.length > 0) notifications.push({
    icon: XCircle, iconBg: 'bg-red-50', iconColor: 'text-red-600',
    title: `${outOfStockVariants.length} variant${outOfStockVariants.length > 1 ? 's' : ''} out of stock`,
    desc: 'These variants are unavailable to customers.',
    action: 'Fix', to: '/admin/variants',
  });
  if (draftProducts > 0) notifications.push({
    icon: Package, iconBg: 'bg-gray-100', iconColor: 'text-gray-500',
    title: `${draftProducts} product${draftProducts > 1 ? 's' : ''} still in draft`,
    desc: 'Publish to make them available in the store.',
    action: 'Publish', to: '/admin/products',
  });

  return (
    <div className="space-y-6">

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={DollarSign}
          label="Total Revenue"
          value={`$${totalRevenue.toFixed(2)}`}
          sub="Confirmed + shipped orders"
          iconBg="bg-green-50"
          iconColor="text-green-600"
          color="text-green-700"
        />
        <StatCard
          icon={ShoppingCart}
          label="Total Orders"
          value={orders.length}
          sub={`${pendingOrders} pending`}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
        />
        <StatCard
          icon={Package}
          label="Active Products"
          value={activeProducts}
          sub={`${draftProducts} in draft`}
          iconBg="bg-purple-50"
          iconColor="text-purple-600"
        />
        <StatCard
          icon={Tag}
          label="Active Discounts"
          value={discounts.length}
          sub="Live promo codes"
          iconBg="bg-orange-50"
          iconColor="text-orange-600"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">

        {/* Recent orders */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Recent Orders</h3>
              <p className="text-xs text-gray-400 mt-0.5">Latest {recentOrders.length} orders</p>
            </div>
            <Link to="/admin/orders" className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1">
              View All <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {recentOrders.length === 0 ? (
            <div className="py-12 text-center text-sm text-gray-400">No orders yet</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {recentOrders.map(order => (
                <div key={order.id} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-900">{order.order_number || order.id?.slice(-6)}</span>
                      <StatusBadge status={order.status} />
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 truncate">{order.customer_email}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-black text-gray-900">${(order.total || 0).toFixed(2)}</p>
                    <p className="text-[10px] text-gray-400">
                      {new Date(order.created_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Notifications panel */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-gray-900">Notifications</h3>
              {notifications.length > 0 && (
                <span className="w-5 h-5 rounded-full bg-red-500 text-white text-[9px] font-black flex items-center justify-center">
                  {notifications.length}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-0.5">Items needing attention</p>
          </div>
          <div className="px-5">
            {notifications.length === 0 ? (
              <div className="py-10 flex flex-col items-center gap-2 text-center">
                <CheckCircle2 className="w-7 h-7 text-green-400" />
                <p className="text-sm font-semibold text-gray-600">All clear!</p>
                <p className="text-xs text-gray-400">No items need your attention.</p>
              </div>
            ) : (
              notifications.map((n, i) => <NotificationItem key={i} {...n} />)
            )}
          </div>
        </div>
      </div>

      {/* Quick nav tiles */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Manage Store</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Products', icon: Package, href: '/admin/products', desc: 'Catalog & images' },
            { label: 'Orders', icon: ShoppingCart, href: '/admin/orders', desc: 'Fulfill & track' },
            { label: 'Variants', icon: Tag, href: '/admin/variants', desc: 'Stock & sizing' },
            { label: 'Discounts', icon: Tag, href: '/admin/discounts', desc: 'Promo codes' },
            { label: 'Collections', icon: Package, href: '/admin/collections', desc: 'Organize catalog' },
            { label: 'Reviews', icon: Star, href: '/admin/reviews', desc: 'Moderate reviews' },
            { label: 'Customers', icon: Users, href: '/admin/customers', desc: 'Customer CRM' },
            { label: 'Store Settings', icon: AlertCircle, href: '/admin/storefront-settings', desc: 'Global config' },
          ].map(s => {
            const Icon = s.icon;
            return (
              <Link key={s.href} to={s.href} className="group bg-white border border-gray-200 rounded-xl p-4 hover:border-blue-300 hover:shadow-sm transition-all">
                <Icon className="w-4 h-4 text-gray-400 group-hover:text-blue-500 mb-2 transition-colors" />
                <p className="text-sm font-bold text-gray-800 group-hover:text-blue-700 transition-colors">{s.label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{s.desc}</p>
              </Link>
            );
          })}
        </div>
      </div>

    </div>
  );
}