import { Directive, Input, OnDestroy, TemplateRef, ViewContainerRef } from '@angular/core';
import { Subscription } from 'rxjs/internal/Subscription';
import { AuthzService } from '../services';

type AuthorizationResource = 'ai' | 'crawl' | 'machine' | 'billing' | 'organization';
type AuthorizationAction = 'execute' | 'read' | 'deploy' | 'update' | 'delete' | 'manage' | 'invite';

type AuthorizationInput = {
  resource: AuthorizationResource;
  action: AuthorizationAction;
  data?: { orgId?: string; ownerId?: string };
};

@Directive({
  selector: '[ifAuthorized]',
  standalone: true,
})
export class IfAuthorizedDirective implements OnDestroy {
  private subscription?: Subscription;

  @Input('ifAuthorized')
  set permission(config: AuthorizationInput | null) {
    this.subscription?.unsubscribe();
    this.viewContainer.clear();

    if (!config) {
      return;
    }

    this.subscription = this.authzService
      .can$(config.resource, config.action as never, config.data)
      .subscribe((allowed) => {
        this.viewContainer.clear();

        if (allowed) {
          this.viewContainer.createEmbeddedView(this.templateRef);
        }
      });
  }

  constructor(
    private readonly templateRef: TemplateRef<unknown>,
    private readonly viewContainer: ViewContainerRef,
    private readonly authzService: AuthzService,
  ) {}

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }
}
