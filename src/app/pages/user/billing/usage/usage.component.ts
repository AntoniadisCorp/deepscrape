import { AsyncPipe, CurrencyPipe, DatePipe, DecimalPipe, NgFor, NgIf } from '@angular/common'
import { Component, ViewChild } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { MatIconModule } from '@angular/material/icon'
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner'
import { ChartConfiguration, ChartData } from 'chart.js'
import { BaseChartDirective } from 'ng2-charts'
import { fadeInUp } from 'src/app/animations'
import { BillingService } from 'src/app/core/services'
import {
  BillingUsageBreakdownItem,
  BillingUsageRangeKey,
  BillingUsageResponse,
} from 'src/app/core/types'
import { BehaviorSubject, catchError, from, map, Observable, of, shareReplay, switchMap } from 'rxjs'

type UsageViewModel = {
  report: BillingUsageResponse | null
  chartPoints: Array<{ dateKey: string; label: string; value: number }>
  chartData: ChartData<'bar'>
  chartOptions: ChartConfiguration<'bar'>['options']
}

@Component({
  selector: 'app-usage',
  imports: [NgIf, NgFor, AsyncPipe, FormsModule, CurrencyPipe, DecimalPipe, DatePipe, MatIconModule, MatProgressSpinnerModule, BaseChartDirective],
  templateUrl: './usage.component.html',
  styleUrl: './usage.component.scss',
  animations: [fadeInUp],
})
export class UsageComponent {
  @ViewChild(BaseChartDirective) usageChart?: BaseChartDirective

  readonly rangeOptions: Array<{ value: BillingUsageRangeKey; label: string }> = [
    { value: 'this_month', label: 'This month' },
    { value: 'last_month', label: 'Last month' },
    { value: 'last_30_days', label: 'Last 30 days' },
    { value: 'last_90_days', label: 'Last 90 days' },
  ]

  selectedRange: BillingUsageRangeKey = 'this_month'
  errorMessage = ''
  readonly loadingState$ = this.billingService.loadingState$

  private readonly range$ = new BehaviorSubject<BillingUsageRangeKey>(this.selectedRange)

  readonly vm$: Observable<UsageViewModel> = this.range$.pipe(
    switchMap((range) => {
      this.errorMessage = ''

      return from(this.billingService.getUsageReport({ range })).pipe(
        map((report) => ({
          report,
          chartPoints: this.buildChartPoints(report),
          chartData: this.buildUsageChartData(report),
          chartOptions: this.buildUsageChartOptions(),
        })),
        catchError(() => {
          this.errorMessage = 'Unable to load billing usage right now. Please try again in a few moments.'
          return of({
            report: null,
            chartPoints: [],
            chartData: this.buildUsageChartData(null),
            chartOptions: this.buildUsageChartOptions(),
          })
        }),
      )
    }),
    shareReplay({ bufferSize: 1, refCount: true }),
  )

  constructor(private readonly billingService: BillingService) {}

  onRangeChange(range: BillingUsageRangeKey): void {
    this.selectedRange = range
    this.range$.next(range)
  }

  asCurrencyCode(currency: string | null | undefined): string {
    return (currency || 'EUR').toUpperCase()
  }

  isUnitRow(item: BillingUsageBreakdownItem): boolean {
    return item.currency === 'units'
  }

  private buildChartPoints(report: BillingUsageResponse | null): Array<{ dateKey: string; label: string; value: number }> {
    if (!report) {
      return []
    }

    const bucket = new Map<string, number>()

    for (const meter of report.meteredUsage.meters) {
      for (const point of meter.timeline) {
        const dateKey = point.end.slice(0, 10)
        const nextValue = (bucket.get(dateKey) || 0) + Number(point.value || 0)
        bucket.set(dateKey, nextValue)
      }
    }

    if (!bucket.size) {
      for (const row of report.breakdown) {
        if (row.source !== 'meter') {
          continue
        }

        const dateKey = row.date.slice(0, 10)
        const nextValue = (bucket.get(dateKey) || 0) + Number(row.quantity || 0)
        bucket.set(dateKey, nextValue)
      }
    }

    return Array.from(bucket.entries())
      .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
      .slice(-14)
      .map(([dateKey, value]) => ({
        dateKey,
        label: new Date(dateKey).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        value,
      }))
  }

  private buildUsageChartData(report: BillingUsageResponse | null): ChartData<'bar'> {
    const points = this.buildChartPoints(report)

    return {
      labels: points.map((point) => point.label),
      datasets: [
        {
          label: 'Metered usage',
          data: points.map((point) => point.value),
          borderRadius: 8,
          borderSkipped: false,
          maxBarThickness: 34,
          backgroundColor: 'rgba(99, 102, 241, 0.75)',
          borderColor: 'rgba(99, 102, 241, 1)',
          borderWidth: 1,
        },
      ],
    }
  }

  private buildUsageChartOptions(): ChartConfiguration<'bar'>['options'] {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          backgroundColor: 'rgba(15, 23, 42, 0.9)',
          titleColor: '#f8fafc',
          bodyColor: '#f8fafc',
          borderColor: 'rgba(148, 163, 184, 0.35)',
          borderWidth: 1,
          callbacks: {
            label: (context) => `${context.parsed.y ?? 0} units`,
          },
        },
      },
      scales: {
        x: {
          grid: {
            display: false,
          },
          ticks: {
            color: '#94a3b8',
          },
        },
        y: {
          beginAtZero: true,
          grid: {
            color: 'rgba(148, 163, 184, 0.18)',
          },
          ticks: {
            color: '#94a3b8',
          },
        },
      },
    }
  }
}
