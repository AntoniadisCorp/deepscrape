import { Injectable } from '@angular/core'
import { HttpClient, HttpHeaders } from '@angular/common/http'
import { Observable, throwError } from 'rxjs'
import { catchError, tap } from 'rxjs/operators'
import { AuthService } from './auth.service'
import { AuthzService } from './authz.service'
import { API_ORGANIZATIONS } from '../variables'

type OrganizationSummary = {
  id: string
  name?: string
  slug?: string
  ownerId?: string
  plan?: string
  membership?: {
    role: 'owner' | 'admin' | 'member' | 'viewer'
  }
}

type OrganizationListResponse = {
  organizations: OrganizationSummary[]
}

@Injectable({
  providedIn: 'root',
})
export class OrganizationService {
  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private authzService: AuthzService,
  ) {}

  private getAuthHeaders(): HttpHeaders {
    return new HttpHeaders({
      Authorization: `Bearer ${this.authService.token}`,
      'Content-Type': 'application/json',
    })
  }

  listMyOrganizations(): Observable<OrganizationListResponse> {
    return this.http.get<OrganizationListResponse>(API_ORGANIZATIONS, {
      headers: this.getAuthHeaders(),
    }).pipe(
      tap((response) => {
        const activeOrgId = this.authzService.activeOrgId
        if (!activeOrgId && response.organizations?.length) {
          this.authzService.setActiveOrgId(response.organizations[0].id)
        }
      }),
      catchError((error) => {
        console.error('Failed to fetch organizations:', error)
        return throwError(() => error)
      }),
    )
  }

  createOrganization(name: string): Observable<{ id: string }> {
    return this.http.post<{ id: string }>(
      API_ORGANIZATIONS,
      { name },
      { headers: this.getAuthHeaders() },
    ).pipe(
      tap((response) => {
        this.authzService.setActiveOrgId(response.id)
      }),
      catchError((error) => {
        console.error('Failed to create organization:', error)
        return throwError(() => error)
      }),
    )
  }

  createInvitation(orgId: string, email: string, role: 'owner' | 'admin' | 'member' | 'viewer' = 'member'): Observable<{ id: string }> {
    return this.http.post<{ id: string }>(
      `${API_ORGANIZATIONS}/${orgId}/invitations`,
      { email, role },
      { headers: this.getAuthHeaders() },
    ).pipe(
      catchError((error) => {
        console.error('Failed to create organization invitation:', error)
        return throwError(() => error)
      }),
    )
  }

  setActiveOrganization(orgId: string | null): void {
    this.authzService.setActiveOrgId(orgId)
  }
}
