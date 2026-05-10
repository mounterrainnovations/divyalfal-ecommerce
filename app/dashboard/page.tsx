import Link from 'next/link'
import { prisma } from '@/lib/db'
import { DashboardOverviewClient } from './page-client'

export const dynamic = 'force-dynamic'

async function getStats() {
  const prodCount = await prisma.product.count()
  // Mocking other stats for initial setup as tables are fresh
  return {
    products: prodCount,
    orders: 0,
    revenue: 0,
    customers: await prisma.profile.count()
  }
}

export default async function DashboardOverview() {
  const stats = await getStats()
  return (
    <DashboardOverviewClient stats={stats} />
  )
}
