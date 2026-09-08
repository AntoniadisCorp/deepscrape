# [0.8.0](https://github.com/deepscrape/deepscrape/compare/v0.7.2...v0.8.0) (2026-09-08)


### Bug Fixes

* **analytics:** read flat breakdown keys in range charts ([2d7d4e2](https://github.com/deepscrape/deepscrape/commit/2d7d4e2eacf5875cc3fd38bc3bea98616391b31d))
* **app:** add missing apple-touch icon sizes from the head links ([826f669](https://github.com/deepscrape/deepscrape/commit/826f6698aa99d21fbab4c5d337e638af48403ad8))
* **ci:** preserve Bun lockfile permissions ([f54cdb4](https://github.com/deepscrape/deepscrape/commit/f54cdb4a137a63dcbf9c184771728e40a628bb08))
* **ci:** sync functions Bun lockfile for SSR dependencies ([48af2b9](https://github.com/deepscrape/deepscrape/commit/48af2b9dbfe8367eaf51e6d211decaece3b086bd))
* **ci:** sync functions lockfile for SSR dependencies ([fe9d224](https://github.com/deepscrape/deepscrape/commit/fe9d2240fe15afad95f5984d892c84acde58aaf6))
* **functions:** 404 missing static assets instead of serving index.html ([b629f24](https://github.com/deepscrape/deepscrape/commit/b629f24d1d34c1743e909de2e93e6efb4bac4824))
* **functions:** 404 missing static assets instead of serving index.html ([ef9dbee](https://github.com/deepscrape/deepscrape/commit/ef9dbee356eb4afcba28276672a249166de1ad08))
* **functions:** document geo lookup parameters ([d9d5eab](https://github.com/deepscrape/deepscrape/commit/d9d5eab1ca461438a48a28f02dbee28d25dfbc15))
* **functions:** document geo lookup parameters ([86cf9a0](https://github.com/deepscrape/deepscrape/commit/86cf9a03a8a842741c2735d7a5599a36e0e63d92))
* **functions:** never let guest tracking block page SSR delivery ([2c20870](https://github.com/deepscrape/deepscrape/commit/2c208708855ff76b0bdf1d16776384d07f8c9409))
* **functions:** satisfy SSR predeploy lint rules ([2f9b404](https://github.com/deepscrape/deepscrape/commit/2f9b4049bd391ffe49eca60bfdc0c61c9211cb12))
* **geo:** stop no-match re-enrich loop spend ([31a36b6](https://github.com/deepscrape/deepscrape/commit/31a36b692c75f52198d12151db025458ecc44495))
* **ssr:** stop prerendering authenticated routes ([63e2087](https://github.com/deepscrape/deepscrape/commit/63e2087b56e2dc47cc66ee8b88e823d7a211b589))
* **test:** complete TranslateService mock for the v17 TranslatePipe ([2899618](https://github.com/deepscrape/deepscrape/commit/2899618f8e05d13d2088359365de483834685c5b))
* **test:** complete TranslateService mock for the v17 TranslatePipe ([c68feec](https://github.com/deepscrape/deepscrape/commit/c68feec57370651e53126e106f7a478dea8ae0b1))


### Features

* **analytics:** include ASN and ISP breakdowns in range metrics ([5fe4aeb](https://github.com/deepscrape/deepscrape/commit/5fe4aeb2d92b10e202b6454242451a3c5c124c31))
* **analytics:** include ASN and ISP breakdowns in range metrics ([0ab1721](https://github.com/deepscrape/deepscrape/commit/0ab1721f3846e68f85120d97517de4afa1191408))
* **geo:** coalesce concurrent IP lookups and add country-based deny-lists ([90aa3f8](https://github.com/deepscrape/deepscrape/commit/90aa3f8ab798f44531010e4bc848c4dea456bd65))
* **geo:** coalesce concurrent IP lookups and add country-based deny-lists ([e5a47fe](https://github.com/deepscrape/deepscrape/commit/e5a47feb21f2ccc0750e79bea0da7f42605288f2))
* **i18n:** add es, fr and de locales with header language picker ([3cd89b3](https://github.com/deepscrape/deepscrape/commit/3cd89b3a5076cf633093b832e61c4af0f1dab1a9))
* **i18n:** add es, fr and de locales with header language picker ([227cc3e](https://github.com/deepscrape/deepscrape/commit/227cc3edda85c7f6d81c8ca9b4fb04838b39f577))
* **i18n:** localize app templates and runtime strings with [@ngx-translate](https://github.com/ngx-translate) ([b6c4623](https://github.com/deepscrape/deepscrape/commit/b6c462320d7de1d3a93045ca1e7fca873e52b1e8))
* **i18n:** localize app templates and runtime strings with [@ngx-translate](https://github.com/ngx-translate) ([f625ec9](https://github.com/deepscrape/deepscrape/commit/f625ec96a02c44496bca2c53ec7eec87331ce117))
* **i18n:** translate agent, playground, hero and nav copy (el, es, fr, de) ([1439764](https://github.com/deepscrape/deepscrape/commit/143976430e6c805135ed337b26cad21c8a268339))
* **i18n:** translate agent, playground, hero and nav copy (el, es, fr, de) ([cfd005b](https://github.com/deepscrape/deepscrape/commit/cfd005bb3910c2a3edd64a5410383f8f572a66b7))
* landing redesign, accurate pricing, theme system and 404/legal refresh ([8e7d5a5](https://github.com/deepscrape/deepscrape/commit/8e7d5a5784b5aec1d33791341b4bffd5313baddd))
* **legal:** align privacy, terms and 404 pages with landpage chrome ([bc83dbc](https://github.com/deepscrape/deepscrape/commit/bc83dbca5098e039eb6fbd883ef7512c9b3e0e8f))
* **legal:** align privacy, terms and 404 pages with landpage chrome ([d532683](https://github.com/deepscrape/deepscrape/commit/d532683f6c8d66283538c2a8cab7dd26bac25924))
* **marketing:** add AI research agent section and live playground rework ([67058d0](https://github.com/deepscrape/deepscrape/commit/67058d0b2af4a9ee54d0b6b0d8c5808bd6c5da98))
* **marketing:** add AI research agent section and live playground rework ([990abf8](https://github.com/deepscrape/deepscrape/commit/990abf83d605ff542eb39dc1027c81b7a1580a49))
* **marketing:** add privacy/terms pages and scroll-reveal animations ([b663910](https://github.com/deepscrape/deepscrape/commit/b6639105a6c4f7069685e5aa9eb6a99e4957aeef))
* **marketing:** add privacy/terms pages and scroll-reveal animations ([0b2b1c6](https://github.com/deepscrape/deepscrape/commit/0b2b1c6cd7b9e5b5f29ad10fc0e1c079d3a8928a))
* **marketing:** refresh landing with live demo, managed pricing and art ([f9234ca](https://github.com/deepscrape/deepscrape/commit/f9234ca7472f42aa3ab5391e1f369802916d5a31))
* **marketing:** refresh landing with live demo, managed pricing and art ([8565cd8](https://github.com/deepscrape/deepscrape/commit/8565cd8c78d829f3adced6c09c465e737bb3c9de))
* **seo:** add per-route titles, robots, sitemap and OG image ([f40a0e0](https://github.com/deepscrape/deepscrape/commit/f40a0e00a6a7aa01ca1784614700050cd1f030e8))
* **seo:** add per-route titles, robots, sitemap and OG image ([94ef7b1](https://github.com/deepscrape/deepscrape/commit/94ef7b17ff2d170ac9bce2c06451a2847019986e))
* **theme:** add Light/Dark/System toggle defaulting to OS scheme ([cb3ef3e](https://github.com/deepscrape/deepscrape/commit/cb3ef3ecf1c2ec295290ba067bedb1b4652f8254))
* **theme:** add Light/Dark/System toggle defaulting to OS scheme ([0697752](https://github.com/deepscrape/deepscrape/commit/069775299affc5362fbc2bacb1add8a136053fc1))


### Performance Improvements

* **app:** clean the remaining component subscription leaks ([e5942cc](https://github.com/deepscrape/deepscrape/commit/e5942cc313c2771b524047667821e62ef6b13878))
* **app:** defer landing hydration below the fold ([cc0f6a7](https://github.com/deepscrape/deepscrape/commit/cc0f6a7618e3414d3ed75b070d5512b4c59b97de))
* **app:** drop unused global payload and trim head fonts ([4c10922](https://github.com/deepscrape/deepscrape/commit/4c109222d30636d7971d5b4730248d4462186359))
* **app:** enable hydration with incremental hydration and event replay ([62c127c](https://github.com/deepscrape/deepscrape/commit/62c127c99917784e05626afa9dcd5bd97a4073ec)), closes [#ng-state](https://github.com/deepscrape/deepscrape/issues/ng-state)
* **app:** on-push + native track for crawl and seed results ([481057e](https://github.com/deepscrape/deepscrape/commit/481057e53c8a23d16eaec77a8d8266220b061b7a))
* **app:** onpush for verified auth shell and shared chrome ([06c70d1](https://github.com/deepscrape/deepscrape/commit/06c70d1c15476d93c62e44b5f5ddd44fd42f396b))
* **app:** shrink first-paint bundle & dead-code cleanup → next ([d526441](https://github.com/deepscrape/deepscrape/commit/d526441015d0ca3f7b45d735bd24183d6bb7decf))
* **assets:** delete dead media and right-size landing images ([b96b9e4](https://github.com/deepscrape/deepscrape/commit/b96b9e4ce3b508255747c03c3b4d4590d39b2c6d))
* **bundle:** deep-import core components out of the landing shell ([b537724](https://github.com/deepscrape/deepscrape/commit/b537724325876ba89083f90567341876617785b2))
* **functions:** engine-render dynamic routes in the deepscrape function ([bc3a496](https://github.com/deepscrape/deepscrape/commit/bc3a4969b35a33cfe07c45bdc2f431d8f93a01b6))
* **functions:** raise default runtime memory to 512MiB ([ae53e94](https://github.com/deepscrape/deepscrape/commit/ae53e94842455f6fc2f0e0171211cdac02c365f5))
* **functions:** raise default runtime memory to 512MiB ([0067f07](https://github.com/deepscrape/deepscrape/commit/0067f077150bc58e928f61b7a03f1a1a6165895a))
* **landing:** defer heavy use-cases video until scroll into view ([6caee46](https://github.com/deepscrape/deepscrape/commit/6caee4627e9224ebe633e435ef0bb1b11bf813f4))
* **providers:** scope markdown, charts and stripe providers to lazy routes ([0cf9164](https://github.com/deepscrape/deepscrape/commit/0cf91640e988b33aba3d7405dc76b86acd2be504))

## [0.7.2](https://github.com/deepscrape/deepscrape/compare/v0.7.1...v0.7.2) (2026-09-06)


### Bug Fixes

* **analytics:** read flat breakdown keys in range charts ([deaa20c](https://github.com/deepscrape/deepscrape/commit/deaa20c376dcad2fb896490cc35484da74906078))

## [0.7.1](https://github.com/deepscrape/deepscrape/compare/v0.7.0...v0.7.1) (2026-09-06)


### Bug Fixes

* **geo:** stop no-match re-enrich loop spend ([0c3bda8](https://github.com/deepscrape/deepscrape/commit/0c3bda8bcada97e0aa4f12c66cb47da7a93c37c8))

# [0.7.0](https://github.com/deepscrape/deepscrape/compare/v0.6.4...v0.7.0) (2026-09-06)


### Bug Fixes

* **admin-migration:** adjust checkbox width for better layout consistency ([a788ab8](https://github.com/deepscrape/deepscrape/commit/a788ab85a2bdcaaadb15becacc1b58c52cf9c754))
* **auth-flow:** stabilize returnUrl and MFA sign-in routing ([f7e3da1](https://github.com/deepscrape/deepscrape/commit/f7e3da14298f93c366cc8e1e201811f685ec86f5))
* **auth:** handle revoked sessions end to end ([fa12e61](https://github.com/deepscrape/deepscrape/commit/fa12e61ae1134145c74566f989b5381dc51e7d93))
* **auth:** harden admin fallback and phone verification flows ([a59b11b](https://github.com/deepscrape/deepscrape/commit/a59b11b4e006a3c03d8e7e856164a773c0d7e70d))
* **auth:** harden MFA enrollment, active sessions, phone link and route guards ([4102844](https://github.com/deepscrape/deepscrape/commit/41028444f5034646687b66da805d988d37fddb9e))
* **auth:** improve fallback fingerprint generation safety ([71799e6](https://github.com/deepscrape/deepscrape/commit/71799e6310d0775f6d434c83fd2a53097e82fada))
* **auth:** make device fingerprinting SSR-safe ([a564e1a](https://github.com/deepscrape/deepscrape/commit/a564e1a917e34bb23c7587ee6dfe180348ddd1b0))
* **auth:** persist signup phone before verification ([074ed40](https://github.com/deepscrape/deepscrape/commit/074ed40e4a76923013376341ff3c47b6866f709e))
* **auth:** resolve PR review security and SSR issues ([e83fa67](https://github.com/deepscrape/deepscrape/commit/e83fa672ff63100f5d2b70742e4bdc29083775ae))
* **auth:** update fallback error message translation logic ([5f55238](https://github.com/deepscrape/deepscrape/commit/5f55238995b2f0ce17fa5647a27ac427c12db412))
* **authz,security,test:** address PR [#70](https://github.com/deepscrape/deepscrape/issues/70) Copilot review findings ([d39190a](https://github.com/deepscrape/deepscrape/commit/d39190a13ce0a187f4c6a2c1032238e5afe99890))
* **authz:** prevent reload redirect races on guarded routes ([d177130](https://github.com/deepscrape/deepscrape/commit/d1771302d523ff33bdd9f280b8d3219af369596a))
* **billing:** allow eligible users to start trial from plans page ([73f20a1](https://github.com/deepscrape/deepscrape/commit/73f20a11ff821f702efd0d63d94eae5c6cc39586))
* **billing:** hide Stripe price IDs from non-admins; fix leaf icon rotation ([b0e0b1f](https://github.com/deepscrape/deepscrape/commit/b0e0b1f2d0ecd62d62de68ddf3295e864f9dc4c1))
* **billing:** relax app-check enforcement on callables ([6cf448c](https://github.com/deepscrape/deepscrape/commit/6cf448ccb0b8e9b20295c6676a3db62b44df9249))
* **billing:** tighten usage auth and env parsing defaults ([307a362](https://github.com/deepscrape/deepscrape/commit/307a36204dd5e2db6b0de6f17d34e8004b70d6e5))
* **ci:** recreate release asset branches without stale LFS refs ([62a7910](https://github.com/deepscrape/deepscrape/commit/62a7910082fd4f59377ec356f11edcf122792a6f))
* **ci:** sync root and functions package-lock.json ([e463049](https://github.com/deepscrape/deepscrape/commit/e463049834ae9bc71e43dd715caa3f1284159850))
* **ci:** use chromium binary for Angular headless tests ([8ad969f](https://github.com/deepscrape/deepscrape/commit/8ad969f147d8f297a842298a56ec069e30394947))
* **component:** initialize existingMachines array in AppDockerStepperComponent ([1bb9696](https://github.com/deepscrape/deepscrape/commit/1bb9696e884652da9195a08282a8c3537b578984))
* **csrf:** harden token refresh for emulator and web ([3673b30](https://github.com/deepscrape/deepscrape/commit/3673b304575f927e2b93099f9017decccaa1ea0a))
* **firebase:** avoid duplicate app initialization paths ([ae21c50](https://github.com/deepscrape/deepscrape/commit/ae21c50343b7a93b7e0f5a97ed8502277d687538))
* **firestore:** harden fallback rule, add audit_logs and trusted_devices coverage ([99761f1](https://github.com/deepscrape/deepscrape/commit/99761f117527819ac96e78f3ceae516a970b49fa))
* **functions:** isolate emulator secret storage path ([35b2d45](https://github.com/deepscrape/deepscrape/commit/35b2d451520abc86dec3762a5405174500fed1bd))
* **geo:** cache failed lookups to stop re-enrich storm ([ac15190](https://github.com/deepscrape/deepscrape/commit/ac15190d4765c11d22efa0563f5e6eee9ce43984))
* **gitignore:** remove serviceAccount.json from being tracked ([4833b60](https://github.com/deepscrape/deepscrape/commit/4833b60651503b300798af9f797badfb336fe742))
* **layout:** prevent playground horizontal overflow ([0142015](https://github.com/deepscrape/deepscrape/commit/0142015c139be73d5098581dd3d3815c1a5a93f4))
* **package:** root cause your repo’s root package.json includes ([0a20ebc](https://github.com/deepscrape/deepscrape/commit/0a20ebcf37a842e65a7994f36338445601ad39e2))
* **release:** correct GITHUB_TOKEN secret reference in release workflow ([48e2bad](https://github.com/deepscrape/deepscrape/commit/48e2badf37798bbc369a5902e91519982facde6a))
* **release:** update GH_TOKEN secret reference to GITHUB_TOKEN in release workflow ([79991a9](https://github.com/deepscrape/deepscrape/commit/79991a90e276eaff825af60ff97c251cc3b6ead9))
* **release:** update GITHUB_TOKEN secret reference to GH_TOKEN ([d9e233d](https://github.com/deepscrape/deepscrape/commit/d9e233d856701ddf3636b4f8c37e2c8830c6c334))
* **release:** update token references and add GitHub App token generation step ([2e683df](https://github.com/deepscrape/deepscrape/commit/2e683df0ae3343908da7029a59e41e7e7df1b10c))
* replace jest type with jasmine in tsconfig.json ([2399533](https://github.com/deepscrape/deepscrape/commit/23995336e50fdd79fa3b0959f89c7b601cf28e3a))
* **security:** harden provider linking and mfa flows ([ed67535](https://github.com/deepscrape/deepscrape/commit/ed6753506f354856ff848c3165c34c5a909aecca))
* **server:** update backend function configuration and add serviceAccount.json to .gitignore ([2569fdc](https://github.com/deepscrape/deepscrape/commit/2569fdc8b9a4610b2b8ff9017355e607178b1735))
* **tests:** add global test setup and suppress console.error messages ([4d97ea0](https://github.com/deepscrape/deepscrape/commit/4d97ea0a549ce52bdadca5be75b35533bb69389d))
* **tests:** add test Stripe publishable key to getTestProviders ([311944b](https://github.com/deepscrape/deepscrape/commit/311944b3ab7536ba0c11a9246b3a337191811e48))
* **tests:** address code review - add permissions to CI jobs and improve spec comments ([8e46995](https://github.com/deepscrape/deepscrape/commit/8e46995efd041671403d2016bc2c129fa5afb27e))
* **tests:** fix 26 failing Karma tests - Q2-Q4 implementation phase ([0bb2633](https://github.com/deepscrape/deepscrape/commit/0bb2633741f9cfc208007ba2df562f5a1e9876c2))
* **tests:** fix 3 remaining failing specs + add test CI workflow ([a23a1b1](https://github.com/deepscrape/deepscrape/commit/a23a1b10749becf9f1f82cc1483a28d073200d87))
* **tests:** fix CI build failure and upgrade failing Karma specs ([676731e](https://github.com/deepscrape/deepscrape/commit/676731ebd7b5081325eb94969a6abce9999638d0))
* **tests:** update CI test configuration and improve logging ([23a7fca](https://github.com/deepscrape/deepscrape/commit/23a7fcabf94f829792981929841c3976baa0be7b))
* **test:** use no-sandbox launcher for CI headless Chrome ([a624a8e](https://github.com/deepscrape/deepscrape/commit/a624a8e905d0d97090f9107a2d04533609643351))
* **verification:** clarify phone state and dedupe session metrics ([86bbd15](https://github.com/deepscrape/deepscrape/commit/86bbd15bafc60dc8686db4d5a0811daddd282564))
* **workflow:** update trigger to include push events for 'main' branch ([c99d202](https://github.com/deepscrape/deepscrape/commit/c99d202b8fd24432c3d7a493a70193784fb7f679))


### Features

* **admin/billing-observability:** billing health dashboard and checkout idempotency ([b3055b8](https://github.com/deepscrape/deepscrape/commit/b3055b8b7c690586cbab650f5559084913a1bcf2))
* **admin:** add project configuration workspace section ([b50b452](https://github.com/deepscrape/deepscrape/commit/b50b4520cb4e10dba730d51400da81052ddb9709))
* **analytics:** add realtime active-user presence metrics ([1502af9](https://github.com/deepscrape/deepscrape/commit/1502af9ded2151af29341dcede60c66c0b378530))
* **analytics:** add scheduled aggregation and summary-first reads ([d7927ae](https://github.com/deepscrape/deepscrape/commit/d7927aea01d66fad66974cc417ee31b217da9280))
* **auth:** bootstrap admin and cursor pagination ([f93e26d](https://github.com/deepscrape/deepscrape/commit/f93e26d8384505653441f512642691d58a139cf1))
* **auth:** harden session lifecycle and onboarding access ([8c6ca30](https://github.com/deepscrape/deepscrape/commit/8c6ca30fa27ffccbed6495d3e3b7e935c59da6d2))
* **authz:** add client authz guard and directive ([1ee0f8c](https://github.com/deepscrape/deepscrape/commit/1ee0f8ca16d09eb208719493fb1220f7fcf1ce52))
* **authz:** add invitation acceptance and member endpoints ([8ee42f0](https://github.com/deepscrape/deepscrape/commit/8ee42f03e675f2be8efab05f1bd1c0eb7c426993))
* **authz:** add org bootstrap in user layout ([b02e825](https://github.com/deepscrape/deepscrape/commit/b02e825809ed9ae5db60ad073819e6ab7d5ef5ff))
* **authz:** add organization api and client org service ([0a80946](https://github.com/deepscrape/deepscrape/commit/0a809463d858121a9ba7c8bc9e21620b121c8010))
* **authz:** add server-side rebac+abac enforcement slice ([56c798d](https://github.com/deepscrape/deepscrape/commit/56c798d4b85184eb393769d5ddc6851f127ac3e1))
* **authz:** add workspace settings management tab ([07519b4](https://github.com/deepscrape/deepscrape/commit/07519b47c2c2096df93852c3098e7973b84ec7f9))
* **authz:** implement production ReBAC+ABAC authorization architecture ([ad93612](https://github.com/deepscrape/deepscrape/commit/ad9361294da0a168030e83950e6424e1a93aa01d))
* **authz:** integrate angular rebac context handling ([2511304](https://github.com/deepscrape/deepscrape/commit/2511304d1c14847d039fa76133b280c6d3eb0ac1))
* **billing-ui:** add skeleton loading for usage report ([53c5e25](https://github.com/deepscrape/deepscrape/commit/53c5e251ae0fbfdb21febcc85206cca50740cdb2))
* **codebase:** add enterprise session management and device verification ([364df96](https://github.com/deepscrape/deepscrape/commit/364df96f50877347f2d6d7a0ed9fc86a9a5682ee))
* **functions/sessions:** server-side geo, admin callables, AppCheck ([778667c](https://github.com/deepscrape/deepscrape/commit/778667c20640e7f2b2d53858a06e11631bf69c71))
* **functions/stripe:** enforce appcheck, ssrf url validation, billing observability ([3618091](https://github.com/deepscrape/deepscrape/commit/3618091df9bc17cb27adf759d94445f19722aee1))
* **onboarding:** align plan picker with billing catalog ([f91cd2b](https://github.com/deepscrape/deepscrape/commit/f91cd2b739ac4c1a8ab697b52e03ddcfc944dc57))
* **org:** improve invitations and workspace management ([5ab06eb](https://github.com/deepscrape/deepscrape/commit/5ab06eb447dc4c5fb024ab61670c90f93c221557))
* **platform:** pr70 release - authz, enterprise sessions, billing, analytics, landing ([6699e12](https://github.com/deepscrape/deepscrape/commit/6699e121eb3cf328e86c0fe1cb54d40041e10756))
* **security:** harden api key deletion and reveal controls ([cea39cf](https://github.com/deepscrape/deepscrape/commit/cea39cf4b3c38df371195fe9fbd7b79db968882c)), closes [#codebase](https://github.com/deepscrape/deepscrape/issues/codebase)
* **ui/animations:** add listStaggerAnimation, polish PopupAnimation ([9626daa](https://github.com/deepscrape/deepscrape/commit/9626daa139a9f079dee270d76d65a2a6b741d314))
* **ui/skeleton:** structured skeleton loaders with shimmer sweep across components ([13b3836](https://github.com/deepscrape/deepscrape/commit/13b3836ac4ebadaf9bc1b29af8ea3d1c286d4812))
