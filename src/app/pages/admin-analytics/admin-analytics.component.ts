import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CommonModule, DecimalPipe, NgClass } from '@angular/common';
import { FormControl, FormsModule } from '@angular/forms';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData } from 'chart.js';
import { FirestoreService } from '../../core/services';
import { LucideAngularModule } from 'lucide-angular';
import { myIcons } from '../../shared/lucideicons';
import { RouterLink } from '@angular/router';
import { DropdownComponent } from 'src/app/core/components/dropdown/dropdown.component';

interface DayActivity {
    date: string;
    logins: number;
    newUsers: number;
    trend: number;
}

type AnalyticsPeriod = 'last-30m' | 'last-1h' | 'last-24h' | 'last-7d' | 'last-30d' | 'last-90d' | 'custom';

@Component({
    selector: 'app-admin-analytics',
    imports: [BaseChartDirective, DecimalPipe, NgClass, LucideAngularModule, RouterLink, FormsModule, DropdownComponent],
    templateUrl: './admin-analytics.component.html',
    styleUrls: ['./admin-analytics.component.scss']
})
export class AdminAnalyticsComponent implements OnInit {
    private firestoreService = inject(FirestoreService);
    private cdr = inject(ChangeDetectorRef);

    // Data properties
    loading = true;
    error: string | null = null;
    guestCount = 0;
    registeredGuestsCount = 0;
    unregisteredGuestsCount = 0;
    userCount = 0;
    activeUsersNow = 0;
    activeGuestsNow = 0;
    onlineNow = 0;
    totalLogins = 0;
    conversionRate = 0;
    guestConversionRate = 0;
    recentActivity: DayActivity[] = [];
    Math = Math;
    readonly icons = myIcons;
    displayPeriodDays = 7;

    // Caching for performance optimization
    private cacheTimestamp: number | null = null;
    private cachedPeriodKey: string | null = null;
    private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
    private cachedDashboard: any = null;
    private cachedRangeMetrics: any = null;

    // Filter state
    selectedPeriod: AnalyticsPeriod = 'last-7d';
    readonly periodControl = new FormControl<{ name: string; code: AnalyticsPeriod }>({
        name: 'Last 7 days',
        code: 'last-7d'
    }, { nonNullable: true });
    customStartDate = this.getDateOffset(-7);
    customEndDate = this.getDateOffset(0);
    readonly periodOptions: Array<{ value: AnalyticsPeriod; label: string }> = [
        { value: 'last-30m', label: 'Last 30 minutes' },
        { value: 'last-1h', label: 'Last 1 hour' },
        { value: 'last-24h', label: 'Last 24 hours' },
        { value: 'last-7d', label: 'Last 7 days' },
        { value: 'last-30d', label: 'Last 30 days' },
        { value: 'last-90d', label: 'Last 90 days' },
        { value: 'custom', label: 'Custom range' },
    ];
    readonly periodDropdownOptions: Array<{ name: string; code: AnalyticsPeriod }> = this.periodOptions.map(option => ({
        name: option.label,
        code: option.value,
    }));

