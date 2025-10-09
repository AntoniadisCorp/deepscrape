import { Injectable, inject, NgZone, EnvironmentInjector, runInInjectionContext, Injector } from '@angular/core'
// import { AngularFireDatabase, AngularFireList } from '@angular/fire/compat/database'
import { ActionCodeSettings, Auth, AuthCredential, authState, connectAuthEmulator, linkWithCredential, linkWithPopup, PopupRedirectResolver, reauthenticateWithCredential, sendPasswordResetEmail, signInWithEmailAndPassword, signInWithPopup, updatePassword, User, UserCredential } from '@angular/fire/auth'
import {
  addDoc,
  collection, CollectionReference, connectFirestoreEmulator, deleteDoc, doc, DocumentData, DocumentReference,
  FieldValue,
  Firestore, getDoc, getDocs, getFirestore, increment, limit, query, Query,
  QueryConstraint, QuerySnapshot, serverTimestamp, setDoc, SetOptions,
  Timestamp, writeBatch, WriteBatch,
  where
} from '@angular/fire/firestore'
import { BrowserProfile, CartPack, CrawlConfig, CrawlPack, CrawlResultConfig, Guest, loginHistoryInfo, loginMetrics, UserDetails, Users } from '../types'
import { map, Observable, of, throwError } from 'rxjs'
import { WindowToken } from './window.service'
import { environment } from 'src/environments/environment'
import {
  connectStorageEmulator, FirebaseStorage, getDownloadURL, getStorage, ref, Storage, StorageReference, uploadString,
  fromTask, uploadBytesResumable, TaskEvent
} from '@angular/fire/storage'
import { createSessionKey } from '../functions'

@Injectable({
  providedIn: 'root'
})
export class FirestoreService {
  private firestore = inject(Firestore) // inject()

  private storage = inject(Storage)
  private window: Window = inject(WindowToken)
  private readonly _injector: EnvironmentInjector = inject(EnvironmentInjector)
  // item$: Observable<Board[]> | undefined

  constructor(
    private afAuth: Auth,
    private ngZone: NgZone, // Inject NgZone
  ) {
    // this.app = initializeApp(environment.firebaseConfig)
    this.firestore = this.getInstanceDB('easyscrape')

    this.storage = this.getStorage()

    if (this.isLocalhost() && environment.emulators) {

      console.log('🔥 Connecting Firestore Service to Firebase Emulators')

      // Connect to the Firestore emulator if running on localhost and not in production
      connectFirestoreEmulator(this.firestore, 'localhost', 5001)
      connectAuthEmulator(this.afAuth, 'http://localhost:9099')
      connectStorageEmulator(this.storage, 'localhost', 9199) // <-- Add this line

    }
  }

  getInstanceDB(databaseName?: string): Firestore {
    // Get Firestore with the specified database name
    return getFirestore(this.afAuth.app, this.getFirestoreInstance(databaseName))
  }

  getStorage(bucketURL?: string): FirebaseStorage {
    return getStorage(this.afAuth.app, bucketURL)
  }



  isLocalhost(): boolean {
    return typeof this.window !== 'undefined' &&
      (this.window.location.hostname === 'localhost' ||
        this.window.location.hostname === '127.0.0.1')
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
        throw new Error('Invalid database name')
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
      return null
    }

    if (docSnapshot['exists']()) {
      const data = docSnapshot['data']() as any

      return {
        ...data,
        last_login_at: data.last_login_at ? (data.last_login_at as any).toDate() : null,
        created_At: data.created_At ? (data.created_At as any).toDate() : null,
        updated_At: data.updated_At ? (data.updated_At as any).toDate() : null
      } as Users
    }

