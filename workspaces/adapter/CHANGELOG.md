# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [4.0.1](https://github.com/yeoman/yeoman-api/compare/@yeoman/adapter@4.0.0...@yeoman/adapter@4.0.1) (2025-11-19)

### Bug Fixes

- **adapter:** fix TestAdapter with inquirer 13 migration ([#177](https://github.com/yeoman/yeoman-api/issues/177)) ([a08f230](https://github.com/yeoman/yeoman-api/commit/a08f230b62488493ba2fcd08f5423e7f2fd0988f))

## [4.0.0](https://github.com/yeoman/yeoman-api/compare/@yeoman/adapter@3.1.1...@yeoman/adapter@4.0.0) (2025-11-19)

### Features

- **adapter:** add inquirer 13 migration ([#173](https://github.com/yeoman/yeoman-api/issues/173)) ([a03709c](https://github.com/yeoman/yeoman-api/commit/a03709cc0b97c4a3b43c2ceff6c148c0456970b9))
- export inquirer types ([#174](https://github.com/yeoman/yeoman-api/issues/174)) ([7019621](https://github.com/yeoman/yeoman-api/commit/701962135d8dd0ad031f7421ff36e9cc848d212a))

## [3.1.1](https://github.com/yeoman/yeoman-api/compare/@yeoman/adapter@3.1.0...@yeoman/adapter@3.1.1) (2025-11-16)

**Note:** Version bump only for package @yeoman/adapter

## [3.1.0](https://github.com/yeoman/yeoman-api/compare/@yeoman/adapter@3.0.0...@yeoman/adapter@3.1.0) (2025-09-24)

### Features

- **adapter:** replace close with abort api ([#143](https://github.com/yeoman/yeoman-api/issues/143)) ([80928a9](https://github.com/yeoman/yeoman-api/commit/80928a96a6d61a4cccb504cc8061c7b92629d193))

## [3.0.0](https://github.com/yeoman/yeoman-api/compare/@yeoman/adapter@2.1.1...@yeoman/adapter@3.0.0) (2025-09-23)

### ⚠ BREAKING CHANGES

- **adapter:** require Node.js 20 (#140)

### Features

- **adapter:** abort the adapter on prompt failure ([#141](https://github.com/yeoman/yeoman-api/issues/141)) ([e5364a2](https://github.com/yeoman/yeoman-api/commit/e5364a2150f14e2368fcde05ff3c55e2a0cb3f82))
- **adapter:** expose signal and pass it to p-queue ([#139](https://github.com/yeoman/yeoman-api/issues/139)) ([9d75499](https://github.com/yeoman/yeoman-api/commit/9d75499b4d43702b496b543100e539128098c24e))
- **adapter:** require Node.js 20 ([#140](https://github.com/yeoman/yeoman-api/issues/140)) ([77b847b](https://github.com/yeoman/yeoman-api/commit/77b847bd7a46c8772ed5a2fb31fa3ece23f3cdda))

## <small>2.1.1 (2025-04-15)</small>

- feat(adapter): add calls history support (#97) ([b7f4b67](https://github.com/yeoman/yeoman-api/commit/b7f4b67)), closes [#97](https://github.com/yeoman/yeoman-api/issues/97)

## 2.1.0 (2025-04-15)

- feat(adapter): add addAnswers support (#96) ([126aa83](https://github.com/yeoman/yeoman-api/commit/126aa83)), closes [#96](https://github.com/yeoman/yeoman-api/issues/96)
- feat(adapter): add separator to adapter (#90) ([ecd7931](https://github.com/yeoman/yeoman-api/commit/ecd7931)), closes [#90](https://github.com/yeoman/yeoman-api/issues/90)
- chore: drop package-lock added by editor ([0963f8f](https://github.com/yeoman/yeoman-api/commit/0963f8f))
- chore: fix readme links (#55) ([1cfbd7f](https://github.com/yeoman/yeoman-api/commit/1cfbd7f)), closes [#55](https://github.com/yeoman/yeoman-api/issues/55)

## 2.0.0 (2024-10-11)

- chore(adapter): update dependencies (#53) ([53e4518](https://github.com/yeoman/yeoman-api/commit/53e4518)), closes [#53](https://github.com/yeoman/yeoman-api/issues/53)

## 2.0.0-beta.1 (2024-10-02)

- feat(adapter): reimplement TestAdapter to use @inquirer/core api (#49) ([bb3c0a4](https://github.com/yeoman/yeoman-api/commit/bb3c0a4)), closes [#49](https://github.com/yeoman/yeoman-api/issues/49)

## 2.0.0-beta.0 (2024-09-30)

- fix(adapter): adjust engines according to inquirer dependency. ([d77b655](https://github.com/yeoman/yeoman-api/commit/d77b655))
- fix(adapter): fix queue types (#41) ([055f138](https://github.com/yeoman/yeoman-api/commit/055f138)), closes [#41](https://github.com/yeoman/yeoman-api/issues/41)
- fix(adapter): test adjust (#44) ([f1601ba](https://github.com/yeoman/yeoman-api/commit/f1601ba)), closes [#44](https://github.com/yeoman/yeoman-api/issues/44)
- fix(eslint): adjusts to eslint config ([1eab921](https://github.com/yeoman/yeoman-api/commit/1eab921))
- drop xo ([a92f48f](https://github.com/yeoman/yeoman-api/commit/a92f48f))
- feat(adapter)!: bump inquirer to v11.1.0 (#40) ([a417795](https://github.com/yeoman/yeoman-api/commit/a417795)), closes [#40](https://github.com/yeoman/yeoman-api/issues/40)
- update eslint to v9 ([ad86730](https://github.com/yeoman/yeoman-api/commit/ad86730))
- update prettier to v3 (#31) ([ac80763](https://github.com/yeoman/yeoman-api/commit/ac80763)), closes [#31](https://github.com/yeoman/yeoman-api/issues/31)
- chore: bump versions ([7c9c243](https://github.com/yeoman/yeoman-api/commit/7c9c243))
- chore: bump versions ([e0b4188](https://github.com/yeoman/yeoman-api/commit/e0b4188))
- chore: eslint adjusts (#33) ([c1740ae](https://github.com/yeoman/yeoman-api/commit/c1740ae)), closes [#33](https://github.com/yeoman/yeoman-api/issues/33)
- chore(deps): bump log-symbols from 5.1.0 to 7.0.0 (#16) ([d1b7d2d](https://github.com/yeoman/yeoman-api/commit/d1b7d2d)), closes [#16](https://github.com/yeoman/yeoman-api/issues/16)
- chore(deps): bump ora from 6.3.1 to 8.1.0 (#14) ([bdeeb6c](https://github.com/yeoman/yeoman-api/commit/bdeeb6c)), closes [#14](https://github.com/yeoman/yeoman-api/issues/14)
- chore(deps): bump p-queue from 7.3.4 to 8.0.1 (#20) ([7ed260c](https://github.com/yeoman/yeoman-api/commit/7ed260c)), closes [#20](https://github.com/yeoman/yeoman-api/issues/20)
- feat: move adapter base types to @yeoman/adapter ([19b9379](https://github.com/yeoman/yeoman-api/commit/19b9379))
- feat(eslint): add unicorn plugin ([a9d851b](https://github.com/yeoman/yeoman-api/commit/a9d851b))

## 1.6.0 (2024-08-28)

- feat: move adapter base types to @yeoman/adapter ([b05a357](https://github.com/yeoman/yeoman-api/commit/b05a357))
- feat(eslint): add unicorn plugin ([a9d851b](https://github.com/yeoman/yeoman-api/commit/a9d851b))
- fix(adapter): adjust engines according to inquirer dependency. ([d77b655](https://github.com/yeoman/yeoman-api/commit/d77b655))
- chore: bump versions ([e0b4188](https://github.com/yeoman/yeoman-api/commit/e0b4188))
- chore(deps): bump log-symbols from 5.1.0 to 7.0.0 (#16) ([d1b7d2d](https://github.com/yeoman/yeoman-api/commit/d1b7d2d)), closes [#16](https://github.com/yeoman/yeoman-api/issues/16)
- chore(deps): bump ora from 6.3.1 to 8.1.0 (#14) ([bdeeb6c](https://github.com/yeoman/yeoman-api/commit/bdeeb6c)), closes [#14](https://github.com/yeoman/yeoman-api/issues/14)
- chore(deps): bump p-queue from 7.3.4 to 8.0.1 (#20) ([7ed260c](https://github.com/yeoman/yeoman-api/commit/7ed260c)), closes [#20](https://github.com/yeoman/yeoman-api/issues/20)
- drop xo ([a92f48f](https://github.com/yeoman/yeoman-api/commit/a92f48f))

## [1.4.0](https://github.com/yeoman/yeoman-api/compare/@yeoman/adapter@1.2.0...@yeoman/adapter@1.4.0) (2023-10-11)

### Features

- **adapter:** update @yeoman/types for progress api. ([b6085f9](https://github.com/yeoman/yeoman-api/commit/b6085f90cf9a43c12e0e1f659d91c999e8d15f50))

## [1.2.0](https://github.com/yeoman/yeoman-api/compare/@yeoman/adapter@1.1.0...@yeoman/adapter@1.2.0) (2023-06-14)

### Features

- replace npmlog with ora. ([9b36f99](https://github.com/yeoman/yeoman-api/commit/9b36f997d5760aa070756fba4653fed35c0fad80))

## [1.1.0](https://github.com/yeoman/yeoman-api/compare/@yeoman/adapter@1.0.5...@yeoman/adapter@1.1.0) (2023-06-07)

### Features

- **adapter:** add defineTestAdapterConfig ([469ff22](https://github.com/yeoman/yeoman-api/commit/469ff2268f9cf942c2880dc53c099c59a419bbcf))
- **adapter:** add TestAdapter ([2d63361](https://github.com/yeoman/yeoman-api/commit/2d63361e2b8dbb612edaeac3b63b8f5a142ca83a))

### Bug Fixes

- **adapter:** log should have greater priority than blocking ([1b341af](https://github.com/yeoman/yeoman-api/commit/1b341af3f641610d1255206315c48d5263a0009b))

## [1.0.5](https://github.com/yeoman/yeoman-api/compare/@yeoman/adapter@1.0.4...@yeoman/adapter@1.0.5) (2023-05-29)

### Bug Fixes

- **adapter:** adjusts to progress ([1113a96](https://github.com/yeoman/yeoman-api/commit/1113a9635be908c30ca85e810443a68d6fd1eb95))

## [1.0.4](https://github.com/yeoman/yeoman-api/compare/@yeoman/adapter@1.0.3...@yeoman/adapter@1.0.4) (2023-05-26)

### Bug Fixes

- **adapter:** extract AdapterWithProgress type ([863aee0](https://github.com/yeoman/yeoman-api/commit/863aee04b2df9b8a72226e2c2af7fbdbb5b5f1ef))

## [1.0.3](https://github.com/yeoman/yeoman-api/compare/@yeoman/adapter@1.0.2...@yeoman/adapter@1.0.3) (2023-05-26)

### Bug Fixes

- **adapter:** allow custom log. ([668994f](https://github.com/yeoman/yeoman-api/commit/668994f3d029d9492f1545724b80260d1098bd05))
- **adapter:** expose console at log and export Logger type ([636707f](https://github.com/yeoman/yeoman-api/commit/636707f2fc881a62793307e6b656ef20ba6ee584))

## [1.0.2](https://github.com/yeoman/yeoman-api/compare/@yeoman/adapter@1.0.1...@yeoman/adapter@1.0.2) (2023-05-24)

### Bug Fixes

- **adapter:** generate a new adapter with lower priority ([d9db547](https://github.com/yeoman/yeoman-api/commit/d9db547657dc8f6e502b2d9af42e1f882475e75d))
- **types:** fix log's types and export LoggerOptions ([9423b0b](https://github.com/yeoman/yeoman-api/commit/9423b0bfa6b4854d73c0719bdf49e38c0bc31433))

## [1.0.1](https://github.com/yeoman/yeoman-api/compare/@yeoman/adapter@1.0.0...@yeoman/adapter@1.0.1) (2023-05-19)

### Bug Fixes

- **adapter:** move @yeoman/types to peerDependencies ([a7dd146](https://github.com/yeoman/yeoman-api/commit/a7dd146c61aae9fa56aabcb42d3ac17f9ca35040))

## [1.0.0](https://github.com/yeoman/yeoman-api/compare/@yeoman/adapter@0.3.0...@yeoman/adapter@1.0.0) (2023-05-19)

**Note:** Version bump only for package @yeoman/adapter

## [0.3.0](https://github.com/yeoman/yeoman-api/compare/@yeoman/adapter@0.2.0...@yeoman/adapter@0.3.0) (2023-05-18)

**Note:** Version bump only for package @yeoman/adapter

## [0.2.0](https://github.com/yeoman/yeoman-api/compare/@yeoman/adapter@0.1.4...@yeoman/adapter@0.2.0) (2023-05-17)

### Features

- **adapter:** pass adapter through options. ([bde63df](https://github.com/yeoman/yeoman-api/commit/bde63df0b9d3d45c8cc34534175d839486cfd091))

## [0.1.4](https://github.com/yeoman/yeoman-api/compare/@yeoman/adapter@0.1.3...@yeoman/adapter@0.1.4) (2023-05-16)

**Note:** Version bump only for package @yeoman/adapter

## [0.1.3](https://github.com/yeoman/yeoman-api/compare/@yeoman/adapter@0.1.2...@yeoman/adapter@0.1.3) (2023-05-11)

**Note:** Version bump only for package @yeoman/adapter

## [0.1.2](https://github.com/yeoman/yeoman-api/compare/@yeoman/adapter@0.1.1...@yeoman/adapter@0.1.2) (2023-05-11)

### Bug Fixes

- **adapter:** provide a default TerminalAdapter at QueueAdapter ([498ce27](https://github.com/yeoman/yeoman-api/commit/498ce273e392cb81462a99108ad45b2aa73e5e43))

## [0.1.1](https://github.com/yeoman/yeoman-api/compare/@yeoman/adapter@0.1.0...@yeoman/adapter@0.1.1) (2023-05-10)

### Bug Fixes

- **adapter:** convert colored from anonymous to function ([4bf9a0c](https://github.com/yeoman/yeoman-api/commit/4bf9a0c2bf8d8a58ca14d2071d4244ff7d33d1c6))
- **adapter:** fix log proxy return ([41cddde](https://github.com/yeoman/yeoman-api/commit/41cdddea69ea85a5ddfd48f5d92551074bbc316c))
- **adapter:** promptModule should me optional ([f7633db](https://github.com/yeoman/yeoman-api/commit/f7633dbabd81b8855c25c6153f7c5a0859bfaad0))

## 0.1.0 (2023-05-10)

### Features

- implement adapter ([8322b54](https://github.com/yeoman/yeoman-api/commit/8322b54e30425073543d754d419039fc71bd9fb4))

## 0.0.1 (2023-05-07)

**Note:** Version bump only for package @yeoman/namespace
