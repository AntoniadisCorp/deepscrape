import { Injectable } from '@angular/core'
import { Firestore, doc, setDoc, getDoc, onSnapshot, deleteDoc, collection, docSnapshots } from '@angular/fire/firestore'
import { openDB } from 'idb'
import { BehaviorSubject, Observable } from 'rxjs'
import { AuthService } from './auth.service'
import { FirestoreService } from './firestore.service'
import { BrowserConfig, BrowserProfile, CrawlConfig, CrawlPack, CrawlResult, CrawlResultConfig } from '../types'

@Injectable({ providedIn: 'root' })
export class CartService {
  private cartItem$ = new BehaviorSubject<any>(null)
  private dbName = 'PackDB'
  private storeName = 'pack'
  private userId: string

  constructor(
    private firestore: Firestore,
    private authService: AuthService,
    private firestoreService: FirestoreService
  ) {

    this.userId = this.authService.user.uid
    // set the firestore instance
    this.firestore = this.firestoreService.getInstanceDB('easyscrape')

    this.initDB()
    this.loadCartFromIndexedDB()
    this.listenToFirestoreChanges()
  }

  // Initialize IndexedDB
  private async initDB() {

    const storeName = this.storeName

    // Create the database if it doesn't exist
    await openDB(this.dbName, 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(storeName)) {
          db.createObjectStore(storeName, { keyPath: 'uid' })
        }
      },
    })
  }

  // Save cart item to IndexedDB
  private async saveToIndexedDB(item: any) {
    if (!item.uid)
      throw new Error('Item must have an uid property')

    const db = await openDB(this.dbName)
    const tx = db.transaction(this.storeName, 'readwrite')
    await tx.store.put(item)
    await tx.done
  }

  private async deletFromIndexedDB(id: string) {
    // Delete from IndexDb
    const db = await openDB(this.dbName)
    const tx = db.transaction(this.storeName, 'readwrite')
    await tx.store.delete(id)
    await tx.done

    this.cartItem$.next(null)
  }

  // Load cart from IndexedDB
  async loadCartFromIndexedDB(id: string = this.userId) {
    const db = await openDB(this.dbName)
    const item = await db.get(this.storeName, id)
    if (item) this.cartItem$.next(item)
    // console.log('Loaded from IndexedDB:', item, this.storeName, this.userId, this.cartItem$.value)

  }

  // Save to Firestore
  private async saveToFirestore(item: any) {
    // Save to Firestore
    await this.firestoreService.savePackToFirestore(this.userId, item)
  }

  private async updateToFirestore(item: any) {
    // Save to Firestore
    await this.firestoreService.savePackToFirestore(this.userId, item, false)
  }

  private async deleteFromFirestore() {
    // Save to Firestore
    await this.firestoreService.deletePackFromFirestore(this.userId)
  }

  // Listen for Firestore changes and update IndexedDB
  private listenToFirestoreChanges() {
    try {
      console.log('Listening to Firestore changes...')

      const cartRef = this.firestoreService.doc(`users/${this.userId}/cartpack/${this.userId}`)
      onSnapshot(cartRef, async (docSnap) => {
        if (docSnap.exists()) {
          const item = docSnap.data()

          if (Object.keys(item).length === 1 && item?.['uid']) {
            this.cartItem$.next(null)
            this.deletFromIndexedDB(this.userId)
            return
          }
          this.cartItem$.next(item)
          await this.saveToIndexedDB(item)
        }
      })

    } catch (error) {
      console.log('Listening to Firestore changes error', error)
    }
  }

  // Add item to cart
  async addItemToCart(item: any, scrapeType = 'crawl4ai') {
    const previousCart = this.cartItem$.value
    if (previousCart === null)
      item = { ...item, type: scrapeType, uid: this.userId }
    else item = { ...previousCart, ...item }

    this.cartItem$.next(item)
    await this.saveToIndexedDB(item)
    await this.saveToFirestore(item)
  }

  // Remove crawlpack item from cart
  async removeItemFromCart(attributeName: string) {
    // Get the current cart item
    const currentCartItem = this.cartItem$.value
    const hasAttribute = attributeName in currentCartItem

    // If the item inlucded in the current cart, remove the item from the cart
    if (hasAttribute && currentCartItem) {
      // Remove the attribute from the item
      delete currentCartItem[attributeName]

      // update indexedDB
      this.cartItem$.next(currentCartItem)
      await this.saveToIndexedDB(currentCartItem)

      // update to firestore
      await this.updateToFirestore(currentCartItem)
    }
    // if current cart has only uid attribute, delete the cart from firestore
    if (Object.keys(currentCartItem).length === 1 && currentCartItem.uid) {
      this.deletFromIndexedDB(this.userId)
      this.deleteFromFirestore()
    }
  }

  // Get current cart as Observable
  getCart() {
    return this.cartItem$.asObservable() as Observable<any> // BrowserProfile | CrawlConfig | CrawlResultConfig
  }
}
