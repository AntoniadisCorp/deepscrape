import { inject, Injectable } from '@angular/core'
import { FlyMachine } from '../types'
import { BehaviorSubject } from 'rxjs/internal/BehaviorSubject'
import { SessionStorage } from './storage.service'
import { FirestoreService } from './firestore.service'
import { Firestore } from '@angular/fire/firestore'
import { Functions, httpsCallable } from '@angular/fire/functions'
import { LoadingBarService } from '@ngx-loading-bar/core'
import { Subscription } from 'rxjs/internal/Subscription'
import { Observable } from 'rxjs/internal/Observable'
import { from } from 'rxjs/internal/observable/from'
import { map } from 'rxjs/internal/operators/map'
import { updateMachineState } from '../functions'
import { AuthService } from './auth.service'
import { of } from 'rxjs/internal/observable/of'
import { catchError, tap, throwError } from 'rxjs'
import { MACHNINE_STATE } from '../enum'

@Injectable({
  providedIn: 'root'
})
export class MachineStoreService {

  private machinesSub: Subscription
  private machineSubject = new BehaviorSubject<FlyMachine[] | null | undefined>(undefined)
  private totalPagesSubject = new BehaviorSubject<number>(1)
  private inTotalSubject = new BehaviorSubject<number>(0)
  private SessionStorage: Storage = inject(SessionStorage)


  machines$ = this.machineSubject.asObservable()
  totalPages$ = this.totalPagesSubject.asObservable()
  inTotal$ = this.inTotalSubject.asObservable()

  constructor(
    private firestoreService: FirestoreService,
    private firestore: Firestore,
    private functions: Functions,
    private loadingBar: LoadingBarService,

    private auth: AuthService
  ) {


    this.initializeOperations(null)

    // set the firestore instance
    this.firestore = this.firestoreService.getInstanceDB('easyscrape')
  }

  private initializeOperations(storeMachines: string | null) {
    if (storeMachines) {
      this.machineSubject.next(JSON.parse(storeMachines))
      // this.totalPagesSubject.next(1)
    } else {
      this.machineSubject.next(undefined)
      this.totalPagesSubject.next(1)
      // Get Data from Firestore
      this.machinesSub = this.getMachinesByPagination().pipe(
      ).subscribe({
        next: (results: any) => {
          const { machines, inTotal, totalPages } = results
          // include totalPages in the response
          // Update the Machines in the BehaviorSubject
          this.machineSubject.next(machines)
          this.totalPagesSubject.next(totalPages)
          this.inTotalSubject.next(inTotal)
          // this.saveMachines(machines)
        },
        error: (error: any) => {
          console.error('Error retrieving machines:', error)
          this.machineSubject.next(null)
          this.totalPagesSubject.next(0)
          this.inTotalSubject.next(0)
        }
      })
    }
  }

  private getMachinesByPagination(currPage: number = 1, pageSize: number = 10, state: string | null = null): Observable<any> {
    return from(httpsCallable(this.functions, "getMachinesPaging")
      ({ currPage, pageSize, state }))
      .pipe(
        map((fun: any) => {
          const { error, machines, inTotal, totalPages, message } = fun.data as any

          if (error) {
            console.error('Error retrieving machines by pagination:', error, machines, message)
            throw new Error(message, error)
          }

          const newMachine = machines?.map((machine: FlyMachine): any => {
            const created_At = machine.created_at // new Date((((key.created_At as any)._seconds * 1000) + ((key.created_At as any)._nanoseconds / 1000000)))
            // const showKey = key.showKey
            return { ...machine }
          })

          return { machines: newMachine, inTotal, totalPages }
        })
      )
  }


  nextPage(page: number, pageSize: number = 10, state = null): void {
    this.loadingBar.useRef().start(); // Start loading bar manually
    this.machinesSub?.unsubscribe()
    this.machinesSub = this.getMachinesByPagination(page, pageSize, state)
      .pipe()
      .subscribe({
        next: (results: any) => {
          // include totalPages in the response
          const { machines, inTotal, totalPages } = results

          // Update the Operations in the BehaviorSubject
          this.machineSubject.next(machines)
          // this.saveOperations(operations)

          // update the totalpages behavior
          this.totalPagesSubject.next(totalPages)
          this.inTotalSubject.next(inTotal)

        },
        error: (error: any) => {
          console.error('Error retrieving Machines list:', error)
          this.machineSubject.next(null)
          this.totalPagesSubject.next(0)
          this.inTotalSubject.next(0)
          this.loadingBar.useRef().stop() // Stop on error
        },
        complete: () => {
          this.loadingBar.useRef().complete(); // Complete loading bar manually
        }
      })
  }


  /**
   * The function `updateMachineState` updates the state of a machine identified by its ID in a
   * BehaviorSubject array of machines.
   * @param {string} machineId - The `machineId` parameter is a string that represents the unique
   * identifier of the machine whose state needs to be updated.
   * @param {string} state - The `state` parameter in the `updateMachineState` function represents the
   * new state that you want to update for a specific machine identified by `machineId`. This function
   * is designed to update the state of a machine in a list of machines stored in a BehaviorSubject. By
   * providing the `machineId`
   */
  updateMachineState(machineId: string, state: string): void {

    // Get the current value of machines from the BehaviorSubject
    const currentMachines = this.machineSubject.getValue()

    // Check if machines is not undefined or null before proceeding
    if (currentMachines) {
      // Find the index of the machine to update
      const index = currentMachines.findIndex(m => m.id === machineId);

      // If the machine is found, update its state
      if (index > -1) {
        // Create a new array to trigger change detection
        const updatedMachines = [...currentMachines];
        updatedMachines[index] = { ...updatedMachines[index], state: state };

        // Update the BehaviorSubject with the new array
        this.machineSubject.next(updatedMachines);
      }
    }

  }

  ngOnDestroy(): void {
    //Called once, before the instance is destroyed.
    //Add 'implements OnDestroy' to the class.
    this.machinesSub?.unsubscribe()
  }

}
