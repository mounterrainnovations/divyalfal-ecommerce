import type { ReportPayload } from '@/app/api/admin/reports/aggregate';

/**
 * One report payload, for the two test files beside this one. Nothing in the screen imports it.
 *
 * WHY IT MIRRORS THE LIVE DATABASE RATHER THAN BEING MADE UP. These are the figures the real
 * tables return today — eight orders on 10 May 2026, two of them cancelled, three marked paid,
 * one product ever sold, fifteen products of which thirteen have no size recorded, no enquiries
 * at all, and a gateway that has captured one payment of the three the orders table calls paid.
 * The whole point of this screen is what it does with a sample this thin, so a fixture of
 * plausible-looking busy months would test the opposite of the thing that matters.
 *
 * `plotted()` is the same shape with enough orders, spread widely enough, that the chart is
 * allowed to appear — the only way to check that the refusal is a rule and not a dead end.
 */
export function sampleReport(): ReportPayload {
  return {
    range: '12m',
    rangeLabel: 'Last 12 months',
    window: {
      from: '2025-11-30T18:30:00.000Z',
      to: '2026-11-25T16:42:08.058Z',
      text: '1 Dec 2025 to 25 Nov 2026',
    },
    unit: 'month',
    generatedAt: '2026-11-25T16:42:08.058Z',
    revenueBasis:
      'Revenue is the sum of every order total in the window except cancelled and returned orders. Those orders are still counted as orders.',
    headline: {
      orders: 8,
      revenue: 48000,
      revenueOrders: 6,
      excludedOrders: 2,
      excludedAmount: 18000,
      averageOrderValue: 8000,
      paidOrders: 3,
      unpaidOrders: 5,
      rfqOrders: 3,
    },
    series: [
      { key: '2025-12-01', label: 'Dec 2025', orders: 0, revenue: 0 },
      { key: '2026-01-01', label: 'Jan 2026', orders: 0, revenue: 0 },
      { key: '2026-02-01', label: 'Feb 2026', orders: 0, revenue: 0 },
      { key: '2026-03-01', label: 'Mar 2026', orders: 0, revenue: 0 },
      { key: '2026-04-01', label: 'Apr 2026', orders: 0, revenue: 0 },
      { key: '2026-05-01', label: 'May 2026', orders: 8, revenue: 48000 },
      { key: '2026-06-01', label: 'Jun 2026', orders: 0, revenue: 0 },
      { key: '2026-07-01', label: 'Jul 2026', orders: 0, revenue: 0 },
      { key: '2026-08-01', label: 'Aug 2026', orders: 0, revenue: 0 },
      { key: '2026-09-01', label: 'Sept 2026', orders: 0, revenue: 0 },
      { key: '2026-10-01', label: 'Oct 2026', orders: 0, revenue: 0 },
      { key: '2026-11-01', label: 'Nov 2026', orders: 0, revenue: 0 },
    ],
    byStatus: [
      { key: 'PENDING', count: 2, amount: 18000 },
      { key: 'QUOTE_REQUESTED', count: 3, amount: 18000 },
      { key: 'SHIPPED', count: 1, amount: 12000 },
      { key: 'CANCELLED', count: 2, amount: 18000 },
    ],
    byPaymentStatus: [
      { key: 'PENDING', count: 5, amount: 36000 },
      { key: 'PAID', count: 3, amount: 30000 },
    ],
    topProducts: [
      {
        productId: '713011fb-667f-4f54-a867-3334aa815f7c',
        name: 'Banarasi Red Silk Saree',
        category: 'SAREE',
        units: 8,
        revenue: 48000,
      },
    ],
    catalogue: {
      total: 15,
      live: 15,
      archived: 0,
      byCategory: [
        { key: 'LEHENGA', count: 4 },
        { key: 'SUIT', count: 4 },
        { key: 'INDO_WESTERN', count: 2 },
        { key: 'KURTA_PANT', count: 2 },
        { key: 'SAREE', count: 2 },
        { key: 'WESTERN', count: 1 },
      ],
    },
    stock: {
      variants: 8,
      unitsInStock: 1055,
      unitsCounted: 56,
      outOfStockVariants: 0,
      productsTotal: 15,
      productsWithVariants: 2,
      productsWithoutVariants: 13,
      byProduct: [
        {
          productId: '002dc5ac-f31d-49bd-a124-c655ae6880c7',
          name: 'Midnight Silk Saree',
          isArchived: false,
          units: 1029,
          placeholderUnits: 999,
          variants: 4,
        },
        {
          productId: '713011fb-667f-4f54-a867-3334aa815f7c',
          name: 'Banarasi Red Silk Saree',
          isArchived: false,
          units: 26,
          placeholderUnits: 0,
          variants: 4,
        },
      ],
      zeroStock: [],
      placeholders: [
        {
          id: '65cd0d8e-f9e5-412e-8e25-e33ea9f4e63b',
          product: 'Midnight Silk Saree',
          size: 'Custom',
          stock: 999,
        },
      ],
    },
    enquiries: { inWindow: 0, everTotal: 0, byStatus: [], bySource: [] },
    payments: {
      count: 5,
      amount: 48000,
      byStatus: [
        { key: 'captured', count: 1, amount: 6000 },
        { key: 'created', count: 3, amount: 36000 },
        { key: 'failed', count: 1, amount: 6000 },
      ],
    },
  };
}

/** The same report with a series the plotting rule accepts: 14 orders across six months. */
export function plottableReport(): ReportPayload {
  const report = sampleReport();
  const orders = [1, 0, 2, 3, 0, 4, 0, 1, 0, 2, 0, 1];
  return {
    ...report,
    headline: { ...report.headline, orders: 14, revenueOrders: 14, excludedOrders: 0 },
    series: report.series.map((point, index) => ({
      ...point,
      orders: orders[index],
      revenue: orders[index] * 6000,
    })),
  };
}
