import { Injectable, inject, NgZone, EnvironmentInjector, runInInjectionContext, Injector } from '@angular/core';
// import { AngularFireDatabase, AngularFireList } from '@angular/fire/compat/database';
import { Auth, authState, User } from '@angular/fire/auth';
import {
  addDoc,
  collection, CollectionReference, deleteDoc, doc, DocumentData, DocumentReference,
  Firestore, getDoc, getDocs, getFirestore, limit, query, Query,
  QueryConstraint, QuerySnapshot, setDoc, SetOptions
} from '@angular/fire/firestore';
import { CartPack, CrawlPack, Users } from '../types';
import { map, Observable, of, throwError } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class FirestoreService {
  private firestore = inject(Firestore); // inject()
  private readonly _injector: EnvironmentInjector = inject(EnvironmentInjector)
  // item$: Observable<Board[]> | undefined;

  constructor(
    private afAuth: Auth,
    private ngZone: NgZone, // Inject NgZone
  ) {
    // this.app = initializeApp(environment.firebaseConfig)
    this.firestore = this.getInstanceDB('easyscrape')
  }

  getInstanceDB(databaseName?: string): Firestore {
    // Get Firestore with the specified database name
    return getFirestore(this.afAuth.app, this.getFirestoreInstance(databaseName));
  }

  private getFirestoreInstance(databaseName?: string): string {
    switch (databaseName) {
      case undefined:
      case '':
      case 'default':
        return '(default)'
      case 'auth0':
        return databaseName
      case 'supply':
        return databaseName
      case 'order':
        return databaseName
      case 'easyscrape':
        return databaseName
      default:
        throw new Error('Invalid database name');
    }
  }

  
  /**
   * This TypeScript function asynchronously retrieves user data based on a provided user ID.
   * @param {string} userId - The `userId` parameter is a string that represents the unique identifier
   * of the user whose data you want to retrieve.
   * @returns The `getUserData` function returns a Promise that resolves to either a `Users` object if
   * the user data exists in the database, or `null` if the user data does not exist or if there was an
   * error retrieving the data.
   */
  async getUserData(userId: string): Promise<Users | null> {


    const userRef = this.doc('users', userId)
    let err, docSnapshot = await this.getDoc(userRef)

    if (err) {
      console.error("Failed to get user's data:", err)
      return null;
    }

    if (docSnapshot['exists']()) {
      const data = docSnapshot['data']() as Users
      return data
    }

    return null

  }

  /* get last 10 crawl pack config items by sorted date from the store  */
  // async getPack

  /* store the cart data when goes the app goes online */
  async savePackToFirestore(userId: string, item: any, merge: boolean = true) {
    try {
      const cartRef = this.doc(`users/${userId}/cartpack`, userId)
      await this.setDoc(cartRef, item, { merge })
      console.log('Pack data stored successfully in Firestore.')

    } catch (error) {
      console.error('Error storing user data:', error)
    }
  }

  /* store the cart data when goes the app goes online */
  async saveCrawlPackToFirestore(userId: string, item: CrawlPack, merge: boolean = true) {
    try {
      if (!userId)
        throw new Error('User ID is required')

      const cartRef = this.collection(this.firestore, `users/${userId}/crawlpack`)

      await this.addDoc(cartRef, item)
      console.log('Crawler Pack data stored successfully in Firestore.')
      return true
    } catch (error) {
      return error as any
    }
  }

  async deletePackFromFirestore(userId: string) {

    try {

      // Create a reference to the "operations" subcollection of the user document
      const cartRef = this.doc(`users/${userId}/cartpack`, userId)

      await this.deleteDoc(cartRef)
      console.log("Document deleted successfully")

    } catch (error) {
      console.error('Error removing user data:', error)
    }
  }

  async loadPreviousPacks(userId: string, limit = 10): Promise<CrawlPack[] | null> {
    const packsCollection = this.collection(this.firestore, `users/${userId}/crawlpack`)
    const q = this.query(packsCollection, this.limit(limit)); // Adjust limit as needed
    let err, querySnapshot = await this.getDocs(q)
    if (err) {
      console.error("Failed to get user's data:", err)
      return null
    }

    if (!querySnapshot.empty)
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as CrawlPack)

    return [] // Return an empty array if no documents found
  }

  public authState(): Observable<boolean> {
    return runInInjectionContext(
      this._injector,
      (): Observable<boolean> => authState(this.afAuth).pipe(map((user: User | null) => !!user)),
    )
  }

  /**
   * Note that the doc method could accept a CollectionReference or DocumentReference in addition to
   * Firestore.
   */
  public doc(path: string, ...pathSegments: string[]): DocumentReference {
    return runInInjectionContext(
      this._injector,
      (): DocumentReference => doc(this.firestore, path, ...pathSegments),
    );
  }

  /**
   * This TypeScript function asynchronously retrieves a document from a Firestore database using the
   * provided user reference.
   * database. It is of type `DocumentReference<DocumentData>`, where `DocumentData` represents the
   * type of data stored in the document.
   * 
   * NOTE: Use this sparingly and only when absolutely necessary.
   * This is a band-aid solution for this issue:
   * https://github.com/angular/angularfire/issues/3621#issuecomment-2671369607
   ** @param userRef - The `userRef` parameter is a reference to a specific document in a Firestore
   ** @returns The `getDoc` function is returning a `Promise` that resolves to a `DocumentData` object.
   */
  public async getDoc(userRef: DocumentReference<DocumentData>): Promise<DocumentData> {
    return this.runAsyncInInjectionContext(
      this._injector,
      async (): Promise<DocumentData> => {
        return await getDoc(userRef)
      },
    );
  }

  public async addDoc(collectionRef: CollectionReference, data: unknown): Promise<DocumentData> {

    return this.runAsyncInInjectionContext(
      this._injector,
      async (): Promise<DocumentData> => {
        return await addDoc(collectionRef, data)
      },
    );
  }

  public collection(firestore: Firestore, path: string, ...pathSegments: string[]): CollectionReference {
    return runInInjectionContext(
      this._injector,
      (): CollectionReference => collection(firestore, path, ...pathSegments),
    );
  }

  public query(collectionRef: CollectionReference, ...queryConstraints: QueryConstraint[]): Query<DocumentData> {
    return runInInjectionContext(
      this._injector,
      (): Query<DocumentData> => query(collectionRef, ...queryConstraints),
    );
  }

  public limit(limits: number): QueryConstraint {
    return runInInjectionContext(
      this._injector,
      (): QueryConstraint => limit(limits),
    );
  }

  public getDocs(q: Query<DocumentData>): Promise<QuerySnapshot<DocumentData, DocumentData>> {
    return this.runAsyncInInjectionContext(
      this._injector,
      async (): Promise<QuerySnapshot<DocumentData, DocumentData>> => {
        return await getDocs(q)
      },
    );
  }

  public async setDoc(userRef: DocumentReference<DocumentData>, data: unknown, options: SetOptions): Promise<void> {
    return this.runAsyncInInjectionContext(
      this._injector,
      async (): Promise<void> => {
        await setDoc(userRef as DocumentReference<unknown, DocumentData>, data as Partial<unknown>, options)
      },
    );
  }

  public async deleteDoc(userRef: DocumentReference<DocumentData>): Promise<void> {
    return this.runAsyncInInjectionContext(
      this._injector,
      async (): Promise<void> => {
        await deleteDoc(userRef)
      },
    );
  }


  /**
 * Runs an async function in the injection context. This can be awaited, unlike @see {runInInjectionContext}.
 * For some ungodly reason, only the first awaited call inside the fn callback is actually inside the injection context.
 * After something is awaited, the context is lost.
 *
 * NOTE: Use this sparingly and only when absolutely necessary.
 * This is a band-aid solution for this issue:
 * https://github.com/angular/angularfire/pull/3590#issuecomment-2581455741
 ** @param injector The injector, usually inject(EnvironmentInjector)
 ** @param fn The async callback to be awaited
 */
  async runAsyncInInjectionContext<T>(injector: Injector, fn: () => Promise<T>): Promise<T> {
    return await runInInjectionContext(injector, () => {
      return new Promise((resolve, reject) => {
        fn().then(resolve).catch(reject);
      });
    });
  }


  runOutsideAngular<T>(fn: () => T): T { // Helper function
    return this.ngZone.runOutsideAngular(fn);
  }
  runInsideAngular<T>(fn: () => T): T { // Helper function
    return this.ngZone.run(fn);
  }
}
