import { Component, ElementRef, ViewChild, AfterViewInit, inject } from '@angular/core';
import Chart from 'chart.js/auto';
import { FirestoreService } from '../../core/services';

@Component({
    selector: 'app-admin-analytics',
    standalone: true,
    templateUrl: './admin-analytics.component.html',
    styleUrls: ['./admin-analytics.component.scss']
})
export class AdminAnalyticsComponent implements AfterViewInit {
    @ViewChild('barChartCanvas', { static: false }) barChartCanvas!: ElementRef<HTMLCanvasElement>;
    chart: Chart | undefined;
    private firestoreService = inject(FirestoreService);

    async ngAfterViewInit() {
        // Fetch analytics data
        const guestCount = await this.firestoreService.getGuestCount();
        const userCount = await this.firestoreService.getAuthenticatedUserCount();
        const loginCountsByDay = await this.firestoreService.getLoginCountsByDay(7);

        // Prepare chart data
        const labels = Object.keys(loginCountsByDay);
        const loginData = Object.values(loginCountsByDay);

        this.chart = new Chart(this.barChartCanvas.nativeElement, {
            type: 'bar',
            data: {
                labels: labels.length ? labels : ['Guests', 'Authenticated'],
                datasets: [
                    {
                        label: 'Logins per Day',
                        data: loginData.length ? loginData : [guestCount, userCount],
                        backgroundColor: loginData.length ? '#42A5F5' : ['#42A5F5', '#66BB6A']
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { display: true },
                    title: { display: true, text: 'User Logins Analytics' }
                }
            }
        });
    }
}
