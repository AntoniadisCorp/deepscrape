import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef } from '@angular/core'
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms'
import { BaseChartDirective } from 'ng2-charts'
import { ChartConfiguration, ChartData } from 'chart.js'
import { LucideAngularModule } from 'lucide-angular'
import { myIcons } from '../../shared/lucideicons'
import { FirestoreAnalyticsService } from '../../core/services'
import { 
  DashboardSummary, 
  AnalyticsResponse, 
  PeriodFilter, 
  DimensionFilter,
  RealtimeUpdate
} from '../../core/types'
import { Subscription } from 'rxjs'

interface FilterState {
  period: PeriodFilter
  country?: string
  device?: 'desktop' | 'mobile' | 'tablet'
  browser?: string
  provider?: 'google' | 'github' | 'password' | 'phone'
  realtime: boolean
}

@Component({
  selector: 'app-admin-analytics',
  imports: [BaseChartDirective, DecimalPipe, LucideAngularModule, FormsModule, DatePipe],
  templateUrl: './admin-analytics1.component.html',
  styleUrls: ['./admin-analytics.component.scss']
})
export class AdminAnalyticsComponent1 implements OnInit, OnDestroy {
  private analyticsService = inject(FirestoreAnalyticsService)
  private cdr = inject(ChangeDetectorRef)

  // Subscriptions for cleanup
  private subscriptions: Subscription[] = []

  // Loading states
  loading = true
  error: string | null = null
  lastUpdated: Date | null = null
  isRealtime = true

  // Filter state
  filters: FilterState = {
    period: 'last-7d',
    realtime: true
  }

  // Available filter options
  readonly periodOptions: { value: PeriodFilter; label: string }[] = [
    { value: 'today', label: 'Today' },
    { value: 'yesterday', label: 'Yesterday' },
    { value: 'last-7d', label: 'Last 7 days' },
    { value: 'last-30d', label: 'Last 30 days' },
    { value: 'last-90d', label: 'Last 90 days' },
    { value: 'this-month', label: 'This month' },
    { value: 'last-month', label: 'Last month' }
  ]

  readonly deviceOptions = [
    { value: undefined, label: 'All Devices' },
    { value: 'desktop', label: 'Desktop' },
    { value: 'mobile', label: 'Mobile' },
    { value: 'tablet', label: 'Tablet' }
  ]

  readonly providerOptions = [
    { value: undefined, label: 'All Providers' },
    { value: 'google', label: 'Google' },
    { value: 'github', label: 'GitHub' },
    { value: 'password', label: 'Email/Password' },
    { value: 'phone', label: 'Phone' }
  ]

  // Data properties
  dashboardSummary: DashboardSummary | null = null
  analyticsData: AnalyticsResponse | null = null
  realtimeIndicator = false

  // UI helpers
  Math = Math
  readonly icons = myIcons

  // Chart configurations
  public timelineChartData: ChartData<'line'> = {
    labels: [],
    datasets: [
      {
        label: 'New Guests',
        data: [],
        borderColor: '#10B981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        fill: true,
        tension: 0.4
      },
      {
        label: 'New Users',
        data: [],
        borderColor: '#6366F1',
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        fill: true,
        tension: 0.4
      },
      {
        label: 'Logins',
        data: [],
        borderColor: '#F59E0B',
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        fill: false,
        tension: 0.4
      }
    ]
  }

