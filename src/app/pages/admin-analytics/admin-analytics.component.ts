import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule, DecimalPipe, NgClass, NgFor, NgIf } from '@angular/common';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData } from 'chart.js';
import { FirestoreService } from '../../core/services';
import { LucideAngularModule } from 'lucide-angular';
import { myIcons } from '../../shared/lucideicons';

interface DayActivity {
    date: string;
    logins: number;
    newUsers: number;
    trend: number;
}

@Component({
    selector: 'app-admin-analytics',
    imports: [BaseChartDirective, DecimalPipe, NgFor, NgIf, NgClass, LucideAngularModule],
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

    // Caching for performance optimization
    private cacheTimestamp: number | null = null;
    private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
    private cachedDashboard: any = null;
    private cachedRangeMetrics: any = null;

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

    async ngOnInit() {
        try {
            await this.loadAnalyticsData();
        } catch (err) {
            this.error = 'Failed to load analytics data';
            console.error(err);
        } finally {
            this.loading = false;
            this.cdr.detectChanges();
        }
    }

    async loadAnalyticsData() {
        const now = Date.now();
        
        // Return cached data if still fresh
        if (this.isCacheValid(now)) {
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

        // Get time-series data for charts
        const rangeMetrics = await this.firestoreService.getRangeMetrics('last-7d');
        
        // Update cache
        this.cachedDashboard = dashboardSummary;
        this.cachedRangeMetrics = rangeMetrics;
        this.cacheTimestamp = now;
        
        console.log('✅ Analytics data loaded from optimized backend');
        
        // Update all charts with optimized data
        this.updateChartsFromOptimizedData(dashboardSummary, rangeMetrics);
    }

    async refreshData() {
        this.loading = true;
        this.error = null;
        this.cacheTimestamp = null; // Invalidate cache
        
        try {
            await this.loadAnalyticsData();
        } catch (err) {
            this.error = 'Failed to refresh data';
            console.error(err);
        } finally {
            this.loading = false;
            this.cdr.detectChanges();
        }
    }

    private isCacheValid(now: number): boolean {
        return this.cacheTimestamp !== null &&
               (now - this.cacheTimestamp) < this.CACHE_TTL_MS &&
               this.cachedDashboard !== null;
    }

    private updateChartsFromOptimizedData(dashboard: any, rangeMetrics: any) {
        // Extract daily breakdown for time-series charts
        const dailyData = rangeMetrics?.dailyBreakdown || [];
        const labels = dailyData.map((day: any) => 
            new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        );
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

        // Guest by Country Chart (Top 10 from dashboard)
        const topCountries = dashboard.topCountries || [];
        this.guestCountryChartData = {
            labels: topCountries.map((c: any) => c.country || c.name),
            datasets: [{
                label: 'Guests by Country',
                data: topCountries.map((c: any) => c.count || c.value),
                backgroundColor: '#3B82F6',
                borderRadius: 6
            }]
        };

        // Guest by Browser Chart
        const topBrowsers = dashboard.topBrowsers || [];
        this.guestBrowserChartData = {
            labels: topBrowsers.map((b: any) => b.browser || b.name),
            datasets: [{
                data: topBrowsers.map((b: any) => b.count || b.value),
                backgroundColor: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'],
                borderWidth: 2,
                borderColor: '#fff'
            }]
        };

        // Guest by Device Chart
        const topDevices = dashboard.topDevices || [];
        this.guestDeviceChartData = {
            labels: topDevices.map((d: any) => d.device || d.name),
            datasets: [{
                data: topDevices.map((d: any) => d.count || d.value),
                backgroundColor: ['#6366F1', '#EC4899', '#10B981', '#F59E0B'],
                borderWidth: 2,
                borderColor: '#fff'
            }]
        };

        // Guest by OS Chart (from range metrics if available)
        if (rangeMetrics?.byOS) {
            const osEntries = Object.entries(rangeMetrics.byOS)
                .sort(([, a]: any, [, b]: any) => b - a)
                .slice(0, 10);
            
            this.guestOSChartData = {
                labels: osEntries.map(([os]) => os),
                datasets: [{
                    label: 'Operating Systems',
                    data: osEntries.map(([, count]) => count as number),
                    backgroundColor: '#8B5CF6',
                    borderRadius: 6
                }]
            };
        }

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
        const osEntries = Object.entries(guestAnalytics.byOS);
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
}
