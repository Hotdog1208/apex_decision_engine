import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { BarChart2 } from 'lucide-react'
import { api } from '../api'
import PageWrapper from '../components/PageWrapper'
import PageHeader from '../components/PageHeader'
import StatCard from '../components/StatCard'
import Card, { CardHeader, CardBody } from '../components/Card'
import PerformanceCharts from '../components/PerformanceCharts'
import SkeletonLoader from '../components/SkeletonLoader'
import { formatCurrency } from '../lib/format'

export default function Analytics() {
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getAnalytics()
      .then(setAnalytics)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <PageWrapper>
        <PageHeader title="Performance Analytics" subtitle="Risk-adjusted metrics and cumulative returns." />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <SkeletonLoader key={i} height={100} className="rounded-xl" />
          ))}
        </div>
        <SkeletonLoader height={240} className="rounded-xl mt-6" />
      </PageWrapper>
    )
  }

  const pnl = analytics?.total_pnl ?? 0
  return (
    <PageWrapper>
      <PageHeader
        title="Performance Analytics"
        subtitle="Risk-adjusted metrics and cumulative returns. Track PnL, Sharpe, drawdown, and win rate."
        icon={BarChart2}
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Total PnL"
          value={pnl}
          prefix={pnl >= 0 ? '+$' : '-$'}
          format="currency"
          decimals={2}
          variant={pnl >= 0 ? 'profit' : 'loss'}
          animate
          delay={0}
        />
        <StatCard label="Win Rate" value={analytics?.win_rate ?? 0} format="percent" suffix="%" decimals={1} animate delay={0.05} />
        <StatCard label="Sharpe Ratio" value={analytics?.sharpe_ratio ?? 0} format="number" decimals={2} animate delay={0.1} />
        <StatCard label="Profit Factor" value={analytics?.profit_factor ?? 0} format="number" decimals={2} animate delay={0.15} />
      </div>
      <Card animate delay={0.2} hover>
        <CardHeader title="Cumulative Return & Risk" subtitle="Simulated performance over time" />
        <CardBody>
          <PerformanceCharts analytics={analytics} />
        </CardBody>
      </Card>
    </PageWrapper>
  )
}