    return null

  }


  async setUserData(userId: string, data: Partial<Users>, merge: boolean = true): Promise<boolean | Error> {

    try {
      const userRef = this.doc('users', userId)
      await this.setDoc(userRef, data, { merge })
      console.log('User data stored successfully.')
      return true
    } catch (error) {
      console.error('Error storing user data:', error)
      throw error as any
    }
  }

  async storeUserData(user: User, providerId: string, emailVerified: boolean = false,
    newUsername?: string | null, phoneVerified: boolean | null = null): Promise<boolean | Error> {
    try {
      const userRef = this.doc('users', user.uid)
      const currUserProvider = user.providerData.find(p => p.providerId === providerId)
      const email = user.email || currUserProvider?.email || null
      const username = newUsername || currUserProvider?.email?.split('@')[0] || ''

      // const userRefProvider = doc(firestore, `users/${user.uid}`, 'provider')
      let dbuser: Users = {
        uid: user.uid,
        email,
        username,
        providerParent: user.providerId,
        providerId, // Use the last providerId from providerData this means the last provider used to sign in
        providerData: user.providerData,
        emailVerified,
        phoneVerified,
        last_login_at: new Date(user.metadata.lastSignInTime || ''),
        created_At: new Date(user.metadata.creationTime || ''),
        updated_At: new Date(),
      }

      await this.setDoc(userRef, dbuser, { merge: true })

      console.log('User data stored successfully.')
      return true
    } catch (error) {
      console.error('Error storing user data:', error)
      return error as any
    }
  }

  async setUserLoginMetrics(userId: string, metrics: any, guestInfo?: Guest) {
    const { ipAddress, userAgent, location, deviceType, connection, providerId, browser } = metrics

    if (!userId || !ipAddress || !userAgent) {
      throw new Error('UID, IP Address, and User Agent are required.')
    }

    try {
      const batch = this.writeBatch()
      const loginMetricsRef = this.doc('login_metrics', userId)
      let err, loginMetricsSnap = await this.getDoc(loginMetricsRef)

      if (err) {
        console.warn("Failed to get user's login metrics:", err)
      }

      const currentTime = serverTimestamp()

      if (!loginMetricsSnap['exists']()) {
        // Create new document
        batch.set(loginMetricsRef, {
          guestId: guestInfo?.id || '',
          id: userId,
          creationTime: currentTime,
          lastSignInTime: currentTime,
          loginCount: 0,
        }, { merge: false })
      }

      if (!guestInfo) {
        const loginMetrics = loginMetricsSnap["data"]() as loginMetrics | undefined

        if (loginMetrics && loginMetrics.lastGuestId) {
          let err2, guestSnap = await this.getDoc(this.doc('guests', loginMetrics.lastGuestId))

          if (err2) {
            console.warn("Failed to get guest data:", err2)
          } else if (guestSnap['exists']()) {
            guestInfo = guestSnap['data']() as Guest
            console.log("Guest info retrieved from lastGuestId:", guestInfo)
          }
        } else {
          console.warn("loginMetrics is undefined or lastGuestId is missing.")
        }
      }

      // Prepare login history entry
      const ip = guestInfo?.ip.raw || ipAddress;
      const currentLocation = guestInfo?.location || location || 'Unknown'
      const currentBrowser = browser || guestInfo?.browser
      const currentOS = guestInfo?.os || 'Unknown'
      const currDeviceType = deviceType || guestInfo?.device || 'Unknown'
      const currUserAgent = userAgent || guestInfo?.userAgent || 'Unknown'
      const sessionKey = createSessionKey(ip, currDeviceType, providerId, currentBrowser, currentOS, currentLocation)

      const loginHistoryEntry: loginHistoryInfo = {
        uid: userId,
        providerId, // The provider used to sign in
        connection,
        connected: true,
        timestamp: new Date(),
        ipAddress: ip,
        // we give priority to the passed userAgent param from the client(browser) over the guestInfo userAgent
        os: currentOS,
        browser: currentBrowser,
        userAgent: currUserAgent,
        location: currentLocation,
        deviceType: currDeviceType,
        sessionKey,
        // Only include guestInfo if it's defined and not undefined
        ...(guestInfo ? { guestId: guestInfo.id } : {}),
      }



      // Add entry to subcollection
      const loginHistoryRef = this.collection(this.firestore, `login_metrics/${userId}/login_history_Info`)
      let newlogin: DocumentReference<unknown, DocumentData>
      // create a query that checks if there's already a login history entry for the same ipAddress, deviceType and location, browser, os
      // then only add a new entry if there's no existing entry
      // Query using only sessionKey
      const query = this.query(loginHistoryRef,
        this.where('sessionKey', '==', sessionKey),
        this.limit(1)
      )
      let err2, querySnapshot = await this.getDocs(query)
      if (err2) {
        console.warn("Failed to query login history:", err2)
        return null
      } else if (!querySnapshot.empty) {
        console.log("Login history entry already exists for this IP, device, location, browser, and OS. Skipping new entry.")
        newlogin = querySnapshot.docs[0].ref // return the existing document reference
        // // Update metrics document
        // const signOutMetrics = {
        //   connected: false,
        //   lastSignInTime: new Date(),
        // }
      } else {
        // TODO: restrict new login history entries if already exists for the same location and device within the last X minutes/hours
        // This is to prevent spamming the login history with multiple entries for the same login session 
        const newLoginRef = this.newDocRef(loginHistoryRef) // Create a new document reference with a generated ID
        newlogin = newLoginRef
      }

      batch.set(newlogin, loginHistoryEntry)

      // Update metrics document
      const newLoginMetrics = {
        lastGuestId: guestInfo?.id || '',
        id: userId,
        lastLoginId: newlogin.id,
        lastSignInTime: currentTime,
        loginCount: this.increment(1),
      }

      // Update existing document
      batch.set(loginMetricsRef, newLoginMetrics, { merge: true })

      await batch.commit() // Commit the batch write

      return { success: true, message: `Login metrics recorded for user ${userId}.`, loginId: newlogin.id }

    }
    catch (error) {
      console.error('Error storing user data:', error)
      return null
    }
  }

  async setSignOutMetrics(userId: string, loginId: string) {

    if (!userId || !loginId) {
      throw new Error('UID and Login ID are required. ' + `Received UID: ${userId}, Login ID: ${loginId}`)
    }
    try {
      const loginHistoryRef = this.doc(`login_metrics/${userId}/login_history_Info`, loginId)

      // Update metrics document
      const signOutMetrics = {
        connected: false,
        signOutTime: new Date(),
      }
      // Update existing document
      await this.setDoc(loginHistoryRef as any, signOutMetrics, { merge: true })

      return { success: true, message: `Sign-out metrics recorded for user ${userId}.` }
    }
    catch (error) {
      console.error('Error storing sign-out data:', error)
      return null
    }
  }

  async linkGuestToUser(uid: string, guestId: string) {
    if (!uid || !guestId) {
      throw new Error("User ID and Guest ID are required.");
    }

    let guestInfo: Guest | null = null;

    try {
      const guestRef = this.doc('guests', guestId);
      let err, guestSnap = await this.getDoc(guestRef);

      if (err) {
        console.error("Failed to get guest data:", err);
        return { err, guestInfo };
      }

      if (!guestSnap['exists']()) {
        return { err: "Guest not found", guestInfo: null };
      }

      guestInfo = guestSnap['data']() as Guest;

      const details: Partial<UserDetails> = {
        latitude: guestInfo.latitude || 0,
        longitude: guestInfo.longitude || 0,
        country: guestInfo.country || "Unknown",
        geo: guestInfo.geo || { continent: "Unknown", region: "Unknown" },
        region: guestInfo.region || "Unknown",
        timezone: guestInfo.timezone || "UTC",
        location: guestInfo.location || "Unknown",
        updated_At: new Date(),
      };

      const userDetails: any = {
        details,
        updated_At: new Date(),
      };

      // Batch write: user first, then guest
      const userRef = this.doc('users', uid);
      const batch = this.writeBatch();
      batch.set(userRef, userDetails, { merge: true });
      batch.set(guestRef, { uid, linkedAt: new Date() }, { merge: true });

      await batch.commit();

      console.log(`Guest ${guestId} linked to user ${uid}.`);
      return { err: null, guestInfo };
    } catch (error) {
      console.error("Error linking guest data to user:", error);
      return { err: error as string, guestInfo };
    }
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
    const q = this.query(packsCollection, this.limit(limit)) // Adjust limit as needed
    let err, querySnapshot = await this.getDocs(q)
    if (err) {
      console.error("Failed to get user's data:", err)
      return null
    }

    if (!querySnapshot.empty)
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as CrawlPack)

    return [] // Return an empty array if no documents found
  }

  async uploadFileToStorage(base64: string, userId: string, fileName: string, metadata?: { [key: string]: any }): Promise<string> {


    try {
      const storageRef = await this.ref(this.storage, `uploads/${userId}/${fileName}`) // Define the file path in storage

      // Upload the Base64 string as a file
      await this.uploadString(storageRef, base64, 'base64', { customMetadata: metadata })

      // Creating an upload task 
      // const byteArray = new Uint8Array(Buffer.from(base64, 'base64'))
      // const uploadTask = uploadBytesResumable(storageRef, byteArray, { customMetadata: metadata })

      // console.log('Photo Profile uploaded successfully!')

      // // Just listening for progress/state changes, this is legal.
      // uploadTask.on("state_changed", (snapshot) => {
      //   var percent = snapshot.bytesTransferred / snapshot.totalBytes * 100
      //   console.log(percent + "% done")
      // })

      // // This is also legal.
      //   uploadTask.on("state_changed", {
      //     'complete': () => {
      //       console.log('upload complete!')
      //     }
      //   })
      // Get the download URL
      const downloadURL = await this.getDownloadURL(storageRef)
      console.log('Download URL:', downloadURL)
      return downloadURL
    } catch (error) {
      console.error('Error uploading file:', error)
      throw error
    }
  }

  async saveFileUrlToFirestore(userId: string, fileUrl: string): Promise<void> {
    const userDocRef = this.doc('users', userId) // Reference to the user's document

    try {
      await this.setDoc(userDocRef, { details: { photoURL: fileUrl } }, { merge: true })
      console.log('File URL saved to Firestore!')
    } catch (error) {
      console.error('Error saving file URL to Firestore:', error)
      throw error
    }
  }

  /* Crawler Packs - Browser Profiles - Crawler Configurations - Crawler Results - Crawler Strategies 
  *  Each of these should be their own collections and subcollections
  *  under the user document.
  */

  async storeBrowserProfile(userId: string, profile: BrowserProfile): Promise<void> {
    return this.storeUserConfig(userId, profile, 'browser', 'Browser profile')
  }

  async storeCrawlConfig(userId: string, config: CrawlConfig): Promise<void> {
   return this.storeUserConfig(userId, config, 'crawlconfigs', 'Crawl Config')
  }

  async storeCrawlResultsConfig(userId: string, config: CrawlResultConfig): Promise<void> {
    return this.storeUserConfig(userId, config, 'crawlresultsconfig', 'CrawlResult Config')
  }


  /**
 * Generic method to store user-related configurations in Firestore
 * @param userId The user ID
 * @param data The data object to store
 * @param collectionPath The subcollection path where data should be stored
 * @param itemName Human-readable name for logging
 * @returns Promise that resolves when the operation completes
 */
