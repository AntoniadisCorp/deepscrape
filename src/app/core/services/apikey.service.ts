import { inject, Injectable } from '@angular/core';
import { BehaviorSubject, catchError, from, map, Observable, of, Subscription, tap, throwError } from 'rxjs';
import { ApiKey, ApiKeyType } from '../types/apikey.interface';
import { SessionStorage } from './storage.service';
import { FirestoreService } from './firestore.service';
import { Firestore } from '@angular/fire/firestore';
import { connectFunctionsEmulator, Functions, getFunctions, httpsCallable, HttpsCallableResult } from '@angular/fire/functions';
import { environment } from 'src/environments/environment';
@Injectable({
    providedIn: 'root'
})
export class ApiKeyService {

    private retrieveKeysSub: Subscription;
    private apiKeysSubject = new BehaviorSubject<ApiKey[] | null>([]);
    private SessionStorage: Storage = inject(SessionStorage)

    apiKeys$ = this.apiKeysSubject.asObservable()

    constructor(
        private firestoreService: FirestoreService,
        private firestore: Firestore,
        private functions: Functions,) {
        // Load existing API keys from local storage or backend
        const storedKeys = this.SessionStorage.getItem('apiKeys');

        this.initializeApiKeys(storedKeys);



        // Initialize firestore function, select easyscrape db
        this.firestore = this.firestoreService.getInstanceDB('easyscrape')
        this.functions = getFunctions(this.firestore.app)

        if ( this.firestoreService.isLocalhost() && !environment.production) {
              
            console.log('🔥 Connecting to Firebase Emulators');
            connectFunctionsEmulator(this.functions, 'localhost', 8081)
        }
    }

    private initializeApiKeys(storedKeys: string | null) {
        if (storedKeys) {
            this.apiKeysSubject.next(JSON.parse(storedKeys));
        } else {
            this.apiKeysSubject.next(null);
            // Get Data from Firestore
            this.retrieveKeysSub = this.retrieveApiKeysPagination().pipe(
                catchError((error: any) => {
                    console.error('Error retrieving API keys:', error);
                    return of([]); // Return an empty array to prevent subscription errors
                })).subscribe({
                    next: (apiKeys: ApiKey[]) => {

                        // Update the API keys in the BehaviorSubject
                        this.apiKeysSubject.next(apiKeys);
                        this.saveApiKeys(apiKeys);
                    },
                    error: (error: any) => {
                        console.error('Error retrieving API keys:', error);
                    }
                })
        }

    }

    private retrieveApiKeysPagination(apiKeyPage: number = 1, apiKeyPageSize: number = 10): Observable<ApiKey[]> {
        return from(httpsCallable(this.functions, "retrieveMyApiKeysPaging")
            ({ apiKeyPage, apiKeyPageSize }))
            .pipe(
                map((fun: any) => {
                    const { error, apiKeys, message } = fun.data as any

                    if (error) {
                        console.error('Error creating API key:', error, apiKeys, message);
                        throw new Error(message, error);
                    }


                    console.log(apiKeys)
                    const newKeys = apiKeys.map((key: ApiKey): ApiKey => {
                        const created_At = new Date((((key.created_At as any)._seconds * 1000) + ((key.created_At as any)._nanoseconds / 1000000)))
                        const showKey = key.showKey
                        return { ...key, visibility: false, menu_visible: false, key: showKey, created_At: created_At }
                    })

                    return newKeys
                })
            )
    }

    private createApiKey(newkey: ApiKey): Observable<HttpsCallableResult<any>> {

        return from(httpsCallable(this.functions, "createMyApiKey")
            ({ apiKey: newkey }))
            .pipe(
                tap((fun: any) => {
                    const { error, apiKeyId, message } = fun.data as any

                    if (error) {
                        console.error('Error creating API key:', error, apiKeyId, message);
                        throw new Error(message, error);
                    }

                    newkey.id = apiKeyId

                    // Update the API keys in the BehaviorSubject
                    const currentKeys = this.apiKeysSubject.value || []
                    const updatedKeys = [...currentKeys, newkey];

                    // store key in cache
                    this.apiKeysSubject.next(updatedKeys);
                    this.saveApiKeys(updatedKeys);
                    // console.log(fun.data as any)
                }))
    }

