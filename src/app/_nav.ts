export const navigation = [
    {
        name: 'Dashboard',
        url: '/dashboard',
        icon: {
            matIcon: 'speedometer'
        },
        identity: true,
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
        name: 'Passes',
        url: '/billing/passes',
        identity: true,
        icon: {
            matIcon: 'credit_card'
        },
        badge: {
            variant: 'new',
            text: 'new'
        },
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