async storeUserConfig<T extends { id?: string; uid?: string }>(
  userId: string, 
  data: T, 
  collectionPath: string,
  itemName: string
): Promise<void> {
  try {
    const configCollection = this.collection(this.firestore, `users/${userId}/${collectionPath}`);
    data.uid = userId

    const configRef = data.id
      ? this.docRef(configCollection, data.id) // Update existing item
      : this.newDocRef(configCollection) // Create new item
    
    // Exclude 'id' property when storing the data
    const { id, ...dataWithoutId } = data as any
    await this.setDoc(configRef, dataWithoutId, { merge: !!data.id })
    console.log(`${data.id ? `${itemName} updated` : `New ${itemName} created`} in Firestore.`)
  } catch (error) {
    console.error(`Error storing user ${itemName.toLowerCase()} data:`, error)
    throw error
  }
}




  /**
   * This TypeScript function returns an observable that emits user data indicating whether a user is
   * currently authenticated.
   * @returns An observable that emits a boolean value indicating whether the user is authenticated or
   * not.
   */
  public authState(): Observable<User | null> {
    return runInInjectionContext(
      this._injector,
      (): Observable<User | null> => authState(this.afAuth).pipe(map((user: User | null) => user)), // Convert User | null to boolean
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
    )
  }

  /**
   * Note that the doc method could accept a CollectionReference or DocumentReference in addition to
   * Firestore.
   */
  public docRef<AppModelType, DbModelType extends DocumentData>(reference: CollectionReference<AppModelType, DbModelType>, path?: string, ...pathSegments: string[]): DocumentReference {
    return runInInjectionContext(
      this._injector,
      (): DocumentReference => doc(reference, path, ...pathSegments) as DocumentReference<DocumentData, DocumentData>,
    )
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
    )
  }

  public async addDoc(collectionRef: CollectionReference, data: unknown): Promise<DocumentReference<unknown, DocumentData>> {

    return this.runAsyncInInjectionContext(
      this._injector,
      async (): Promise<DocumentReference<unknown, DocumentData>> => {
        return await addDoc(collectionRef, data)
      },
    )
  }

  public newDocRef(collectionRef: CollectionReference): DocumentReference {
    return runInInjectionContext(
      this._injector,
      (): DocumentReference => doc(collectionRef),
    )
  }

  public collection(firestore: Firestore, path: string, ...pathSegments: string[]): CollectionReference {
    return runInInjectionContext(
      this._injector,
      (): CollectionReference => collection(firestore, path, ...pathSegments),
    )
  }

  public query(collectionRef: CollectionReference, ...queryConstraints: QueryConstraint[]): Query<DocumentData> {
    return runInInjectionContext(
      this._injector,
      (): Query<DocumentData> => query(collectionRef, ...queryConstraints),
    )
  }

  public where(fieldPath: string | FieldValue, opStr: any, value: any): QueryConstraint {
    return runInInjectionContext(
      this._injector,
      (): QueryConstraint => where(fieldPath, opStr, value),
    )
  }

  public limit(limits: number): QueryConstraint {
    return runInInjectionContext(
      this._injector,
      (): QueryConstraint => limit(limits),
    )
  }

  public getDocs(q: Query<DocumentData>): Promise<QuerySnapshot<DocumentData, DocumentData>> {
    return this.runAsyncInInjectionContext(
      this._injector,
      async (): Promise<QuerySnapshot<DocumentData, DocumentData>> => {
        return await getDocs(q)
      },
    )
  }

  public async setDoc(userRef: DocumentReference<DocumentData>, data: unknown, options: SetOptions): Promise<void> {
    return this.runAsyncInInjectionContext(
      this._injector,
      async (): Promise<void> => {
        await setDoc(userRef as DocumentReference<unknown, DocumentData>, data as Partial<unknown>, options)
      },
    )
  }

  public async deleteDoc(userRef: DocumentReference<DocumentData>): Promise<void> {
    return this.runAsyncInInjectionContext(
      this._injector,
      async (): Promise<void> => {
        await deleteDoc(userRef)
      },
    )
  }

  public async ref(storage: FirebaseStorage, path: string): Promise<StorageReference> {
    return this.runAsyncInInjectionContext(
      this._injector,
      async (): Promise<StorageReference> => {
        return ref(storage, path)
      },
    )
  }

  public async uploadString(storageRef: StorageReference, data: string,
    format: 'raw' | 'base64' | 'base64url' | 'data_url',
    metadata?: { [key: string]: any }): Promise<void> {

    return this.runAsyncInInjectionContext(
      this._injector,
      async (): Promise<void> => {
        await uploadString(storageRef, data, format, metadata)
      },
    )
  }

  public async getDownloadURL(storageRef: StorageReference): Promise<string> {
    return this.runAsyncInInjectionContext(
      this._injector,
      async (): Promise<string> => {
        return await getDownloadURL(storageRef)
      },
    )
  }

  public writeBatch(): WriteBatch {
    return runInInjectionContext(
      this._injector,
      (): WriteBatch => writeBatch(this.firestore),
    )
  }


  public signInWithPopup(provider: any, resolver?: PopupRedirectResolver) {
    return this.runAsyncInInjectionContext(
      this._injector,
      async (): Promise<UserCredential> => {
        return await signInWithPopup(this.afAuth, provider, resolver)
      },
    )
  }

  public async signInWithEmailAndPassword(email: string, password: string): Promise<UserCredential> {
    return this.runAsyncInInjectionContext(
      this._injector,
      async (): Promise<UserCredential> => {
        return await signInWithEmailAndPassword(this.afAuth, email, password)
      },
    )
  }

  public async reauthenticateWithCredential(currentUser: User, credential: AuthCredential): Promise<UserCredential> {
    return this.runAsyncInInjectionContext(
      this._injector,
      async (): Promise<UserCredential> => {
        return await reauthenticateWithCredential(currentUser, credential)
      },
    )
  }
  public async linkWithPopup(currentUser: User, provider: any, resolver?: PopupRedirectResolver): Promise<UserCredential> {
    return this.runAsyncInInjectionContext(
      this._injector,
      async (): Promise<UserCredential> => {
        return await linkWithPopup(currentUser, provider, resolver)
      },
    )
  }

  public async linkWithCredential(currentUser: User, credential: AuthCredential): Promise<UserCredential> {
    return this.runAsyncInInjectionContext(
      this._injector,
      async (): Promise<UserCredential> => {
        return await linkWithCredential(currentUser, credential)
      },
    )
  }

  public async updatePassword(currentUser: User, newPassword: string): Promise<void> {
    return this.runAsyncInInjectionContext(
      this._injector,
      async (): Promise<void> => {
        await updatePassword(currentUser, newPassword)
      },
    )
  }


  public async sendPasswordResetEmail(email: string, actactionCodeSettings?: ActionCodeSettings): Promise<void> {
    return this.runAsyncInInjectionContext(
      this._injector,
      async (): Promise<void> => {
        await sendPasswordResetEmail(this.afAuth, email, actactionCodeSettings)
      },
    )
  }

  public async signOut(): Promise<void> {
    return this.runAsyncInInjectionContext(
      this._injector,
      async (): Promise<void> => {
        await this.afAuth.signOut()
      },
    )
  }

  private increment(value: number): FieldValue {
    return runInInjectionContext(
      this._injector,
      (): FieldValue => increment(value),
    )
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
        fn().then(resolve).catch(reject)
      })
    })
  }


  runOutsideAngular<T>(fn: () => T): T { // Helper function
    return this.ngZone.runOutsideAngular(fn)
  }
  runInsideAngular<T>(fn: () => T): T { // Helper function
    return this.ngZone.run(fn)
  }
}
