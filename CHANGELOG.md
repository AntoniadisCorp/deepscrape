# [0.5.1-beta.1](https://github.com/AntoniadisCorp/deepscrape/compare/v0.4.0-beta.13...v0.5.1-beta.1) (2026-03-15)

### Bug Fixes

* fix: correct stray quotes and missing newlines in .env.example files ([a39e271](https://github.com/AntoniadisCorp/deepscrape/commit/a39e271))

### Build

* build(release): align commit-analyzer with conventionalcommits preset and semver rules ([2cef8ed](https://github.com/AntoniadisCorp/deepscrape/commit/2cef8ed))

### CI

* ci: fetch and verify IP2LOCATION DB via LFS ([968032c](https://github.com/AntoniadisCorp/deepscrape/commit/968032c))
* ci(firebase): migrate functions deploy to firebase-tools CLI with GCP auth ([442e72c](https://github.com/AntoniadisCorp/deepscrape/commit/442e72c))

### Chore

* chore: add IP2LOCATION DB via Git LFS ([a69aa04](https://github.com/AntoniadisCorp/deepscrape/commit/a69aa04))
* chore: update changelog and package version [skip ci] ([ee2cf18](https://github.com/AntoniadisCorp/deepscrape/commit/ee2cf18))
* chore: update changelog and package version [skip ci] ([51f2b1a](https://github.com/AntoniadisCorp/deepscrape/commit/51f2b1a))
* chore(changelog): remove non-conventional commit entries from v0.4.0-beta.13 section ([28854c5](https://github.com/AntoniadisCorp/deepscrape/commit/28854c5))
* chore(release): fix hosting CI and add env example templates ([bcbf953](https://github.com/AntoniadisCorp/deepscrape/commit/bcbf953))

### Misc

* Initial plan ([380e9d8](https://github.com/AntoniadisCorp/deepscrape/commit/380e9d8))
* Initial plan ([4fb02aa](https://github.com/AntoniadisCorp/deepscrape/commit/4fb02aa))
* Merge branch 'main' into next ([0267206](https://github.com/AntoniadisCorp/deepscrape/commit/0267206))
* Merge branch 'next' of https://github.com/antoniadisCorp/deepscrape into next ([f390839](https://github.com/AntoniadisCorp/deepscrape/commit/f390839))
* Merge pull request #38 from AntoniadisCorp/chore/release-assets-next ([a906e35](https://github.com/AntoniadisCorp/deepscrape/commit/a906e35)), closes [#38](https://github.com/AntoniadisCorp/deepscrape/issues/38)
* Merge pull request #40 from AntoniadisCorp/chore/release-assets-main ([ee83dc7](https://github.com/AntoniadisCorp/deepscrape/commit/ee83dc7)), closes [#40](https://github.com/AntoniadisCorp/deepscrape/issues/40)
* Merge pull request #42 from AntoniadisCorp/copilot/sub-pr-41 ([77b8d9e](https://github.com/AntoniadisCorp/deepscrape/commit/77b8d9e)), closes [#42](https://github.com/AntoniadisCorp/deepscrape/issues/42)
* Merge pull request #43 from AntoniadisCorp/copilot/sub-pr-41 ([545a443](https://github.com/AntoniadisCorp/deepscrape/commit/545a443)), closes [#43](https://github.com/AntoniadisCorp/deepscrape/issues/43)
* Potential fix for pull request finding ([0cec9df](https://github.com/AntoniadisCorp/deepscrape/commit/0cec9df))

# [0.4.0-beta.13](https://github.com/AntoniadisCorp/deepscrape/compare/v0.4.0-beta.12...v0.4.0-beta.13) (2026-03-14)

### Features

* feat(codebase): harden functions env and admin credential loading ([327d4ab](https://github.com/AntoniadisCorp/deepscrape/commit/327d4ab))

### CI

* ci(release): overhaul release workflow and expand copilot instructions ([8f81ab4](https://github.com/AntoniadisCorp/deepscrape/commit/8f81ab4))

### Chore

* chore: update changelog and package version [skip ci] ([6fa4954](https://github.com/AntoniadisCorp/deepscrape/commit/6fa4954))
* chore(changelog): remove outdated entries for version 0.4.0-beta.12 section ([4e8b80e](https://github.com/AntoniadisCorp/deepscrape/commit/4e8b80e))

# [0.4.0-beta.12](https://github.com/AntoniadisCorp/deepscrape/compare/v0.4.0-beta.11...v0.4.0-beta.12) (2026-03-13)

### Features

* feat: add typed env config, analytics docs, and rate limiting (#codebase) ([8d6f428](https://github.com/AntoniadisCorp/deepscrape/commit/8d6f428))
* feat(analytics): add real-time online tracking and enhance dashboard metrics ([db55189](https://github.com/AntoniadisCorp/deepscrape/commit/db55189)), closes [#34](https://github.com/AntoniadisCorp/deepscrape/issues/34)
* feat(auth): add phone verification flows and csrf protection (#codebase) ([5957cd3](https://github.com/AntoniadisCorp/deepscrape/commit/5957cd3))
* feat(billing): introduce full billing system with Stripe checkout, credit packs, and usage reporting ([3329734](https://github.com/AntoniadisCorp/deepscrape/commit/3329734))
* feat(codebase): add admin analytics migration workspace and metric upgrades ([36ba6c7](https://github.com/AntoniadisCorp/deepscrape/commit/36ba6c7))
* feat(codebase): harden migration workflows, analytics, and security plumbing ([585ca36](https://github.com/AntoniadisCorp/deepscrape/commit/585ca36))
* feat(codebase): update workflows, versioning, and JSON parsing ([f23941f](https://github.com/AntoniadisCorp/deepscrape/commit/f23941f))
* feat(prompts): add role plan agent prompt for ReBAC implementation ([4d2f12c](https://github.com/AntoniadisCorp/deepscrape/commit/4d2f12c))

### Bug Fixes

* fix: update Node.js runtime to 22 and clean up environment variable files ([dd43bb3](https://github.com/AntoniadisCorp/deepscrape/commit/dd43bb3))
* fix: update phoneNumber type to allow null values in Users interface ([efb8820](https://github.com/AntoniadisCorp/deepscrape/commit/efb8820))
* fix(firestore): add index for migration_runs collection with status and startedAt fields ([f44738d](https://github.com/AntoniadisCorp/deepscrape/commit/f44738d))
* fix(security): add Pixabay CDN to content security policy ([75243b9](https://github.com/AntoniadisCorp/deepscrape/commit/75243b9))

### Refactor

* refactor(codebase): migrate templates to angular control flow ([f4f82c8](https://github.com/AntoniadisCorp/deepscrape/commit/f4f82c8))

### Chore

* chore: update dependencies and add trustedDependencies section ([f40bb6c](https://github.com/AntoniadisCorp/deepscrape/commit/f40bb6c))
* chore(release): 0.4.0-beta.12 [skip ci] ([f97b385](https://github.com/AntoniadisCorp/deepscrape/commit/f97b385))
* chore(release): 0.4.0-beta.12 [skip ci] ([b7bdcae](https://github.com/AntoniadisCorp/deepscrape/commit/b7bdcae))

# [0.4.0-beta.11](https://github.com/AntoniadisCorp/deepscrape/compare/v0.4.0-beta.10...v0.4.0-beta.11) (2025-11-29)

### Features

* feat(auth): add robust user and admin management features ([f5fc987](https://github.com/AntoniadisCorp/deepscrape/commit/f5fc987))
* feat(auth): implement internationalization and refactor user features ([ef959ed](https://github.com/AntoniadisCorp/deepscrape/commit/ef959ed))
* feat(firestore): update csp and add firestore indexes ([8d5cc42](https://github.com/AntoniadisCorp/deepscrape/commit/8d5cc42))

# [0.4.0-beta.10](https://github.com/AntoniadisCorp/deepscrape/compare/v0.4.0-beta.9...v0.4.0-beta.10) (2025-11-27)

### Bug Fixes

* fix(security): add csrf protection, update dependencies, and correct csp domain ([166e251](https://github.com/AntoniadisCorp/deepscrape/commit/166e251))

# [0.4.0-beta.9](https://github.com/AntoniadisCorp/deepscrape/compare/v0.4.0-beta.8...v0.4.0-beta.9) (2025-11-26)

### Features

* feat(auth): add device fingerprint hash to login metrics ([620421b](https://github.com/AntoniadisCorp/deepscrape/commit/620421b))

### Chore

* Merge branch 'next' of https://github.com/antoniadisCorp/deepscrape into next ([7834a03](https://github.com/AntoniadisCorp/deepscrape/commit/7834a03))

# [0.4.0-beta.8](https://github.com/AntoniadisCorp/deepscrape/compare/v0.4.0-beta.7...v0.4.0-beta.8) (2025-11-26)

### Features

* feat(analytics): hash guest fingerprints for privacy ([0fdd119](https://github.com/AntoniadisCorp/deepscrape/commit/0fdd119))
* feat(platform): update security, analytics, and UI components ([be3878e](https://github.com/AntoniadisCorp/deepscrape/commit/be3878e))

# [0.4.0-beta.7](https://github.com/AntoniadisCorp/deepscrape/compare/v0.4.0-beta.6...v0.4.0-beta.7) (2025-11-23)

### Features

* feat(i18n): implement i18n, custom image loader, logger service ([29c4e94](https://github.com/AntoniadisCorp/deepscrape/commit/29c4e94))
* feat(signup): redesign signup component with enhanced UI and animations ([5579151](https://github.com/AntoniadisCorp/deepscrape/commit/5579151))

### Chore

* chore(i18n): introduce ngx-translate for internationalization support ([fe93c51](https://github.com/AntoniadisCorp/deepscrape/commit/fe93c51))

# [0.4.0-beta.6](https://github.com/AntoniadisCorp/deepscrape/compare/v0.4.0-beta.5...v0.4.0-beta.6) (2025-11-19)


### Features

* **footer:** implement dynamic theme colors and enhance icon styling ([5486533](https://github.com/AntoniadisCorp/deepscrape/commit/54865333251ed497c0be7d156c7881e0f3c89f0f))

# [0.4.0-beta.5](https://github.com/AntoniadisCorp/deepscrape/compare/v0.4.0-beta.4...v0.4.0-beta.5) (2025-11-19)


### Bug Fixes

* update background color in browser component and bump version to 0.4.0-beta.4 ([cde6646](https://github.com/AntoniadisCorp/deepscrape/commit/cde664652aa8bc206c7501d1a47a8ea5f810bba4))

# [0.4.0-beta.4](https://github.com/AntoniadisCorp/deepscrape/compare/v0.4.0-beta.3...v0.4.0-beta.4) (2025-11-19)


### Features

* refactor API, landing page, and rate limiting ([3cb5e48](https://github.com/AntoniadisCorp/deepscrape/commit/3cb5e48713916ec13ebf65aaa441287be2bfaa1f))

# [0.4.0-beta.3](https://github.com/AntoniadisCorp/deepscrape/compare/v0.4.0-beta.2...v0.4.0-beta.3) (2025-11-17)

### Bug Fixes
* **tooltip:** pass mouse event to onMouseEnter handler ([e29fe35](https://github.com/AntoniadisCorp/deepscrape/commit/e29fe3519e9b8d7e8be582f21d233c960b94cd88))

# [0.4.0-beta.2](https://github.com/AntoniadisCorp/deepscrape/compare/v0.4.0-beta.1...v0.4.0-beta.2) (2025-11-17)

### Bug Fixes

* **pr:** implement domain seeding, error logging, and client hydration ([f172ff9](https://github.com/AntoniadisCorp/deepscrape/commit/f172ff95aca27c073edd6e958e56479f0cc029e6))


# [0.3.0-beta.3](https://github.com/AntoniadisCorp/deepscrape/compare/v0.3.0-beta.2...v0.3.0-beta.3) (2025-11-17)

### Features

* **login:** make trackLoginAttempt method asynchronous for improved browser detection ([0be516d](https://github.com/AntoniadisCorp/deepscrape/commit/0be516dcdabb542a36686eb403486c2bb8179dcf))

# [0.3.0-beta.2](https://github.com/AntoniadisCorp/deepscrape/compare/v0.3.0-beta.1...v0.3.0-beta.2) (2025-11-17)

### Bug Fixes

* **angular:** add bootstrapcontext parameter to bootstrap function, to fix bootstrapcontext error ([ba12dfb](https://github.com/AntoniadisCorp/deepscrape/commit/ba12dfbf088750b8283ac740950c504f64a989c4))
* **api:** update endpoint paths for task management in crawl api service and seeding service ([6822d46](https://github.com/AntoniadisCorp/deepscrape/commit/6822d46b22815b89ad5b82218bd49b69cf04b8cd))
* **components:** fix dropdown functionality and improve snackbar visibility ([c57b0fc](https://github.com/AntoniadisCorp/deepscrape/commit/c57b0fc6c93381f9a970b3c485a4b84196262197))
* **config:** enable postcss-import plugin and comment out v4 tailwindcss import ([42c597c](https://github.com/AntoniadisCorp/deepscrape/commit/42c597cc3e9d54a25403ef3e71ad406ef739dcee))
* refactor Firebase configuration to use environment variables and improve secret management ([f60979c](https://github.com/AntoniadisCorp/deepscrape/commit/f60979c772181a5d3aa6b5a2da749134167492a5))
* update Angular SSR version and add loading bar dependencies ([c1d891a](https://github.com/AntoniadisCorp/deepscrape/commit/c1d891ae5d45a356b3815aa5ee42057825e406be))
* **deps:** update semantic-release and related packages to latest versions ([c45642b](https://github.com/AntoniadisCorp/deepscrape/commit/c45642b47caeaced9d3ead154be72fbd04c107f6))
* **machines:** enhance machineId validation and error handling ([1ce1bfd](https://github.com/AntoniadisCorp/deepscrape/commit/1ce1bfd2ca0a8874c098bfde41fd47639bfd5695))
* **package-lock:** fix version from v0.2.0-beta.2 to 0.2.0 ([3f351e9](https://github.com/AntoniadisCorp/deepscrape/commit/3f351e954152c7c2a808e676815a4d52f2085a8f))
* refactor Firebase configuration to use environment variables and improve secret management ([f60979c](https://github.com/AntoniadisCorp/deepscrape/commit/f60979c772181a5d3aa6b5a2da749134167492a5))
* **ui:** improve snackbar, buttons, scrollbar, and mixins ([4f563a1](https://github.com/AntoniadisCorp/deepscrape/commit/4f563a1b0d48ac8e0149d2fdd7140f5c1425e82f))
* update Angular SSR version and add loading bar dependencies ([c1d891a](https://github.com/AntoniadisCorp/deepscrape/commit/c1d891ae5d45a356b3815aa5ee42057825e406be))
* **workflow:** add npm cache directory setup and caching step ([77c066f](https://github.com/AntoniadisCorp/deepscrape/commit/77c066f7b997a9997a636855f5eb32315df2a88a))
* **workflow:** update dependency installation step to include npm install ([d8dc578](https://github.com/AntoniadisCorp/deepscrape/commit/d8dc5781e0042b683a1eeaa9ed82ba9b4e8cfb23))


### Features

* **components:** integrate websocket for task status updates and enhance operations management ([f1dda1f](https://github.com/AntoniadisCorp/deepscrape/commit/f1dda1ff6847cf613c745d636ffca9943c27a9dc))
* **crawlpack:** improve service pack and ui components for improved profile and config management ([ad3b126](https://github.com/AntoniadisCorp/deepscrape/commit/ad3b1265267a3d1fc4d2727388495c1a5285bb6e))
* **neko:** integrate Neko browser and WebRTC communication ([67105b9](https://github.com/AntoniadisCorp/deepscrape/commit/67105b957f78c5dab61ccebf1528ebe1903dcfc9))
* **seeder:** add seeder results component with new animations and loggerservice ([4300e76](https://github.com/AntoniadisCorp/deepscrape/commit/4300e768c3062d0a7c39fbf66a15c85556fb665c))
* **ui:** enhance tooltip component with animations and improved styling ([a85fa4f](https://github.com/AntoniadisCorp/deepscrape/commit/a85fa4fdee7c12feb6ef42af5a9f10cc1cee8e43))
* **account:** enhance security settings, user experience, user analytics, and icons ([f3709d0](https://github.com/AntoniadisCorp/deepscrape/commit/f3709d0af52c6bee97eb2af52527fb1faa635acc))
* **account:** implement user settings page with multiple tabs ([84c1731](https://github.com/AntoniadisCorp/deepscrape/commit/84c173181f7d9a559de93582d36ae9ca0b9b0c44))
* **account:** improve login session deduplication and device tracking ([9fe62c3](https://github.com/AntoniadisCorp/deepscrape/commit/9fe62c31f45d1299d45dbc856ba0ef9d47420b76))
* **api:** implement AuthAPIProxy and SyncAI API Proxy ([7143ee8](https://github.com/AntoniadisCorp/deepscrape/commit/7143ee8319b1d538d15adb78b99bee26d783d657))

# [0.3.0-beta.1](https://github.com/AntoniadisCorp/deepscrape/compare/v0.2.0...v0.3.0-beta.1) (2025-09-11)


### Bug Fixes

* **deps:** update semantic-release and related packages to latest versions ([c45642b](https://github.com/AntoniadisCorp/deepscrape/commit/c45642b47caeaced9d3ead154be72fbd04c107f6))
* **machines:** enhance machineId validation and error handling ([1ce1bfd](https://github.com/AntoniadisCorp/deepscrape/commit/1ce1bfd2ca0a8874c098bfde41fd47639bfd5695))
* **package-lock:** fix version from v0.2.0-beta.2 to 0.2.0 ([3f351e9](https://github.com/AntoniadisCorp/deepscrape/commit/3f351e954152c7c2a808e676815a4d52f2085a8f))
* **ui:** improve snackbar, buttons, scrollbar, and mixins ([4f563a1](https://github.com/AntoniadisCorp/deepscrape/commit/4f563a1b0d48ac8e0149d2fdd7140f5c1425e82f))
* **workflow:** add npm cache directory setup and caching step ([77c066f](https://github.com/AntoniadisCorp/deepscrape/commit/77c066f7b997a9997a636855f5eb32315df2a88a))
* **workflow:** update dependency installation step to include npm install ([d8dc578](https://github.com/AntoniadisCorp/deepscrape/commit/d8dc5781e0042b683a1eeaa9ed82ba9b4e8cfb23))


### Features

* **account:** enhance security settings, user experience, user analytics, and icons ([f3709d0](https://github.com/AntoniadisCorp/deepscrape/commit/f3709d0af52c6bee97eb2af52527fb1faa635acc))
* **account:** implement user settings page with multiple tabs ([84c1731](https://github.com/AntoniadisCorp/deepscrape/commit/84c173181f7d9a559de93582d36ae9ca0b9b0c44))
* **account:** improve login session deduplication and device tracking ([9fe62c3](https://github.com/AntoniadisCorp/deepscrape/commit/9fe62c31f45d1299d45dbc856ba0ef9d47420b76))
* **api:** implement AuthAPIProxy and SyncAI API Proxy ([7143ee8](https://github.com/AntoniadisCorp/deepscrape/commit/7143ee8319b1d538d15adb78b99bee26d783d657))


# [0.2.0-beta.1](https://github.com/AntoniadisCorp/deepscrape/compare/v0.1.2...v0.2.0-beta.1) (2025-08-18)


### Bug Fixes

* **changelog:** merge commit '00b15661f49433f12c93205bfeb661fb43b2f21c' ([7970f6c](https://github.com/AntoniadisCorp/deepscrape/commit/7970f6c6b7820f1fe73db912945c9c8411f459f6))
* **changelog:** remove version 1.0.1 details and reset for new release cycle ([eac8979](https://github.com/AntoniadisCorp/deepscrape/commit/eac897916383f880b825a186a95c488206c428f3))
* **changelog:** reset CHANGELOG.md for new release cycle ([b5414dd](https://github.com/AntoniadisCorp/deepscrape/commit/b5414ddb5dc9cb23d8a040fc647e4b04f8345317))
* **landpage:** update CORS settings, adjust image sizes, and refine layout positioning ([ca7d737](https://github.com/AntoniadisCorp/deepscrape/commit/ca7d737d51990b5fcc87ee4ce07a42f17595d681))
* **release:** add 'next' branch to push triggers and ensure fetch-tags is enabled ([671fb30](https://github.com/AntoniadisCorp/deepscrape/commit/671fb30d2fe118a5751ae9939edcf094a187836c))
* **release:** remove package-lock.json from assets and ensure GitHub release settings are configured ([bf1e4a7](https://github.com/AntoniadisCorp/deepscrape/commit/bf1e4a7eab06a19d0e09e163722009dee0681562))
* **server:** add rate limiting middleware to all routes ([e8f892d](https://github.com/AntoniadisCorp/deepscrape/commit/e8f892d5b57c35524b74e604cbb822914af75539))


### Features

* **authentication:** implement user signup and verification process with email and phone number ([3df1563](https://github.com/AntoniadisCorp/deepscrape/commit/3df1563e9f7de5211c6615cd896ea3fa6a3d100c))
* **payments:** enhance stripe customer and subscription management ([cb7ea6b](https://github.com/AntoniadisCorp/deepscrape/commit/cb7ea6b19441cdc7fdc87bbe06c6cb8046620250))




# [0.2.0](https://github.com/AntoniadisCorp/deepscrape/compare/v0.1.2...v0.2.0) (2025-08-18)


### Bug Fixes

* **changelog:** merge commit '00b15661f49433f12c93205bfeb661fb43b2f21c' ([7970f6c](https://github.com/AntoniadisCorp/deepscrape/commit/7970f6c6b7820f1fe73db912945c9c8411f459f6))
* **changelog:** remove version 1.0.1 details and reset for new release cycle ([eac8979](https://github.com/AntoniadisCorp/deepscrape/commit/eac897916383f880b825a186a95c488206c428f3))
* **changelog:** reset CHANGELOG.md for new release cycle ([b5414dd](https://github.com/AntoniadisCorp/deepscrape/commit/b5414ddb5dc9cb23d8a040fc647e4b04f8345317))
* **landpage:** update CORS settings, adjust image sizes, and refine layout positioning ([ca7d737](https://github.com/AntoniadisCorp/deepscrape/commit/ca7d737d51990b5fcc87ee4ce07a42f17595d681))
* **release:** add 'next' branch to push triggers and ensure fetch-tags is enabled ([671fb30](https://github.com/AntoniadisCorp/deepscrape/commit/671fb30d2fe118a5751ae9939edcf094a187836c))
* **release:** remove package-lock.json from assets and ensure GitHub release settings are configured ([bf1e4a7](https://github.com/AntoniadisCorp/deepscrape/commit/bf1e4a7eab06a19d0e09e163722009dee0681562))
* **server:** add rate limiting middleware to all routes ([e8f892d](https://github.com/AntoniadisCorp/deepscrape/commit/e8f892d5b57c35524b74e604cbb822914af75539))


### Features

* **authentication:** implement user signup and verification process with email and phone number ([3df1563](https://github.com/AntoniadisCorp/deepscrape/commit/3df1563e9f7de5211c6615cd896ea3fa6a3d100c))
* **payments:** enhance stripe customer and subscription management ([cb7ea6b](https://github.com/AntoniadisCorp/deepscrape/commit/cb7ea6b19441cdc7fdc87bbe06c6cb8046620250))

# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.


### Bug Fixes

* **changelog:** merge commit '00b15661f49433f12c93205bfeb661fb43b2f21c' ([7970f6c](https://github.com/antoniadisCorp/deepscrape/commit/7970f6c6b7820f1fe73db912945c9c8411f459f6))
* **changelog:** remove version 1.0.1 details and reset for new release cycle ([eac8979](https://github.com/antoniadisCorp/deepscrape/commit/eac897916383f880b825a186a95c488206c428f3))
* **changelog:** reset CHANGELOG.md for new release cycle ([b5414dd](https://github.com/antoniadisCorp/deepscrape/commit/b5414ddb5dc9cb23d8a040fc647e4b04f8345317))
* **landpage:** update CORS settings, adjust image sizes, and refine layout positioning ([ca7d737](https://github.com/antoniadisCorp/deepscrape/commit/ca7d737d51990b5fcc87ee4ce07a42f17595d681))
* **release:** add 'next' branch to push triggers and ensure fetch-tags is enabled ([671fb30](https://github.com/antoniadisCorp/deepscrape/commit/671fb30d2fe118a5751ae9939edcf094a187836c))
* **release:** remove package-lock.json from assets and ensure GitHub release settings are configured ([bf1e4a7](https://github.com/antoniadisCorp/deepscrape/commit/bf1e4a7eab06a19d0e09e163722009dee0681562))
* **server:** add rate limiting middleware to all routes ([e8f892d](https://github.com/antoniadisCorp/deepscrape/commit/e8f892d5b57c35524b74e604cbb822914af75539))


### Features

* **authentication:** implement user signup and verification process with email and phone number ([3df1563](https://github.com/antoniadisCorp/deepscrape/commit/3df1563e9f7de5211c6615cd896ea3fa6a3d100c))
* **payments:** enhance stripe customer and subscription management ([cb7ea6b](https://github.com/antoniadisCorp/deepscrape/commit/cb7ea6b19441cdc7fdc87bbe06c6cb8046620250))

# Changelog

### 0.1.2 (2025-08-07)


### Features

* **actions:** add environment variables to firebase hosting pull request workflow and prod environment ([e860bfc](https://github.com/antoniadisCorp/deepscrape/commit/e860bfcb09a42e3d533e0aef72e174c9af4e8a28))
* **actions:** enhance environment configuration and deployment process ([186f0e8](https://github.com/antoniadisCorp/deepscrape/commit/186f0e8b8f313bb45615711684cca2568e294c3e))
* **actions:** improve firebase hosting pull request workflow ([e1da19a](https://github.com/antoniadisCorp/deepscrape/commit/e1da19aff46725c59c1989dece66fc6f8086e57a))
* **integration:** add firestore login and signup add jina api and llms extraction groq openai anthropic included 12 models ([9c05b09](https://github.com/antoniadisCorp/deepscrape/commit/9c05b0933114c19d3a0295b983d347b8afe65ced))
* **deployment:** add markdown styles, deployment variables, and new services; update modal and component styles ([dbb8c56](https://github.com/antoniadisCorp/deepscrape/commit/dbb8c566743a03075d5473014a0bdd21789e753a))
* **angularconfig:** increase maximum error size limit and add staging build configuration ([6b5ff9a](https://github.com/antoniadisCorp/deepscrape/commit/6b5ff9afcc077a775332dc8c7e7682cd885a8167))
* **api:** integrate AI service APIs and enhance server functionality ([509c8bf](https://github.com/antoniadisCorp/deepscrape/commit/509c8bf81c211ac07ac1c10e168af8b1ea854f8c))
* **assets:** remove unused logo SVGs, add page logo ([09b805f](https://github.com/antoniadisCorp/deepscrape/commit/09b805f6f6eb5682772b4bec38645519fac5d188))
* **ci-cd:** improve firebase deployment and code ownership ([d6fdb2a](https://github.com/antoniadisCorp/deepscrape/commit/d6fdb2ad01c73cff53a5c926601e3f9555a85342))
* **ci-cd:** Integrate Google Generative AI and update dependencies ([4de4644](https://github.com/antoniadisCorp/deepscrape/commit/4de4644102b0a654c0240a444e63c81a88342936))
* **ci:** add API keys as environment variables to Firebase PR workflow ([8d5d7aa](https://github.com/antoniadisCorp/deepscrape/commit/8d5d7aa17332f779e81afeeda1185fc9f4fde9ab))
* **ci:** add Node.js 20 setup to Firebase hosting workflow ([e0cb2e8](https://github.com/antoniadisCorp/deepscrape/commit/e0cb2e8e0c04ee40a0d6ead3d29b47fb50672075))
* **ci:** add Node.js 20 setup to Firebase hosting workflow ([c062401](https://github.com/antoniadisCorp/deepscrape/commit/c06240158757a9eda772ed60eb45f252556a60d3))
* **ci:** configure Firebase PR workflow with additional environment variables ([8afc9ed](https://github.com/antoniadisCorp/deepscrape/commit/8afc9edde3c0f7aa1d1f799a485aead903f921ed))
* **ci:** enhance Firebase Hosting PR workflow with debugging and base href ([8851f38](https://github.com/antoniadisCorp/deepscrape/commit/8851f38a4e17f04dabcce70b22bcfeeb5ac44e78))
* **ci:** install Angular CLI globally and update build command in Firebase workflow ([7b621e2](https://github.com/antoniadisCorp/deepscrape/commit/7b621e2fc487a5c5b375afbc902a6daa8b4a8fa3))
* **crawlpack:** enhance cart management, authentication, and configuration ([305888b](https://github.com/antoniadisCorp/deepscrape/commit/305888b1a3da9f0ce087c936e184387003991ac9))
* **crawlpack:** Enhance Crawl Configuration and Results Management ([a42ae48](https://github.com/antoniadisCorp/deepscrape/commit/a42ae4832b974f5cbd544fd7e0fca68e3c048b9f))
* **crawlpack:** enhance crawl pack functionality and UI ([58f0e75](https://github.com/antoniadisCorp/deepscrape/commit/58f0e7544f2c8df49b37b071ff6ff7bb0d1aa8bc))
* **crawlpack:** refine UI, enhance machine creation, and improve data handling ([eb0b8ae](https://github.com/antoniadisCorp/deepscrape/commit/eb0b8ae010b9d82a023b33fa8199735fdf1efcd7))
* **billing:** create billing plans, stripe integration, create payment intents customer on user creation startSubscription, usage, create api key secrets, retrieve api key paging, create visibility interaction for user to view the secret api key, add asidebar menu for small mobile tablet devices, create compoments: checkbox, slideinmodal, clipboard, update consent modal, api key component, tooltip, radiotoggle button, snackbar is now global, promtarea component, playground passes, route and more ([e89578e](https://github.com/antoniadisCorp/deepscrape/commit/e89578ec5214121af6be690fb796e14f48ca7ddb))
* **deps:** add ts-node as a dev dependency ([64d444a](https://github.com/antoniadisCorp/deepscrape/commit/64d444a81fc065713c1be6187d82b79fe5d91155))
* **docker:** enhance Docker image validation and UI/UX ([65b9b34](https://github.com/antoniadisCorp/deepscrape/commit/65b9b34b1c3e6786fb56371eb42db73cd872d900))
* **environment:** generate environment.ts from .env file ([f62fbab](https://github.com/antoniadisCorp/deepscrape/commit/f62fbabb1123db98fc374e42a5074f1982a41c39))
* **environment:** introduce staging environment and refactor production environment configuration ([8a1cd5b](https://github.com/antoniadisCorp/deepscrape/commit/8a1cd5b2781d68c80038c0377684e93e6f50c3dc))
* **environment:** use environment variable for Stripe public key in production ([59dff37](https://github.com/antoniadisCorp/deepscrape/commit/59dff37a38225700409ca67e72a2c1361294134f))
* **env:** simplify environment variable loading and update dependencies ([f38978e](https://github.com/antoniadisCorp/deepscrape/commit/f38978e5be8ca57a4ef590293cec579e5c5fee3d))
* **crawlpack:** Implement Crawl Pack and related components ([16fc627](https://github.com/antoniadisCorp/deepscrape/commit/16fc6275d44cdd9884b488f802976d6c52c1e99e))
* **landpage:** enhance UI with hero section, features, and dialog components ([1868331](https://github.com/antoniadisCorp/deepscrape/commit/1868331029969cddf33da44062986836aef3ecae))
* **machines:** enhance Docker image deployment and validation ([f98faf6](https://github.com/antoniadisCorp/deepscrape/commit/f98faf618a8032f136fa05be0f7c391951d1cc5a))
* **machines:** enhance machine management UI and functionality ([5ec93df](https://github.com/antoniadisCorp/deepscrape/commit/5ec93df69fedf21dd82cf11fa23abf6ee2e4d3c0))
* **playground:** Implement real-time crawl task status and cancellation ([6d9843a](https://github.com/antoniadisCorp/deepscrape/commit/6d9843a71d219c4513b60f69f5d6bff2699219f7))
* **rate-limiting:** implement Redis-backed rate limiting for API and server ([346da11](https://github.com/antoniadisCorp/deepscrape/commit/346da11185ed5b7df65ae89d5aa5207f77033059))
* **ssr:** enable server-side rendering and update environment configuration ([64b8dab](https://github.com/antoniadisCorp/deepscrape/commit/64b8daba6aa5e49c0c00f9077e5466c0cd1e18b5))
* **ssr:** enhance server-side rendering with Elysia and Angular SSR ([dc83381](https://github.com/antoniadisCorp/deepscrape/commit/dc833815e4cea7a2172d7e3942c5e45b1569b9c5))
* **ssr:** integrate Elysia.js for server-side rendering and improve caching ([a0cfbca](https://github.com/antoniadisCorp/deepscrape/commit/a0cfbca1599fc32ac5d311984a5128db8a2a6f6f))
* **ssr:** remove fileReplacements for prod environment ([b80725a](https://github.com/antoniadisCorp/deepscrape/commit/b80725a6152fd713d69e77d7f9a152ee5ca9618b))
* **ssr:** remove SSR-related configurations and update environment import ([1c3bde4](https://github.com/antoniadisCorp/deepscrape/commit/1c3bde45bc5927eec0f8c9babe5e680cf623f201))
* **ui:** enhance theme toggle, API key management, and app loading ([af8923a](https://github.com/antoniadisCorp/deepscrape/commit/af8923a39865e85e196894d0355227ced94d99b8))
* **ui:** Implement machine creation and Docker deployment UI ([a5c84d0](https://github.com/antoniadisCorp/deepscrape/commit/a5c84d0a147a98b9d82f814d45c39261a62c88a3))


### Bug Fixes

* **angular:** disable prod environment replacement and service worker ([b0a1493](https://github.com/antoniadisCorp/deepscrape/commit/b0a1493caa978f22e55b3488b1a981eb46ce6b73))
* backoff and revert important changes from stash on 18 march 2:00 AM - stash id: #b0c29f1 ([88c99cb](https://github.com/antoniadisCorp/deepscrape/commit/88c99cb946d34b15ee77f31bdf36c14369990215)), closes [#b0c29f1](https://github.com/antoniadisCorp/deepscrape/issues/b0c29f1)
* **build:** optimize staging build and enable SSR ([2124ac7](https://github.com/antoniadisCorp/deepscrape/commit/2124ac79f6f9e905648df96aec6f45f4ad75f9d5))
* **ci-cd:** ensure build runs prbuild before build in firebase-hosting-merge.yml ([c43a1ac](https://github.com/antoniadisCorp/deepscrape/commit/c43a1ac248f2333334fdd0c4609bffe36fa446ce))
* **ci,build:** streamline staging build process for PR deployments ([b844a8d](https://github.com/antoniadisCorp/deepscrape/commit/b844a8d9d503061464327f27a969ee036cdf5e34))
* **ci:** comment out angular build step in firebase workflow ([c0cd8bf](https://github.com/antoniadisCorp/deepscrape/commit/c0cd8bf7dd40eaa17bbe63ede2a9c11d183e0242))
* **ci:** correct environment for Firebase deploy and prod build ([091922e](https://github.com/antoniadisCorp/deepscrape/commit/091922efb72b2887a28881df60d92f92a6a18a69))
* **ci:** ensure production build before Firebase Hosting deploy ([8fb5850](https://github.com/antoniadisCorp/deepscrape/commit/8fb585090d44b24f346ddadc6df45f99df7d297a))
* **ci:** re-enable angular build and firebase deploy with functions entrypoint ([3e6829c](https://github.com/antoniadisCorp/deepscrape/commit/3e6829c85aeddfec8cec11983b49d65bee63f632))
* **ci:** re-enable angular build step in firebase workflow ([e51c13d](https://github.com/antoniadisCorp/deepscrape/commit/e51c13df8cf0a08b4b26bae4ce2002aa43e4cdf4))
* **ci:** remove base href for firebase hosting build ([99cd1a6](https://github.com/antoniadisCorp/deepscrape/commit/99cd1a64b89a46942755505817965bb560735bb2))
* **env:** correct typo in recaptcha key name in prod.ts ([f690d6d](https://github.com/antoniadisCorp/deepscrape/commit/f690d6d519a5019980b3df8336567385372317d4))
* **environment:** hardcode recaptcha key for production ([dbf39cd](https://github.com/antoniadisCorp/deepscrape/commit/dbf39cde1101dc499fada91ad7f6a66562cc601c))
* **environment:** set Crawl4AI API key from environment variable in production ([8ce3dc0](https://github.com/antoniadisCorp/deepscrape/commit/8ce3dc05a4229298e26c402c2dd1ce45e769994c))
* **environment:** use environment variables for API keys in production ([2fb8682](https://github.com/antoniadisCorp/deepscrape/commit/2fb8682dab6480b6402aca050bd917ad792a81d5))
* **functions:** handle undefined environment variables for Redis configuration ([e68f29e](https://github.com/antoniadisCorp/deepscrape/commit/e68f29e68f8c2d5c27e955ed82a6851b0cdc2ae8))
* **git:** correct tab swipe logic, update firebase deploy branch, add prod env ([c2e3a3e](https://github.com/antoniadisCorp/deepscrape/commit/c2e3a3edcf21fdd39ec21b9ff0a4c80242905253))
* **github-actions:** correct entry point for firebase deploy ([15ca53d](https://github.com/antoniadisCorp/deepscrape/commit/15ca53da90c2e4eebb36a6074045146a156a7e59))
* **package-lock:** implement extension update functionality ([0293084](https://github.com/antoniadisCorp/deepscrape/commit/029308441802a16e84a7e6445d706f95e1b9dc1c))
* **package-lock:** update package-lock.json to reflect version and dependency changes ([d906913](https://github.com/antoniadisCorp/deepscrape/commit/d906913a42554520ada6bfd43229499a53eaab96))
* README ([fbe4fbc](https://github.com/antoniadisCorp/deepscrape/commit/fbe4fbc499420fdd3684da5171352b60a2e2331b))
* **scripts:** use npm instead of bun for build in serve and deploy scripts ([5354096](https://github.com/antoniadisCorp/deepscrape/commit/5354096b945f52dfad897bb34bd6eef379e725e3))
* **scss:** modernize SCSS imports and adjust theme colors ([4ad2ea7](https://github.com/antoniadisCorp/deepscrape/commit/4ad2ea789123b6ff2e2c5b98ba73f5db95e211a8))
* **service-worker:** configure service worker for better caching and navigation ([0d0c882](https://github.com/antoniadisCorp/deepscrape/commit/0d0c882389ea864e7f01cea294963d85d59059e8))
* **ssr:** enable prerendering ([6595ada](https://github.com/antoniadisCorp/deepscrape/commit/6595ada0d220846fca175201c8c7a116d6b2ad91))
* **ssr:** enable server output mode for prerendering ([5eadf0a](https://github.com/antoniadisCorp/deepscrape/commit/5eadf0a2d40240738de6abccf6abfae065654185))
* **ssr:** enhance server-side rendering and API security ([72d3048](https://github.com/antoniadisCorp/deepscrape/commit/72d304806defa460ea857c34fbd9705187ea9840))
* **ssr:** integrate Arachnefly for machine deployment for production mode ([23b0f60](https://github.com/antoniadisCorp/deepscrape/commit/23b0f608fb14609f65e825cf1a332848532385cf))
* **ssr:** revert fileReplacements for prod environment ([a16dd02](https://github.com/antoniadisCorp/deepscrape/commit/a16dd021aff4f6faec17a2392de1c96a3fb5a0ae))
* **swipe-tabs:** correct tab swipe logic in tabs.component.ts ([c81ac73](https://github.com/antoniadisCorp/deepscrape/commit/c81ac731065267945ca6263edbffe9d93a02f03e))
* **tests:** Refactor and enhance core components and services ([9006f7e](https://github.com/antoniadisCorp/deepscrape/commit/9006f7e1dc1eefa6f5bac9cc0c2b746e4fe21f40))
* **tsconfig:** enable node types and update package version ([2e7fb5e](https://github.com/antoniadisCorp/deepscrape/commit/2e7fb5e366e71b6ab75e574688a2e66ba2889a29))
* **ui:** fix playground UI, improve code highlighting, and refine authentication guards ([e31e685](https://github.com/antoniadisCorp/deepscrape/commit/e31e6859beb67e7cee9c5cb79643545121cccefc))
* Update API_CRAWL4AI URL to crawlagent.fly.dev ([4492714](https://github.com/antoniadisCorp/deepscrape/commit/4492714a0761cf5ada0735c0fcf2b52c97f3c8ef))

## 0.1.1 (2025-08-07)

### Features

*   **angular:** re-enable prod environment replacement and service worker, add elysia ([5cda873](https://github.com/antoniadisCorp/deepscrape/commit/5cda873))
*   **api:** implement server-side API endpoints with Firebase JWT authentication ([7a11ec2](https://github.com/antoniadisCorp/deepscrape/commit/7a11ec2))
*   **firestore:** enhance Firestore service and functions for data management ([8ac1480](https://github.com/antoniadisCorp/deepscrape/commit/8ac1480))
*   **playground:** crawl results display and add crawl pack selection ([f27ba0b](https://github.com/antoniadisCorp/deepscrape/commit/f27ba0b))
*   **styles:** enhance UI theming and component styling ([bc9f372](https://github.com/antoniadisCorp/deepscrape/commit/bc9f372))


### Fix

*   Update API_CRAWL4AI URL to crawlagent.fly.dev ([4492714](https://github.com/antoniadisCorp/deepscrape/commit/4492714))
*   **readme:** README ([fbe4fbc](https://github.com/antoniadisCorp/deepscrape/commit/fbe4fbc))
*   backoff and revert important changes from stash on 18 march 2:00 AM - stash id: #b0c29f1 ([88c99cb](https://github.com/antoniadisCorp/deepscrape/commit/88c99cb)), closes [#b0c29f1](https://github.com/antoniadisCorp/deepscrape/issues/b0c29f1)
*   **angular:** disable prod environment replacement and service worker ([b0a1493](https://github.com/antoniadisCorp/deepscrape/commit/b0a1493))
*   **build:** optimize staging build and enable SSR ([2124ac7](https://github.com/antoniadisCorp/deepscrape/commit/2124ac7))
*   **ci-cd:** ensure build runs prbuild before build in firebase-hosting-merge.yml ([c43a1ac](https://github.com/antoniadisCorp/deepscrape/commit/c43a1ac))
*   **ci:** comment out angular build step in firebase workflow ([c0cd8bf](https://github.com/antoniadisCorp/deepscrape/commit/c0cd8bf))
*   **ci:** correct environment for Firebase deploy and prod build ([091922e](https://github.com/antoniadisCorp/deepscrape/commit/091922e))
*   **ci:** ensure production build before Firebase Hosting deploy ([8fb5850](https://github.com/antoniadisCorp/deepscrape/commit/8fb5850))
*   **ci:** re-enable angular build and firebase deploy with functions entrypoint ([3e6829c](https://github.com/antoniadisCorp/deepscrape/commit/3e6829c))
*   **ci:** re-enable angular build step in firebase workflow ([e51c13d](https://github.com/antoniadisCorp/deepscrape/commit/e51c13d))
*   **ci:** remove base href for firebase hosting build ([99cd1a6](https://github.com/antoniadisCorp/deepscrape/commit/99cd1a6))
*   **ci,build:** streamline staging build process for PR deployments ([b844a8d](https://github.com/antoniadisCorp/deepscrape/commit/b844a8d))
*   **env:** correct typo in recaptcha key name in prod.ts ([f690d6d](https://github.com/antoniadisCorp/deepscrape/commit/f690d6d))
*   **environment:** hardcode recaptcha key for production ([dbf39cd](https://github.com/antoniadisCorp/deepscrape/commit/dbf39cd))
*   **environment:** set Crawl4AI API key from environment variable in production ([8ce3dc0](https://github.com/antoniadisCorp/deepscrape/commit/8ce3dc0))
*   **environment:** use environment variables for API keys in production ([2fb8682](https://github.com/antoniadisCorp/deepscrape/commit/2fb8682))
*   **functions:** handle undefined environment variables for Redis configuration ([e68f29e](https://github.com/antoniadisCorp/deepscrape/commit/e68f29e))
*   **git:** correct tab swipe logic, update firebase deploy branch, add prod env ([c2e3a3e](https://github.com/antoniadisCorp/deepscrape/commit/c2e3a3e))
*   **github-actions:** correct entry point for firebase deploy ([15ca53d](https://github.com/antoniadisCorp/deepscrape/commit/15ca53d))
*   **package-lock:** implement extension update functionality ([0293084](https://github.com/antoniadisCorp/deepscrape/commit/0293084))
*   **package-lock:** update package-lock.json to reflect version and dependency changes ([d906913](https://github.com/antoniadisCorp/deepscrape/commit/d906913))
*   **scripts:** use npm instead of bun for build in serve and deploy scripts ([5354096](https://github.com/antoniadisCorp/deepscrape/commit/5354096))
*   **scss:** modernize SCSS imports and adjust theme colors ([4ad2ea7](https://github.com/antoniadisCorp/deepscrape/commit/4ad2ea7))
*   **service-worker:** configure service worker for better caching and navigation ([0d0c882](https://github.com/antoniadisCorp/deepscrape/commit/0d0c882))
*   **ssr:** enable prerendering ([6595ada](https://github.com/antoniadisCorp/deepscrape/commit/6595ada))
*   **ssr:** enable server output mode for prerendering ([5eadf0a](https://github.com/antoniadisCorp/deepscrape/commit/5eadf0a))
*   **ssr:** enhance server-side rendering and API security ([72d3048](https://github.com/antoniadisCorp/deepscrape/commit/72d3048))
*   **ssr:** integrate Arachnefly for machine deployment for production mode ([23b0f60](https://github.com/antoniadisCorp/deepscrape/commit/23b0f60))
*   **ssr:** revert fileReplacements for prod environment ([a16dd02](https://github.com/antoniadisCorp/deepscrape/commit/a16dd02))
*   **swipe-tabs:** correct tab swipe logic in tabs.component.ts ([c81ac73](https://github.com/antoniadisCorp/deepscrape/commit/c81ac73))
*   **tests:** Refactor and enhance core components and services ([9006f7e](https://github.com/antoniadisCorp/deepscrape/commit/9006f7e))
*   **tsconfig:** enable node types and update package version ([2e7fb5e](https://github.com/antoniadisCorp/deepscrape/commit/2e7fb5e))
*   **ui:** fix playground UI, improve code highlighting, and refine authentication guards ([e31e685](https://github.com/antoniadisCorp/deepscrape/commit/e31e685))

### Builds

*   **deps:** bump form-data from 2.5.2 to 2.5.5 in /functions ([196393c](https://github.com/antoniadisCorp/deepscrape/commit/196393c))
*   **deps:** bump vite and @angular-devkit/build-angular ([5d39e83](https://github.com/antoniadisCorp/deepscrape/commit/5d39e83))
*   **ng19:** upgrade to angular 19 and dependencies ([8b42aef](https://github.com/antoniadisCorp/deepscrape/commit/8b42aef))


### Refactor

*   Improve crawl pack configuration and UI components ([bdc9f95](https://github.com/antoniadisCorp/deepscrape/commit/bdc9f95))
*   clean up unused imports and variables, update theme storage key ([5ea3d6e](https://github.com/antoniadisCorp/deepscrape/commit/5ea3d6e))


### Documentation

*   **readme:** update project description, features, and instructions ([035d9aa](https://github.com/antoniadisCorp/deepscrape/commit/035d9aa))

### Chore

*   **api:** implement rate limiting middleware with Redis support ([99156c9](https://github.com/antoniadisCorp/deepscrape/commit/99156c9))
*   **ci:** update Firebase deployment workflows and enhance caching for pull requests ([b7cb58f](https://github.com/antoniadisCorp/deepscrape/commit/b7cb58f))
*   **config:** enhance Firebase configuration and project setup ([2b458fc](https://github.com/antoniadisCorp/deepscrape/commit/2b458fc))
*   **dependencies:** integrate Upstash Redis and Lucide Icons ([0ad755d](https://github.com/antoniadisCorp/deepscrape/commit/0ad755d))

### Initial

*   Initial commit ([e7a4010](https://github.com/antoniadisCorp/deepscrape/commit/e7a4010))
