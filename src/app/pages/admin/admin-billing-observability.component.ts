import { CommonModule } from '@angular/common'
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { RouterLink } from '@angular/router'
import { BillingService } from 'src/app/core/services'

type ObservabilityResponse = {
  generatedAt: string
  incidents: Array<Record<string, unknown>>
  failedEvents: Array<Record<string, unknown>>
  pendingEvents: Array<Record<string, unknown>>
  pastDueAccounts: Array<Record<string, unknown>>
}

@Component({
  selector: 'app-admin-billing-observability',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './admin-billing-observability.component.html',
  styleUrl: './admin-billing-observability.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminBillingObservabilityComponent {
  private readonly billingService = inject(BillingService)
  private readonly cdr = inject(ChangeDetectorRef)

  loading = false
  error: string | null = null
  data: ObservabilityResponse | null = null

  includeAcknowledged = false
  incidentLimit = 20
  failedEventLimit = 20
  pendingEventLimit = 20
  pastDueLimit = 30

  readonly retryingEventIds = new Set<string>()
  readonly acknowledgingIncidentIds = new Set<string>()

  async ngOnInit(): Promise<void> {
    await this.refresh()
  }

  async refresh(): Promise<void> {
    this.loading = true
    this.error = null
    this.cdr.markForCheck()

    try {
      this.data = await this.billingService.getAdminBillingObservability({
        includeAcknowledged: this.includeAcknowledged,
        incidentLimit: this.sanitizeLimit(this.incidentLimit, 1, 100, 20),
        failedEventLimit: this.sanitizeLimit(this.failedEventLimit, 1, 100, 20),
        pendingEventLimit: this.sanitizeLimit(this.pendingEventLimit, 1, 100, 20),
        pastDueLimit: this.sanitizeLimit(this.pastDueLimit, 1, 200, 30),
      })
    } catch (error) {
      this.error = error instanceof Error ? error.message : 'Failed to fetch billing observability data.'
    } finally {
      this.loading = false
      this.cdr.markForCheck()
    }
  }

  async acknowledgeIncident(incidentId: string): Promise<void> {
    if (!incidentId || this.acknowledgingIncidentIds.has(incidentId)) {
      return
    }

    this.acknowledgingIncidentIds.add(incidentId)
    this.cdr.markForCheck()

    try {
      await this.billingService.acknowledgeBillingIncident(incidentId)
      await this.refresh()
    } catch (error) {
      this.error = error instanceof Error ? error.message : 'Failed to acknowledge incident.'
    } finally {
      this.acknowledgingIncidentIds.delete(incidentId)
      this.cdr.markForCheck()
    }
  }

  async retryEvent(eventId: string): Promise<void> {
    if (!eventId || this.retryingEventIds.has(eventId)) {
      return
    }

    this.retryingEventIds.add(eventId)
    this.cdr.markForCheck()

    try {
      await this.billingService.requestStripeEventRetry(eventId)
      await this.refresh()
    } catch (error) {
      this.error = error instanceof Error ? error.message : 'Failed to request event retry.'
    } finally {
      this.retryingEventIds.delete(eventId)
      this.cdr.markForCheck()
    }
  }

  incidentId(incident: Record<string, unknown>): string {
    return String(incident['id'] || '')
  }

  eventId(eventData: Record<string, unknown>): string {
    return String(eventData['id'] || '')
  }

  private sanitizeLimit(value: number, min: number, max: number, fallback: number): number {
    const numeric = Math.floor(Number(value))
    if (!Number.isFinite(numeric)) {
      return fallback
    }

    return Math.max(min, Math.min(max, numeric))
  }
}