  public timelineChartOptions: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { 
        position: 'top',
        labels: { usePointStyle: true }
      },
      tooltip: { 
        mode: 'index', 
        intersect: false,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: '#374151',
        borderWidth: 1
      }
    },
    scales: {
      y: { 
        beginAtZero: true, 
        grid: { color: 'rgba(0, 0, 0, 0.05)' },
        ticks: { color: '#6B7280' }
      },
      x: { 
        grid: { display: false },
        ticks: { color: '#6B7280' }
      }
    }
  }
  public timelineChartType = 'line' as const

  // Country breakdown chart
  public countryChartData: ChartData<'bar'> = {
    labels: [],
    datasets: [{
      label: 'Visitors by Country',
      data: [],
      backgroundColor: '#3B82F6',
      borderRadius: 8,
      borderSkipped: false
    }]
  }

  public countryChartOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y',
    plugins: { 
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#fff',
        bodyColor: '#fff'
      }
    },
    scales: {
      x: { 
        beginAtZero: true, 
        grid: { color: 'rgba(0, 0, 0, 0.05)' },
        ticks: { color: '#6B7280' }
      },
      y: { 
        grid: { display: false },
        ticks: { color: '#6B7280' }
      }
    }
  }
  public countryChartType = 'bar' as const

  // Browser breakdown chart
  public browserChartData: ChartData<'doughnut'> = {
    labels: [],
    datasets: [{
      data: [],
      backgroundColor: [
        '#3B82F6', '#10B981', '#F59E0B', '#EF4444', 
        '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'
      ],
      borderWidth: 3,
      borderColor: '#fff',
      hoverBorderWidth: 4
    }]
  }

  public browserChartOptions: ChartConfiguration<'doughnut'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { 
      legend: { 
        position: 'right',
        labels: { 
          usePointStyle: true,
          padding: 15,
          font: { size: 12 }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#fff',
        bodyColor: '#fff',
        callbacks: {
          label: (context) => {
            const label = context.label || ''
            const value = context.parsed || 0
            const total = (context.dataset.data as number[]).reduce((a, b) => a + b, 0)
            const percentage = ((value / total) * 100).toFixed(1)
            return `${label}: ${value} (${percentage}%)`
          }
        }
      }
    }
  }
  public browserChartType = 'doughnut' as const

  // Device breakdown chart
  public deviceChartData: ChartData<'pie'> = {
    labels: [],
    datasets: [{
      data: [],
      backgroundColor: ['#6366F1', '#EC4899', '#10B981', '#F59E0B'],
      borderWidth: 3,
      borderColor: '#fff'
    }]
  }

  public deviceChartOptions: ChartConfiguration<'pie'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { 
      legend: { 
        position: 'bottom',
        labels: { 
          usePointStyle: true,
          padding: 15
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#fff',
        bodyColor: '#fff'
      }
    }
  }
  public deviceChartType = 'pie' as const

  async ngOnInit() {
    try {
      // Start with dashboard summary
      await this.loadDashboardSummary()
      
      // Setup real-time dashboard monitoring
      this.setupRealtimeDashboard()
      
      // Load filtered analytics
      await this.loadFilteredAnalytics()
      
      // Setup real-time updates indicator
      this.setupRealtimeUpdates()
      
    } catch (err) {
      this.error = 'Failed to load analytics data'
      console.error('❌ Analytics initialization error:', err)
    } finally {
      this.loading = false
      this.cdr.detectChanges()
    }
  }

  ngOnDestroy() {
    // Clean up all subscriptions
    this.subscriptions.forEach(sub => sub.unsubscribe())
    this.analyticsService.destroy()
  }

  // ============================================================================
  // DATA LOADING METHODS
  // ============================================================================

  private async loadDashboardSummary() {
    console.log('📊 Loading dashboard summary...')
    this.dashboardSummary = await this.analyticsService.getDashboardSummary()
    
    if (this.dashboardSummary) {
      this.lastUpdated = this.dashboardSummary.lastUpdated.toDate()
      console.log('✅ Dashboard summary loaded')
    }
  }

  private setupRealtimeDashboard() {
    console.log('🔴 Setting up real-time dashboard...')
    
    const dashboardSub = this.analyticsService.watchDashboard().subscribe({
      next: (summary) => {
        if (summary) {
          this.dashboardSummary = summary
          this.lastUpdated = summary.lastUpdated.toDate()
          this.showRealtimeIndicator()
          this.cdr.detectChanges()
          console.log('🔴 Dashboard updated in real-time')
        }
      },
      error: (error) => {
        console.error('❌ Real-time dashboard error:', error)
        this.error = 'Real-time connection lost'
      }
    })
    
    this.subscriptions.push(dashboardSub)
  }

  private async loadFilteredAnalytics() {
    console.log('📈 Loading filtered analytics...', this.filters)
    
    const request = {
      period: this.filters.period,
      realtime: this.filters.realtime,
      dimensions: this.buildDimensionFilter()
    }
    
    const analyticsSub = this.analyticsService.getFilteredAnalytics(request).subscribe({
      next: (data) => {
        if (data) {
          this.analyticsData = data
          this.updateCharts(data)
          this.cdr.detectChanges()
          console.log('✅ Analytics data updated')
        }
      },
      error: (error) => {
        console.error('❌ Analytics data error:', error)
        this.error = 'Failed to load analytics'
      }
    })
    
    this.subscriptions.push(analyticsSub)
  }

  private setupRealtimeUpdates() {
    const updatesSub = this.analyticsService.watchRealtimeUpdates().subscribe({
      next: (update) => {
        if (update) {
          this.showRealtimeIndicator()
          console.log('⚡ Real-time update received:', update.type)
        }
      }
    })
    
    this.subscriptions.push(updatesSub)
  }

  private showRealtimeIndicator() {
    this.realtimeIndicator = true
    // Hide after 2 seconds
    setTimeout(() => {
      this.realtimeIndicator = false
      this.cdr.detectChanges()
    }, 2000)
  }

  // ============================================================================
  // FILTER METHODS
  // ============================================================================

  onPeriodChange() {
    console.log('📅 Period changed to:', this.filters.period)
    this.applyFilters()
  }

  onDeviceChange() {
    console.log('📱 Device filter changed to:', this.filters.device)
    this.applyFilters()
  }

  onProviderChange() {
    console.log('🔑 Provider filter changed to:', this.filters.provider)
    this.applyFilters()
  }

  onRealtimeToggle() {
    console.log('🔴 Real-time toggle:', this.filters.realtime)
    this.isRealtime = this.filters.realtime
    this.applyFilters()
  }

  async applyFilters() {
    this.loading = true
    this.error = null
    
    // Clear existing subscriptions for filtered data
    this.subscriptions = this.subscriptions.filter(sub => {
      // Keep dashboard subscription, unsubscribe from analytics
      if (sub !== this.subscriptions[0]) {
        sub.unsubscribe()
        return false
      }
      return true
    })
    
    try {
      await this.loadFilteredAnalytics()
    } catch (err) {
      this.error = 'Failed to apply filters'
      console.error('❌ Filter application error:', err)
    } finally {
      this.loading = false
      this.cdr.detectChanges()
    }
  }

  private buildDimensionFilter(): DimensionFilter {
    const filter: DimensionFilter = {}
    
    if (this.filters.country) filter.country = this.filters.country
    if (this.filters.device) filter.device = this.filters.device
    if (this.filters.browser) filter.browser = this.filters.browser
    if (this.filters.provider) filter.provider = this.filters.provider
    
    return filter
  }

  // ============================================================================
  // CHART UPDATE METHODS
  // ============================================================================

  private updateCharts(data: AnalyticsResponse) {
    this.updateTimelineChart(data)
    this.updateCountryChart(data)
    this.updateBrowserChart(data)
    this.updateDeviceChart(data)
  }

  private updateTimelineChart(data: AnalyticsResponse) {
    const timeline = data.timeline.slice(-30) // Last 30 data points
    
    this.timelineChartData = {
      labels: timeline.map(item => 
        new Date(item.date).toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric' 
        })
      ),
      datasets: [
        {
          label: 'New Guests',
          data: timeline.map(item => item.newGuests),
          borderColor: '#10B981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          fill: true,
          tension: 0.4
        },
        {
          label: 'New Users',
          data: timeline.map(item => item.newUsers),
          borderColor: '#6366F1',
          backgroundColor: 'rgba(99, 102, 241, 0.1)',
          fill: true,
          tension: 0.4
        },
        {
          label: 'Logins',
          data: timeline.map(item => item.totalLogins),
          borderColor: '#F59E0B',
          backgroundColor: 'rgba(245, 158, 11, 0.1)',
          fill: false,
          tension: 0.4
        }
      ]
    }
  }

  private updateCountryChart(data: AnalyticsResponse) {
    const topCountries = data.breakdowns.byCountry.slice(0, 10)
    
    this.countryChartData = {
      labels: topCountries.map(item => item.country),
      datasets: [{
        label: 'Visitors by Country',
        data: topCountries.map(item => item.count),
        backgroundColor: '#3B82F6',
        borderRadius: 8,
        borderSkipped: false
      }]
    }
  }

  private updateBrowserChart(data: AnalyticsResponse) {
    const browsers = data.breakdowns.byBrowser.slice(0, 8)
    
    this.browserChartData = {
      labels: browsers.map(item => item.browser),
      datasets: [{
        data: browsers.map(item => item.count),
        backgroundColor: [
          '#3B82F6', '#10B981', '#F59E0B', '#EF4444', 
          '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'
        ],
        borderWidth: 3,
        borderColor: '#fff',
        hoverBorderWidth: 4
      }]
    }
  }

  private updateDeviceChart(data: AnalyticsResponse) {
    const devices = data.breakdowns.byDevice
    
    this.deviceChartData = {
      labels: devices.map(item => item.device),
      datasets: [{
        data: devices.map(item => item.count),
        backgroundColor: ['#6366F1', '#EC4899', '#10B981', '#F59E0B'],
        borderWidth: 3,
        borderColor: '#fff'
      }]
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  async refreshData() {
    this.loading = true
    this.error = null
    
    try {
      await this.loadDashboardSummary()
      await this.applyFilters()
      console.log('🔄 Data refreshed successfully')
    } catch (err) {
      this.error = 'Failed to refresh data'
      console.error('❌ Refresh error:', err)
    } finally {
      this.loading = false
      this.cdr.detectChanges()
    }
  }

  formatNumber(num: number): string {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M'
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K'
    }
    return num.toString()
  }

  getTrendIcon(growth: number): string {
    if (growth > 0) return 'trending-up'
    if (growth < 0) return 'trending-down'
    return 'minus'
  }

  getTrendClass(growth: number): string {
    if (growth > 0) return 'text-green-500'
    if (growth < 0) return 'text-red-500'
    return 'text-gray-500'
  }

  getConnectionStatus(): string {
    if (this.isRealtime && this.dashboardSummary) {
      const lastUpdate = this.dashboardSummary.lastUpdated.toDate()
      const timeDiff = Date.now() - lastUpdate.getTime()
      
      if (timeDiff < 30000) return 'Live' // Less than 30 seconds
      if (timeDiff < 300000) return 'Recent' // Less than 5 minutes
      return 'Stale'
    }
    
    return 'Static'
  }

  getStatusClass(): string {
    const status = this.getConnectionStatus()
    switch (status) {
      case 'Live': return 'text-green-500'
      case 'Recent': return 'text-yellow-500'
      case 'Stale': return 'text-red-500'
      default: return 'text-gray-500'
    }
  }
}
