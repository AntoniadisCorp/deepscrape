import { DestroyRef, inject, Injectable } from '@angular/core'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { catchError, retry } from 'rxjs/operators'
import { BehaviorSubject, Observable, Subject } from 'rxjs'
import { webSocket, WebSocketSubject } from 'rxjs/webSocket'
import { environment } from 'src/environments/environment'
import { AuthService } from './auth.service'
export interface TaskStatus {
  task_id: string
  status: string
  timestamp: number
  info?: any
  result?: any
  error?: string
  final?: boolean
}

@Injectable({
  providedIn: 'root',
})
export class WebSocketService {
  private destroyRef = inject(DestroyRef)
  private webSocketAPI_URL: string
  private generalSocket$: WebSocketSubject<any>
  private taskSocket$: WebSocketSubject<any> | null = null

  // General message subject
  private messagesSubject$ = new Subject<any>()
  public messages$ = this.messagesSubject$.asObservable()

  // Task status subject
  private taskStatusSubject = new BehaviorSubject<TaskStatus[]>([])
  public taskStatus$ = this.taskStatusSubject.asObservable()

  constructor(private authService: AuthService) {
    // this.connectToGeneralSocket()
    this.webSocketAPI_URL = `${environment.production ? environment.wsUrl + '/api/v1' : ''}`
  }

  private connectToGeneralSocket() {
    const serverUrl = `${this.webSocketAPI_URL}/ws/events?token=${this.authService.token}`
    this.generalSocket$ = webSocket(serverUrl)

    this.generalSocket$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        retry({ count: 3, delay: 1000 }),
        catchError((error) => {
          console.error('General WebSocket connection failed:', error)
          throw error
        })
      )
      .subscribe({
        next: (message) => this.messagesSubject$.next(message),
        error: (err) => console.error('General WebSocket error:', err),
        complete: () => console.warn('General WebSocket connection closed'),
      })
  }

  /**
   * Connect to WebSocket and track task statuses
   * @param taskIds Array of task IDs to track
   */
  connectAndTrackTasks(taskIds: string[]): void {
    // Close existing task socket if any
    // this.disconnectTaskSocket()

    if (!taskIds || taskIds.length === 0) {
      console.error('No task IDs provided')
      return
    }

    // Only create a new socket if not already open
    if (!this.taskSocket$ || this.taskSocket$.closed) {

      const taskSocketUrl = `${this.webSocketAPI_URL}/ws/task/status?token=${this.authService.token}`
      this.taskSocket$ = webSocket(taskSocketUrl)

      this.taskSocket$
        .pipe(
          takeUntilDestroyed(this.destroyRef),
          retry({ count: 3, delay: 1000 }),
          catchError((error) => {
            console.error('Task WebSocket connection failed:', error)
            throw error
          })
        )
        .subscribe({
          next: (data) => {
            if (data.error) {
              console.error('Task WebSocket error:', data.error)
              return
            }

            if (data.tasks) {
              this.taskStatusSubject.next(data.tasks)
            }
          },
          error: (err) => console.error('Task WebSocket error:', err),
          complete: () => console.warn('Task WebSocket connection closed'),
        })

      // Send task IDs to track
      this.taskSocket$.next({ task_ids: taskIds })
    }

  }

  /**
   * Send message to general WebSocket
   */
  sendMessage(message: any) {
    this.generalSocket$.next(message)
  }

  /**
   * Get current task statuses
   */
  getTaskStatuses(): TaskStatus[] {
    return this.taskStatusSubject.value
  }

  /**
   * Disconnect task tracking WebSocket
   */
  disconnectTaskSocket(): void {
    if (this.taskSocket$) {
      this.taskSocket$.complete()
      this.taskSocket$ = null
    }
  }

  /**
   * Close all WebSocket connections
   */
  closeAll() {
    this.disconnectTaskSocket()
    this.generalSocket$.complete()
  }

  ngOnDestroy(): void {
    //Called once, before the instance is destroyed.
    //Add 'implements OnDestroy' to the class.
    this.closeAll()
    this.taskStatusSubject.complete()
    this.messagesSubject$.complete()
  }
}