    private getKeyDoVisible(key: ApiKey, index: number): Observable<ApiKey> {

        return from(httpsCallable(this.functions, "getApiKeyDoVisible")
            ({ apiKey: key }))
            .pipe(
                map((fun: any) => {
                    const { error, apiKey, message } = fun.data as any

                    if (error) {
                        console.error('Error creating API key:', error, apiKey, message);
                        throw new Error(message, error);
                    }

                    // Update the API keys in the BehaviorSubject
                    const currentKeys = this.apiKeysSubject.value || []

                    // the key remains same as before
                    if (index !== -1) {
                        currentKeys[index] = { ...key, visibility: true, menu_visible: false, showKey: apiKey.key } as ApiKey
                        // store key in cache
                        this.apiKeysSubject.next(currentKeys)
                    }

                    return apiKey as ApiKey
                })
            )
    }

    generateApiKey(name: string = 'New API Key', key: string = 'dpsp-key-' + this.generateRandomKey(),
        showKey: string = 'dpsp-key-' + this.generateFakeKey(), type: ApiKeyType = "custom", def: boolean = false) {
        const newKey: ApiKey = {
            id: this.generateUniqueId(),
            name,
            default: def,
            type,
            key,
            showKey,
            created_At: new Date(),
            permissions: ['read', 'delete'],
            menu_visible: false,
            visibility: false,
        };

        // make fire function https call to save the key in secret manager 
        // and the metadata in firestore db for current user

        // return the new Key
        return this.createApiKey(newKey)
    }

    deleteApiKey(keyToDelete: ApiKey) {
        const currentKeys = this.apiKeysSubject.value || []
        const updatedKeys = currentKeys.filter(key => key.id !== keyToDelete.id);

        this.apiKeysSubject.next(updatedKeys);
        this.saveApiKeys(updatedKeys);
    }

    setKeyVisible(key: ApiKey) {

        // Update the API keys in the BehaviorSubject
        const currentKeys = this.apiKeysSubject.value || []
        const index = currentKeys.findIndex(k => k.id === key.id)
        if (key.visibility) {
            // the key remains same as before
            if (index !== -1) {
                currentKeys[index] = { ...key, visibility: false, menu_visible: false, showKey: key.key } as ApiKey
                // store key in cache
                this.apiKeysSubject.next(currentKeys)
                return of(currentKeys[index])
            }
            return of({} as ApiKey)
        } else {
            return this.getKeyDoVisible(key, index).pipe(
                catchError((error: any) => {
                    console.error('Error retrieving API keys:', error);
                    // the key remains same as before

                    if (index !== -1) {
                        currentKeys[index] = { ...key, key: key.showKey } as ApiKey
                        // store key in cache
                        this.apiKeysSubject.next(currentKeys)
                    }
                    return throwError(() => error); // Return an empty array to prevent subscription errors
                })
            )
        }


    }

    setMenuVisible(key: ApiKey) {
        const currentKeys = this.apiKeysSubject.value || []
        const updatedKeys = currentKeys?.map(k => {
            if (k.id === key.id) {
                return { ...k, menu_visible: !k.menu_visible };
            }
            return k;
        })
        this.apiKeysSubject.next(updatedKeys);
        this.saveApiKeys(updatedKeys);
    }

    private generateUniqueId(): string {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    private generateRandomKey(length: number = 32): string {
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += characters.charAt(Math.floor(Math.random() * characters.length));
        }
        return result;
    }

    generateFakeKey(size: number = 32, start: number = 0): string {
        let result = '';
        let i = start
        for (i = 0; i < size; i++) {
            result += '*';
        }
        return result;
    }
    private saveApiKeys(keys: ApiKey[]) {
        this.SessionStorage.setItem('apiKeys', JSON.stringify(keys));
    }

    ngOnDestroy(): void {
        //Called once, before the instance is destroyed.
        //Add 'implements OnDestroy' to the class.
        this.retrieveKeysSub?.unsubscribe()
        this.apiKeysSubject?.unsubscribe()
    }
}
