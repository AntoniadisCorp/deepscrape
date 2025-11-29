/* import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
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
    totalLogins = 0;
    conversionRate = 0;
    guestConversionRate = 0;
    recentActivity: DayActivity[] = [];
    Math = Math;
    readonly icons = myIcons;

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
    } async loadAnalyticsData() {
        // Fetch comprehensive guest analytics in one call (most efficient)
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

        // ======= UPDATE EXISTING CHARTS =======

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
                data: loginData,
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
                    data: loginData.map(val => Math.floor(val * 0.4)),
                    backgroundColor: '#42A5F5'
                },
                {
                    label: 'Authenticated',
                    data: loginData.map(val => Math.floor(val * 0.6)),
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

        // ======= UPDATE NEW GUEST ANALYTICS CHARTS =======

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
            .sort(([, a], [, b]) => b - a)
            .slice(0, 10);
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
        const browserEntries = Object.entries(guestAnalytics.byBrowser);
        this.guestBrowserChartData = {
            labels: browserEntries.map(([browser]) => browser),
            datasets: [{
                data: browserEntries.map(([, count]) => count),
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
                data: deviceEntries.map(([, count]) => count),
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
                data: osEntries.map(([, count]) => count),
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
            logins: loginData[index] || 0,
            newUsers: Math.floor((loginData[index] || 0) * 0.3), // Mock: 30% new users
            trend: index > 0 ? Math.round(((loginData[index] - loginData[index - 1]) / loginData[index - 1]) * 100) : 0
        }));
    }

    async refreshData() {
        this.loading = true;
        this.error = null;
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
}
 */