    // Line Chart Configuration
    public lineChartData: ChartData<'line'> = {
        labels: [],
        datasets: [{
            label: 'Logins',
            data: [],
            borderColor: '#6366F1',
            backgroundColor: 'rgba(99, 102, 241, 0.1)',
            fill: true,
            tension: 0.4
        }]
    };
    public lineChartOptions: ChartConfiguration<'line'>['options'] = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: { mode: 'index', intersect: false }
        },
        scales: {
            y: { beginAtZero: true, grid: { color: 'rgba(0, 0, 0, 0.05)' } },
            x: { grid: { display: false } }
        }
    }; public lineChartType = 'line' as const;

    // Bar Chart Configuration
    public barChartData: ChartData<'bar'> = {
        labels: [],
        datasets: [
            {
                label: 'Guests',
                data: [],
                backgroundColor: '#42A5F5'
            },
            {
                label: 'Authenticated',
                data: [],
                backgroundColor: '#66BB6A'
            }
        ]
    };
    public barChartOptions: ChartConfiguration<'bar'>['options'] = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'top' } },
        scales: {
            y: { beginAtZero: true, stacked: true, grid: { color: 'rgba(0, 0, 0, 0.05)' } },
            x: { stacked: true, grid: { display: false } }
        }
    }; public barChartType = 'bar' as const;

    // Pie Chart Configuration
    public pieChartData: ChartData<'pie'> = {
        labels: ['Guests', 'Authenticated Users'],
        datasets: [{
            data: [0, 0],
            backgroundColor: ['#42A5F5', '#66BB6A'],
            borderWidth: 2,
            borderColor: '#fff'
        }]
    };
    public pieChartOptions: ChartConfiguration<'pie'>['options'] = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom' } }
    }; public pieChartType = 'pie' as const;

    // Doughnut Chart Configuration
    public doughnutChartData: ChartData<'doughnut'> = {
        labels: ['Email/Password', 'Google', 'GitHub', 'Phone'],
        datasets: [{
            data: [45, 30, 20, 5],
            backgroundColor: ['#6366F1', '#EC4899', '#F59E0B', '#10B981'],
            borderWidth: 2,
            borderColor: '#fff'
        }]
    };
    public doughnutChartOptions: ChartConfiguration<'doughnut'>['options'] = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom' } }
    }; public doughnutChartType = 'doughnut' as const;

    // Radar Chart Configuration
    public radarChartData: ChartData<'radar'> = {
        labels: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'],
        datasets: [{
            label: 'Activity',
            data: [10, 5, 25, 40, 35, 20],
            backgroundColor: 'rgba(99, 102, 241, 0.2)',
            borderColor: '#6366F1',
            pointBackgroundColor: '#6366F1',
            pointBorderColor: '#fff',
            pointHoverBackgroundColor: '#fff',
            pointHoverBorderColor: '#6366F1'
        }]
    };
    public radarChartOptions: ChartConfiguration<'radar'>['options'] = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
            r: { beginAtZero: true, grid: { color: 'rgba(0, 0, 0, 0.05)' } }
        }
    }; public radarChartType = 'radar' as const;

    // NEW GUEST ANALYTICS CHARTS

    // Guest Conversion Chart (Registered vs Unregistered)
    public guestConversionChartData: ChartData<'doughnut'> = {
        labels: ['Registered', 'Unregistered'],
        datasets: [{
            data: [0, 0],
            backgroundColor: ['#10B981', '#EF4444'],
            borderWidth: 2,
            borderColor: '#fff'
        }]
    };
    public guestConversionChartOptions: ChartConfiguration<'doughnut'>['options'] = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { position: 'bottom' },
            tooltip: {
                callbacks: {
                    label: (context) => {
                        const label = context.label || '';
                        const value = context.parsed || 0;
                        const total = context.dataset.data.reduce((a: any, b: any) => a + b, 0);
                        const percentage = ((value / total) * 100).toFixed(1);
                        return `${label}: ${value} (${percentage}%)`;
                    }
                }
            }
        }
    };
    public guestConversionChartType = 'doughnut' as const;

    // Guest by Country Chart (Top 10)
    public guestCountryChartData: ChartData<'bar'> = {
        labels: [],
        datasets: [{
            label: 'Guests by Country',
            data: [],
            backgroundColor: '#3B82F6',
            borderRadius: 6
        }]
    };
    public guestCountryChartOptions: ChartConfiguration<'bar'>['options'] = {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',
        plugins: { legend: { display: false } },
        scales: {
            x: { beginAtZero: true, grid: { color: 'rgba(0, 0, 0, 0.05)' } },
            y: { grid: { display: false } }
        }
    };
    public guestCountryChartType = 'bar' as const;

    // Guest by Browser Chart
    public guestBrowserChartData: ChartData<'pie'> = {
        labels: [],
        datasets: [{
            data: [],
            backgroundColor: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'],
            borderWidth: 2,
            borderColor: '#fff'
        }]
    };
    public guestBrowserChartOptions: ChartConfiguration<'pie'>['options'] = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'right' } }
    };
    public guestBrowserChartType = 'pie' as const;

    // Guest by Device Chart
    public guestDeviceChartData: ChartData<'doughnut'> = {
        labels: [],
        datasets: [{
            data: [],
            backgroundColor: ['#6366F1', '#EC4899', '#10B981', '#F59E0B'],
            borderWidth: 2,
            borderColor: '#fff'
        }]
    };
    public guestDeviceChartOptions: ChartConfiguration<'doughnut'>['options'] = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom' } }
    };
    public guestDeviceChartType = 'doughnut' as const;

    // Guest by OS Chart
    public guestOSChartData: ChartData<'bar'> = {
        labels: [],
        datasets: [{
            label: 'Operating Systems',
            data: [],
            backgroundColor: '#8B5CF6',
            borderRadius: 6
        }]
    };
    public guestOSChartOptions: ChartConfiguration<'bar'>['options'] = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
            y: { beginAtZero: true, grid: { color: 'rgba(0, 0, 0, 0.05)' } },
            x: { grid: { display: false } }
        }
    };
    public guestOSChartType = 'bar' as const;

    // Guest by Timezone Chart
    public guestTimezoneChartData: ChartData<'bar'> = {
        labels: [],
        datasets: [{
            label: 'Timezones',
            data: [],
            backgroundColor: '#0EA5E9',
            borderRadius: 6
        }]
    };
    public guestTimezoneChartOptions: ChartConfiguration<'bar'>['options'] = {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',
        plugins: { legend: { display: false } },
        scales: {
            x: { beginAtZero: true, grid: { color: 'rgba(0, 0, 0, 0.05)' } },
            y: { grid: { display: false } }
        }
    };
    public guestTimezoneChartType = 'bar' as const;

    // Guest Activity Over Time
    public guestActivityChartData: ChartData<'line'> = {
        labels: [],
        datasets: [{
            label: 'New Guests',
            data: [],
            borderColor: '#10B981',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            fill: true,
            tension: 0.4
        }]
    };
    public guestActivityChartOptions: ChartConfiguration<'line'>['options'] = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: { mode: 'index', intersect: false }
        },
        scales: {
            y: { beginAtZero: true, grid: { color: 'rgba(0, 0, 0, 0.05)' } },
            x: { grid: { display: false } }
        }
    };
    public guestActivityChartType = 'line' as const;

    get selectedPeriodLabel(): string {
        return this.periodOptions.find(option => option.value === this.selectedPeriod)?.label ?? 'Selected period';
    }

    ngOnInit(): void {
        void this.initializeAnalytics();
    }

    private async initializeAnalytics(): Promise<void> {
        this.loading = true;
        this.error = null;
        try {
            await this.loadAnalyticsData();
        } catch (err) {
            this.error = 'Failed to load analytics data';
            console.error(err);
        } finally {
            this.loading = false;
            this.renderNow();
        }
    }

    onPeriodSelected(option: { name: string; code: AnalyticsPeriod }): void {
        this.selectedPeriod = option.code;
        this.onPeriodChanged();
    }

    async loadAnalyticsData(forceRefresh = false) {
        const now = Date.now();
        const periodKey = this.getPeriodCacheKey();
        
        // Return cached data if still fresh
        if (!forceRefresh && this.isCacheValid(now) && this.cachedPeriodKey === periodKey) {
            console.log('✅ Using cached analytics data');
            this.updateChartsFromOptimizedData(this.cachedDashboard, this.cachedRangeMetrics);
            return;
        }

        // ✅ OPTIMIZED: Fetch pre-aggregated dashboard summary (1 read instead of 3+)
        const dashboardSummary = await this.firestoreService.getDashboardSummary();

        if (!dashboardSummary) {
            console.warn('⚠️ Dashboard summary not available, falling back to legacy queries');
            return this.loadAnalyticsDataLegacy();
        }

        // Extract metrics from single document
        this.guestCount = dashboardSummary.totalGuests || 0;
        this.userCount = dashboardSummary.totalUsers || 0;
        this.activeUsersNow = dashboardSummary.activeUsersNow || 0;
        this.activeGuestsNow = dashboardSummary.activeGuestsNow || 0;
        this.onlineNow = dashboardSummary.onlineNow || (this.activeUsersNow + this.activeGuestsNow);
        this.totalLogins = dashboardSummary.totalLogins || 0;
        this.conversionRate = dashboardSummary.conversionRate || 0;
        
        // Guest conversion metrics
        this.registeredGuestsCount = dashboardSummary.guestConversions || 0;
        this.unregisteredGuestsCount = this.guestCount - this.registeredGuestsCount;
        this.guestConversionRate = this.guestCount > 0
            ? Math.round((this.registeredGuestsCount / this.guestCount) * 10000) / 100
            : 0;

        // Get time-series data for charts based on selected period
        const rangeMetrics = await this.resolveMetricsForSelectedPeriod();

        if (rangeMetrics) {
            this.totalLogins = rangeMetrics.totalLogins ?? this.totalLogins;
            this.conversionRate = rangeMetrics.conversionRate ?? this.conversionRate;
        }
        
        // Update cache
        this.cachedDashboard = dashboardSummary;
        this.cachedRangeMetrics = rangeMetrics;
        this.cacheTimestamp = now;
        this.cachedPeriodKey = periodKey;
        
        console.log('✅ Analytics data loaded from optimized backend');
        
        // Update all charts with optimized data
        this.updateChartsFromOptimizedData(dashboardSummary, rangeMetrics);
        this.renderNow();
    }

    async refreshData() {
        this.loading = true;
        this.error = null;
        this.cacheTimestamp = null; // Invalidate cache
        
        try {
            await this.loadAnalyticsData(true);
        } catch (err) {
            this.error = 'Failed to refresh data';
            console.error(err);
        } finally {
            this.loading = false;
            this.renderNow();
        }
    }

    private renderNow(): void {
        this.cdr.detectChanges();
    }

    async onPeriodChanged() {
        if (this.selectedPeriod !== 'custom') {
            await this.refreshData();
        }
    }

    async applyCustomRange() {
        this.selectedPeriod = 'custom';
        await this.refreshData();
    }

    private isCacheValid(now: number): boolean {
        return this.cacheTimestamp !== null &&
               (now - this.cacheTimestamp) < this.CACHE_TTL_MS &&
               this.cachedDashboard !== null;
    }

    private updateChartsFromOptimizedData(dashboard: any, rangeMetrics: any) {
        this.applyDisplayMetrics(dashboard, rangeMetrics);

        // Extract daily breakdown for time-series charts
        const dailyData = rangeMetrics?.dailyBreakdown || [];
        const labels = dailyData.map((day: any) => {
            const parsed = new Date(day.date);
            if (Number.isNaN(parsed.getTime())) {
                return String(day.date);
            }
            const hasTime = String(day.date).includes('T');
            return parsed.toLocaleDateString('en-US', hasTime ?
                { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' } :
                { month: 'short', day: 'numeric' });
        });
        const loginData = dailyData.map((day: any) => day.totalLogins || 0);
        const newGuestsData = dailyData.map((day: any) => day.newGuests || 0);
        const newUsersData = dailyData.map((day: any) => day.newUsers || 0);

        // Update Line Chart - Login Trend
        this.lineChartData = {
            labels: labels,
            datasets: [{
                label: 'Logins',
                data: loginData,
                borderColor: '#6366F1',
                backgroundColor: 'rgba(99, 102, 241, 0.1)',
                fill: true,
                tension: 0.4
            }]
        };

        // Update Bar Chart - Guests vs Authenticated
        this.barChartData = {
            labels: labels,
            datasets: [
                {
                    label: 'Guests',
                    data: newGuestsData,
                    backgroundColor: '#42A5F5'
                },
                {
                    label: 'Authenticated',
                    data: newUsersData,
                    backgroundColor: '#66BB6A'
                }
            ]
        };

        // Update Pie Chart - Total Distribution
        this.pieChartData = {
            labels: ['Guests', 'Authenticated Users'],
            datasets: [{
                data: [this.guestCount, this.userCount],
                backgroundColor: ['#42A5F5', '#66BB6A'],
                borderWidth: 2,
                borderColor: '#fff'
            }]
        };

        // Login methods (providers)
        const providerEntries = this.getTopDimensionEntries(
            rangeMetrics?.byProvider ?? dashboard.topProviders ?? {},
            8,
            'unknown',
        );
        this.doughnutChartData = {
            labels: providerEntries.map(([provider]) => provider),
            datasets: [{
                data: providerEntries.map(([, count]) => count),
                backgroundColor: ['#6366F1', '#EC4899', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#14B8A6', '#F43F5E'],
                borderWidth: 2,
                borderColor: '#fff'
            }]
        };

        // Guest Conversion Chart
        this.guestConversionChartData = {
            labels: ['Registered', 'Unregistered'],
            datasets: [{
                data: [this.registeredGuestsCount, this.unregisteredGuestsCount],
                backgroundColor: ['#10B981', '#EF4444'],
                borderWidth: 2,
                borderColor: '#fff'
            }]
        };

        // Guest by Country Chart (Top 10 from selected range, fallback to dashboard summary)
        const topCountriesSource =
            rangeMetrics?.byCountry ??
            dashboard.topCountries ??
            dashboard.byCountry ??
            {};
        const topCountries = this.getTopDimensionEntries(topCountriesSource, 10, 'Unknown Country');
        this.guestCountryChartData = {
            labels: topCountries.map(([country]) => country),
            datasets: [{
                label: 'Guests by Country',
                data: topCountries.map(([, count]) => count),
                backgroundColor: '#3B82F6',
                borderRadius: 6
            }]
        };

        // Guest by Browser Chart
        const topBrowsers = this.getTopDimensionEntries(
            rangeMetrics?.byBrowser ?? dashboard.topBrowsers ?? dashboard.byBrowser ?? {},
            10,
            'Unknown Browser',
        );
        this.guestBrowserChartData = {
            labels: topBrowsers.map(([browser]) => browser),
            datasets: [{
                data: topBrowsers.map(([, count]) => count),
                backgroundColor: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'],
                borderWidth: 2,
                borderColor: '#fff'
            }]
        };

        // Guest by Device Chart
        const topDevices = this.getTopDimensionEntries(
            rangeMetrics?.byDevice ?? dashboard.topDevices ?? dashboard.byDevice ?? {},
            10,
            'Unknown Device',
        );
        this.guestDeviceChartData = {
            labels: topDevices.map(([device]) => device),
            datasets: [{
                data: topDevices.map(([, count]) => count),
                backgroundColor: ['#6366F1', '#EC4899', '#10B981', '#F59E0B'],
                borderWidth: 2,
                borderColor: '#fff'
            }]
        };

        // Guest by OS Chart (from selected range with dashboard fallback)
        const osSource =
            rangeMetrics?.byOS ??
            dashboard.topOperatingSystems ??
            dashboard.topOS ??
            dashboard.byOS ??
            {};
        const osEntries = this.getTopDimensionEntries(osSource, 10, 'Unknown OS');

        this.guestOSChartData = {
            labels: osEntries.map(([os]) => os),
            datasets: [{
                label: 'Operating Systems',
                data: osEntries.map(([, count]) => count),
                backgroundColor: '#8B5CF6',
                borderRadius: 6
            }]
        };

        const timezoneEntries = this.getTopDimensionEntries(
            rangeMetrics?.byTimezone ?? dashboard.byTimezone ?? {},
            10,
            'Unknown Timezone',
        );
        this.guestTimezoneChartData = {
            labels: timezoneEntries.map(([timezone]) => timezone),
            datasets: [{
                label: 'Timezones',
                data: timezoneEntries.map(([, count]) => count),
                backgroundColor: '#0EA5E9',
                borderRadius: 6,
            }],
        };

        // Guest Activity Over Time
        this.guestActivityChartData = {
            labels: labels,
            datasets: [{
                label: 'New Guests',
                data: newGuestsData,
                borderColor: '#10B981',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                fill: true,
                tension: 0.4
            }]
        };

        // Generate recent activity data
        this.recentActivity = dailyData.slice(-7).map((day: any) => ({
            date: new Date(day.date).toLocaleDateString(),
            logins: day.totalLogins || 0,
            newUsers: day.newUsers || 0,
            trend: day.conversionRate || 0
        }));

        this.renderNow();
    }

    private applyDisplayMetrics(dashboard: any, rangeMetrics: any): void {
        const dailyBreakdown = Array.isArray(rangeMetrics?.dailyBreakdown) ? rangeMetrics.dailyBreakdown : [];

        const getNumber = (value: any): number | null => {
            const parsed = Number(value);
            return Number.isFinite(parsed) ? parsed : null;
        };

        const firstNumber = (source: any, keys: string[]): number | null => {
            if (!source) {
                return null;
            }
            for (const key of keys) {
                const value = getNumber(source[key]);
                if (value !== null) {
                    return value;
                }
            }
            return null;
        };

        const sumDaily = (key: string): number =>
            dailyBreakdown.reduce((sum: number, row: any) => sum + Number(row?.[key] || 0), 0);

        const periodGuests =
            firstNumber(rangeMetrics, ['totalGuests', 'newGuests'])
            ?? (dailyBreakdown.length > 0 ? sumDaily('newGuests') : null)
            ?? firstNumber(dashboard, ['totalGuests'])
            ?? 0;

        const periodUsers =
            firstNumber(rangeMetrics, ['totalUsers', 'newUsers'])
            ?? (dailyBreakdown.length > 0 ? sumDaily('newUsers') : null)
            ?? firstNumber(dashboard, ['totalUsers'])
            ?? 0;

        const periodLogins =
            firstNumber(rangeMetrics, ['totalLogins', 'logins'])
            ?? (dailyBreakdown.length > 0 ? sumDaily('totalLogins') : null)
            ?? firstNumber(dashboard, ['totalLogins'])
            ?? 0;

        const periodGuestConversions =
            firstNumber(rangeMetrics, ['guestConversions', 'registeredGuests', 'conversions'])
            ?? (dailyBreakdown.length > 0 ? sumDaily('guestConversions') : null)
            ?? firstNumber(dashboard, ['guestConversions'])
            ?? 0;

        this.guestCount = periodGuests;
        this.userCount = periodUsers;
        this.totalLogins = periodLogins;
        this.registeredGuestsCount = periodGuestConversions;
        this.unregisteredGuestsCount = Math.max(periodGuests - periodGuestConversions, 0);
        this.guestConversionRate = periodGuests > 0
            ? Math.round((periodGuestConversions / periodGuests) * 10000) / 100
            : 0;

        const resolvedConversionRate =
            firstNumber(rangeMetrics, ['conversionRate'])
            ?? firstNumber(dashboard, ['conversionRate'])
            ?? (periodGuests > 0 ? Math.round((periodGuestConversions / periodGuests) * 100) : 0);

        this.conversionRate = Number(resolvedConversionRate || 0);

        this.activeUsersNow = Number(
            firstNumber(rangeMetrics, ['activeUsersNow', 'activeUsers'])
            ?? firstNumber(dashboard, ['activeUsersNow', 'activeUsers'])
            ?? 0
        );
        this.activeGuestsNow = Number(
            firstNumber(rangeMetrics, ['activeGuestsNow', 'activeGuests'])
            ?? firstNumber(dashboard, ['activeGuestsNow', 'activeGuests'])
            ?? 0
        );
        this.onlineNow = Number(
            firstNumber(rangeMetrics, ['onlineNow', 'online'])
            ?? firstNumber(dashboard, ['onlineNow', 'online'])
            ?? (this.activeUsersNow + this.activeGuestsNow)
        );
        this.displayPeriodDays = this.resolvePeriodDays(rangeMetrics);
    }

    private resolvePeriodDays(rangeMetrics: any): number {
        const start = new Date(rangeMetrics?.startDate ?? '');
        const end = new Date(rangeMetrics?.endDate ?? '');
        if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) {
            const ms = Math.max(end.getTime() - start.getTime(), 0);
            return Math.max(1, Math.floor(ms / (24 * 60 * 60 * 1000)) + 1);
        }

        if (this.selectedPeriod === 'last-30d') {
            return 30;
        }
        if (this.selectedPeriod === 'last-90d') {
            return 90;
        }
        if (this.selectedPeriod === 'last-24h') {
            return 1;
        }
        if (this.selectedPeriod === 'last-1h' || this.selectedPeriod === 'last-30m') {
            return 1;
        }

        return 7;
    }

    private async resolveMetricsForSelectedPeriod(): Promise<any> {
        switch (this.selectedPeriod) {
            case 'last-7d':
            case 'last-30d':
            case 'last-90d':
                return this.firestoreService.getRangeMetrics(this.selectedPeriod);
            case 'last-24h':
                return this.buildHourlyRangeMetrics(24, 'last-24h');
            case 'last-1h':
                return this.buildHourlyRangeMetrics(1, 'last-1h');
            case 'last-30m':
                return this.buildHourlyRangeMetrics(1, 'last-30m');
            case 'custom':
                return this.buildCustomDateRangeMetrics();
            default:
                return this.firestoreService.getRangeMetrics('last-7d');
        }
    }

    private async buildCustomDateRangeMetrics(): Promise<any> {
        if (!this.customStartDate || !this.customEndDate) {
            return this.firestoreService.getRangeMetrics('last-7d');
        }

        const rows = await this.firestoreService.getMetricsByDateRange(this.customStartDate, this.customEndDate);
        const sorted = [...rows].sort((a: any, b: any) => String(a.date || '').localeCompare(String(b.date || '')));

        const byOS: Record<string, number> = {};
        const byCountry: Record<string, number> = {};
        const byBrowser: Record<string, number> = {};
        const byDevice: Record<string, number> = {};
        const byTimezone: Record<string, number> = {};
        const byProvider: Record<string, number> = {};

        let totalGuests = 0;
        let totalUsers = 0;
        let totalLogins = 0;
        let guestConversions = 0;

        for (const row of sorted) {
            totalGuests += Number(row.newGuests || 0);
            totalUsers += Number(row.newUsers || 0);
            totalLogins += Number(row.totalLogins || 0);
            guestConversions += Number(row.guestConversions || 0);

            Object.entries((row.byOS || {}) as Record<string, number>).forEach(([k, v]) => {
                const normalized = this.normalizeDimensionKey(k);
                byOS[normalized] = (byOS[normalized] || 0) + Number(v || 0);
            });
            Object.entries((row.byCountry || {}) as Record<string, number>).forEach(([k, v]) => {
                const normalized = this.normalizeDimensionKey(k, 'Unknown Country');
                byCountry[normalized] = (byCountry[normalized] || 0) + Number(v || 0)
            });
            Object.entries((row.byBrowser || {}) as Record<string, number>).forEach(([k, v]) => {
                const normalized = this.normalizeDimensionKey(k, 'Unknown Browser');
                byBrowser[normalized] = (byBrowser[normalized] || 0) + Number(v || 0)
            });
            Object.entries((row.byDevice || {}) as Record<string, number>).forEach(([k, v]) => {
                const normalized = this.normalizeDimensionKey(k, 'Unknown Device');
                byDevice[normalized] = (byDevice[normalized] || 0) + Number(v || 0)
            });
            Object.entries((row.byTimezone || {}) as Record<string, number>).forEach(([k, v]) => {
                const normalized = this.normalizeDimensionKey(k, 'Unknown Timezone');
                byTimezone[normalized] = (byTimezone[normalized] || 0) + Number(v || 0)
            });
            Object.entries((row.byProvider || {}) as Record<string, number>).forEach(([k, v]) => {
                const normalized = this.normalizeDimensionKey(k, 'unknown');
                byProvider[normalized] = (byProvider[normalized] || 0) + Number(v || 0)
            });
        }

        return {
            rangeId: 'custom',
            startDate: this.customStartDate,
            endDate: this.customEndDate,
            totalGuests,
            totalUsers,
            totalLogins,
            guestConversions,
            conversionRate: totalGuests > 0 ? Math.round((guestConversions / totalGuests) * 100) : 0,
            byOS,
            byCountry,
            byBrowser,
            byDevice,
            byTimezone,
            byProvider,
            dailyBreakdown: sorted.map((row: any) => ({
                date: row.date,
                newGuests: Number(row.newGuests || 0),
                newUsers: Number(row.newUsers || 0),
                totalLogins: Number(row.totalLogins || 0),
                guestConversions: Number(row.guestConversions || 0),
                conversionRate: Number(row.conversionRate || 0),
            })),
        };
    }

    private async buildHourlyRangeMetrics(hours: number, rangeId: string): Promise<any> {
        const end = new Date();
        const start = new Date(end.getTime() - (hours * 60 * 60 * 1000));

        const rows = await this.firestoreService.getHourlyMetricsByDateTimeRange(
            this.toDateTimeKey(start),
            this.toDateTimeKey(end),
        );

        const totalGuests = rows.reduce((sum: number, row: any) => sum + Number(row.newGuests || 0), 0);
        const totalUsers = rows.reduce((sum: number, row: any) => sum + Number(row.newUsers || 0), 0);
        const totalLogins = rows.reduce((sum: number, row: any) => sum + Number(row.totalLogins || 0), 0);
        const guestConversions = rows.reduce((sum: number, row: any) => sum + Number(row.guestConversions || 0), 0);

        const byOS: Record<string, number> = {};
        const byCountry: Record<string, number> = {};
        const byBrowser: Record<string, number> = {};
        const byDevice: Record<string, number> = {};

        for (const row of rows) {
            Object.entries((row.byOS || {}) as Record<string, number>).forEach(([k, v]) => {
                const normalized = this.normalizeDimensionKey(k, 'Unknown OS');
                byOS[normalized] = (byOS[normalized] || 0) + Number(v || 0);
            });
            Object.entries((row.byCountry || {}) as Record<string, number>).forEach(([k, v]) => {
                const normalized = this.normalizeDimensionKey(k, 'Unknown Country');
                byCountry[normalized] = (byCountry[normalized] || 0) + Number(v || 0);
            });
            Object.entries((row.byBrowser || {}) as Record<string, number>).forEach(([k, v]) => {
                const normalized = this.normalizeDimensionKey(k, 'Unknown Browser');
                byBrowser[normalized] = (byBrowser[normalized] || 0) + Number(v || 0);
            });
            Object.entries((row.byDevice || {}) as Record<string, number>).forEach(([k, v]) => {
                const normalized = this.normalizeDimensionKey(k, 'Unknown Device');
                byDevice[normalized] = (byDevice[normalized] || 0) + Number(v || 0);
            });
        }

        return {
            rangeId,
            startDate: start.toISOString(),
            endDate: end.toISOString(),
            totalGuests,
            totalUsers,
            totalLogins,
            guestConversions,
            conversionRate: totalGuests > 0 ? Math.round((guestConversions / totalGuests) * 100) : 0,
            byOS,
            byCountry,
            byBrowser,
            byDevice,
            dailyBreakdown: rows.map((row: any) => ({
                date: `${row.date}T${String(row.hour ?? 0).padStart(2, '0')}:00:00.000Z`,
                newGuests: Number(row.newGuests || 0),
                newUsers: Number(row.newUsers || 0),
                totalLogins: Number(row.totalLogins || 0),
                guestConversions: Number(row.guestConversions || 0),
                conversionRate: Number(row.newGuests || 0) > 0 ? Math.round((Number(row.guestConversions || 0) / Number(row.newGuests || 0)) * 100) : 0,
            })),
        };
    }

    private getPeriodCacheKey(): string {
        if (this.selectedPeriod !== 'custom') {
            return this.selectedPeriod;
        }
        return `custom:${this.customStartDate}:${this.customEndDate}`;
    }

    private toDateTimeKey(date: Date): string {
        const y = date.getUTCFullYear();
        const m = String(date.getUTCMonth() + 1).padStart(2, '0');
        const d = String(date.getUTCDate()).padStart(2, '0');
        const h = String(date.getUTCHours()).padStart(2, '0');
        return `${y}-${m}-${d}-${h}`;
    }

    private getDateOffset(offsetDays: number): string {
        const date = new Date();
        date.setUTCDate(date.getUTCDate() + offsetDays);
        return date.toISOString().slice(0, 10);
    }

    /**
     * Legacy fallback method (only used if optimized backend data not available)
     * @deprecated Use loadAnalyticsData() which fetches optimized pre-aggregated data
     */
    private async loadAnalyticsDataLegacy() {
        console.warn('⚠️ Using legacy analytics queries - this is less efficient');
        
        // Fetch comprehensive guest analytics in one call
        const guestAnalytics = await this.firestoreService.getComprehensiveGuestAnalytics();

        if (!guestAnalytics) {
            throw new Error('Failed to load guest analytics');
        }

        // Set guest counts
        this.guestCount = guestAnalytics.total;
        this.registeredGuestsCount = guestAnalytics.registered;
        this.unregisteredGuestsCount = guestAnalytics.unregistered;
        this.guestConversionRate = this.guestCount > 0
            ? Math.round((this.registeredGuestsCount / this.guestCount) * 10000) / 100
            : 0;

        // Fetch user and login data
        this.userCount = await this.firestoreService.getAuthenticatedUserCount();
        const loginCountsByDay = await this.firestoreService.getLoginCountsByDay(7);

        // Calculate metrics
        this.totalLogins = Object.values(loginCountsByDay).reduce((a, b) => a + b, 0);
        this.conversionRate = this.guestCount > 0
            ? Math.round((this.userCount / (this.guestCount + this.userCount)) * 100)
            : 0;

        // Update charts with legacy data structure
        this.updateChartsFromLegacyData(guestAnalytics, loginCountsByDay);
        this.renderNow();
    }

    /**
     * Update charts using legacy data structure
     */
    private updateChartsFromLegacyData(guestAnalytics: any, loginCountsByDay: any) {
        // Prepare login chart data
        const labels = Object.keys(loginCountsByDay).map(date =>
            new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        );
        const loginData = Object.values(loginCountsByDay);

        // Update Line Chart
        this.lineChartData = {
            labels: labels,
            datasets: [{
                label: 'Logins',
                data: loginData as number[],
                borderColor: '#6366F1',
                backgroundColor: 'rgba(99, 102, 241, 0.1)',
                fill: true,
                tension: 0.4
            }]
        };

        // Update Bar Chart
        this.barChartData = {
            labels: labels,
            datasets: [
                {
                    label: 'Guests',
                    data: (loginData as number[]).map(val => Math.floor(val * 0.4)),
                    backgroundColor: '#42A5F5'
                },
                {
                    label: 'Authenticated',
                    data: (loginData as number[]).map(val => Math.floor(val * 0.6)),
                    backgroundColor: '#66BB6A'
                }
            ]
        };

        // Update Pie Chart
        this.pieChartData = {
            labels: ['Guests', 'Authenticated Users'],
            datasets: [{
                data: [this.guestCount, this.userCount],
                backgroundColor: ['#42A5F5', '#66BB6A'],
                borderWidth: 2,
                borderColor: '#fff'
            }]
        };

        // Guest Conversion Chart
        this.guestConversionChartData = {
            labels: ['Registered', 'Unregistered'],
            datasets: [{
                data: [this.registeredGuestsCount, this.unregisteredGuestsCount],
                backgroundColor: ['#10B981', '#EF4444'],
                borderWidth: 2,
                borderColor: '#fff'
            }]
        };

        // Guest by Country Chart (Top 10)
        const topCountries = Object.entries(guestAnalytics.byCountry)
            .sort(([, a], [, b]) => (b as number) - (a as number))
            .slice(0, 10);
        this.guestCountryChartData = {
            labels: topCountries.map(([country]) => country),
            datasets: [{
                label: 'Guests by Country',
                data: topCountries.map(([, count]) => count as number),
                backgroundColor: '#3B82F6',
                borderRadius: 6
            }]
        };

        // Guest by Browser Chart
        const browserEntries = Object.entries(guestAnalytics.byBrowser);
        this.guestBrowserChartData = {
            labels: browserEntries.map(([browser]) => browser),
            datasets: [{
                data: browserEntries.map(([, count]) => count as number),
                backgroundColor: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'],
                borderWidth: 2,
                borderColor: '#fff'
            }]
        };

        // Guest by Device Chart
        const deviceEntries = Object.entries(guestAnalytics.byDevice);
        this.guestDeviceChartData = {
            labels: deviceEntries.map(([device]) => device),
            datasets: [{
                data: deviceEntries.map(([, count]) => count as number),
                backgroundColor: ['#6366F1', '#EC4899', '#10B981', '#F59E0B'],
                borderWidth: 2,
                borderColor: '#fff'
            }]
        };

        // Guest by OS Chart
        const osEntries = this.getTopDimensionEntries(guestAnalytics.byOS, 10);
        this.guestOSChartData = {
            labels: osEntries.map(([os]) => os),
            datasets: [{
                label: 'Operating Systems',
                data: osEntries.map(([, count]) => count as number),
                backgroundColor: '#8B5CF6',
                borderRadius: 6
            }]
        };

        // Guest Activity Over Time Chart
        const activityDates = Object.keys(guestAnalytics.byDay).sort().slice(-7);
        this.guestActivityChartData = {
            labels: activityDates.map(date =>
                new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            ),
            datasets: [{
                label: 'New Guests',
                data: activityDates.map(date => guestAnalytics.byDay[date]),
                borderColor: '#10B981',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                fill: true,
                tension: 0.4
            }]
        };

        // Generate recent activity data
        const dateLabels = Object.keys(loginCountsByDay);
        this.recentActivity = dateLabels.map((date, index) => ({
            date: new Date(date).toLocaleDateString(),
            logins: (loginData as number[])[index] || 0,
            newUsers: Math.floor(((loginData as number[])[index] || 0) * 0.3),
            trend: index > 0 ? Math.round((((loginData as number[])[index] - (loginData as number[])[index - 1]) / (loginData as number[])[index - 1]) * 100) : 0
        }));
    }

    private normalizeDimensionKey(key: unknown, fallback = 'Unknown'): string {
        const normalized = String(key ?? '').trim();
        return normalized.length > 0 ? normalized : fallback;
    }

    private getTopDimensionEntries(source: unknown, max = 10, fallback = 'Unknown'): Array<[string, number]> {
        const merged: Record<string, number> = {};

        if (Array.isArray(source)) {
            source.forEach((entry: any) => {
                const rawKey = entry?.country ?? entry?.browser ?? entry?.device ?? entry?.os ?? entry?.provider ?? entry?.timezone ?? entry?.name ?? entry?.label;
                const key = this.normalizeDimensionKey(rawKey, fallback);
                const count = Number(entry?.count ?? entry?.value ?? 0);
                if (count > 0) {
                    merged[key] = (merged[key] || 0) + count;
                }
            });
        } else {
            Object.entries((source || {}) as Record<string, unknown>).forEach(([rawKey, value]) => {
                const key = this.normalizeDimensionKey(rawKey, fallback);
                const count = Number(value || 0);
                if (count > 0) {
                    merged[key] = (merged[key] || 0) + count;
                }
            });
        }

        const entries = Object.entries(merged)
            .sort(([, a], [, b]) => b - a)
            .slice(0, max);

        if (entries.length > 0) {
            return entries;
        }

        return [[fallback, 0]];
    }
}
