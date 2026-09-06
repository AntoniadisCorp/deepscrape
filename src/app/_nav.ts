export const navigation = [
    {
        name: 'Dashboard',
        url: '/dashboard',
        icon: {
            matIcon: 'speedometer'
        },
        identity: true,
    },
    {
        name: 'Admin',
        url: '',
        icon: {
            matIcon: 'admin_panel_settings'
        },
        children: [
            {
                name: 'Analytics',
                url: '/admin/analytics',
                icon: {
                    matIcon: 'pie_chart'
                },
                badge: {
                    variant: 'info',
                    text: 'new'
                },
            },
            {
                name: 'Billing Observability',
                url: '/admin/billing-observability',
                icon: {
                    matIcon: 'monitoring'
                }
            },
            {
                name: 'Migration',
                url: '/admin/migration',
                icon: {
                    matIcon: 'sync_alt'
                }
            },
            {
                name: 'Migration Runs',
                url: '/admin/migration/runs',
                icon: {
                    matIcon: 'history'
                }
            },
            {
                name: 'Migration Backups',
                url: '/admin/migration/backups',
                icon: {
                    matIcon: 'backup'
                }
            },
        ]
    },
    /* Posts Management  */
    {
        name: 'Playground',
        url: '/playground',
        icon: {
            matIcon: 'sports_esports'
        },

        identity: true,
    },
    {
        name: 'Crawl Pack',
        url: '/crawlpack',
        icon: 'crawl_logo',

        identity: true,
    },

    {
        name: 'Operations',
        url: '/operations',
        icon: {
            matIcon: 'storage'
        },

        identity: true,
    },
    {
        name: 'AI Chat',
        url: '/chatai',
        icon: {
            matIcon: 'chatai'
        },
        badge: {
            variant: 'new',
            text: 'νέο!'
        }
    },
    {
        name: 'Analytics',
        url: '/charts',
        icon: {
            matIcon: 'pie_chart'
        }
    },
    /* Billing Management  */
    {
        divider: true,
    },
    {
        title: true,
        name: 'Billing'
    },

    /* Menu Management  */
    {
        name: 'Plans',
        url: '/billing/plans',
        identity: true,
        icon: {
            matIcon: 'workspace_premium'
        },
        badge: {
            variant: 'new',
            text: 'new'
        },
    },
    {
        name: 'Usage',
        url: '/billing/usage',
        identity: true,
        icon: {
            matIcon: 'query_stats'
        }
    },



    /*
    {
      divider: true
    },
    {
      title: true,
      name: 'Smart Car',
    },
    {
      name: 'Icons',
      url: '/icons',
      icon: 'icon-star',
      children: [
        {
          name: 'Font Awesome',
          url: '/icons/font-awesome',
          icon: 'icon-star',
          badge: {
            variant: 'secondary',
            text: '4.7'
          },
        },
        {
          name: 'Simple Line Icons',
          url: '/icons/simple-line-icons',
          icon: 'icon-star',
        }
      ]
    }, */
    {
        divider: true
    },
    {
        title: true,
        name: 'Settings',
    },

    /* API keys Management  */
    {
        name: 'Api Keys',
        url: '/settings/keys',
        identity: true,
        icon: {
            matIcon: 'keys'
        }
    },

    {
        name: 'Profile',
        identity: true,
        url: '/settings/profile',
        icon: {
            matIcon: 'person'
        }
    },

    /* {
      name: 'Εγγραφή Χρήστη',
      url: '/service/register',
      icon: 'signup'
    } */
    /*  {
       name: 'Download CoreUI',
       url: 'http://coreui.io/angular/',
       icon: 'icon-cloud-download',
       class: 'mt-auto',
       variant: 'success'
     },
     {
       name: 'Try CoreUI PRO',
       url: 'http://coreui.io/pro/angular/',
       icon: 'icon-layers',
       variant: 'danger'
     } */
];
