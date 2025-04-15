# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## 2.4.0 (2025-04-15)

- feat(adapter): add separator to customizeActions callback ([6d7f837](https://github.com/yeoman/yeoman-api/commit/6d7f837))
- feat(conflicter): add customizeActions option (#95) ([58503a0](https://github.com/yeoman/yeoman-api/commit/58503a0)), closes [#95](https://github.com/yeoman/yeoman-api/issues/95)
- chore(deps-dev): bump @types/diff from 6.0.0 to 7.0.0 (#61) ([3b68f0f](https://github.com/yeoman/yeoman-api/commit/3b68f0f)), closes [#61](https://github.com/yeoman/yeoman-api/issues/61)

## <small>2.3.2 (2024-11-21)</small>

- fix: adjust diff behavior change (#59) ([723f5f3](https://github.com/yeoman/yeoman-api/commit/723f5f3)), closes [#59](https://github.com/yeoman/yeoman-api/issues/59)
- chore(deps-dev): bump @types/diff from 5.2.3 to 6.0.0 (#58) ([5d3b46e](https://github.com/yeoman/yeoman-api/commit/5d3b46e)), closes [#58](https://github.com/yeoman/yeoman-api/issues/58)

## <small>2.3.1 (2024-10-14)</small>

- chore: drop package-lock added by editor ([0963f8f](https://github.com/yeoman/yeoman-api/commit/0963f8f))
- chore: fix package-lock.json ([931fcba](https://github.com/yeoman/yeoman-api/commit/931fcba))
- chore: fix readme links (#55) ([1cfbd7f](https://github.com/yeoman/yeoman-api/commit/1cfbd7f)), closes [#55](https://github.com/yeoman/yeoman-api/issues/55)
- chore(conflicter): update dependencies and accept p-transform (#57) ([c52bd23](https://github.com/yeoman/yeoman-api/commit/c52bd23)), closes [#57](https://github.com/yeoman/yeoman-api/issues/57)

## 2.3.0 (2024-10-02)

- feat(conflicter): allow diff in .yo-resolve files (#50) ([baf4465](https://github.com/yeoman/yeoman-api/commit/baf4465)), closes [#50](https://github.com/yeoman/yeoman-api/issues/50)
- chore(conflicter): convert tests to async/await ([cf5bc4e](https://github.com/yeoman/yeoman-api/commit/cf5bc4e))

## <small>2.2.1 (2024-10-01)</small>

- fix(conflicter): correctly show file conflict options ([7d8d754](https://github.com/yeoman/yeoman-api/commit/7d8d754))

## 2.2.0 (2024-09-30)

- chore: bump versions ([e0b4188](https://github.com/yeoman/yeoman-api/commit/e0b4188))
- chore: eslint adjusts (#33) ([c1740ae](https://github.com/yeoman/yeoman-api/commit/c1740ae)), closes [#33](https://github.com/yeoman/yeoman-api/issues/33)
- chore(deps): bump diff from 5.1.0 to 7.0.0 (#36) ([c373e26](https://github.com/yeoman/yeoman-api/commit/c373e26)), closes [#36](https://github.com/yeoman/yeoman-api/issues/36)
- chore(deps): bump textextensions from 5.16.0 to 6.11.0 (#13) ([0f5bc3e](https://github.com/yeoman/yeoman-api/commit/0f5bc3e)), closes [#13](https://github.com/yeoman/yeoman-api/issues/13)
- fix: move @types/node to peerDependencies (#45) ([52fcde7](https://github.com/yeoman/yeoman-api/commit/52fcde7)), closes [#45](https://github.com/yeoman/yeoman-api/issues/45)
- fix(conflicter): add message to error (#43) ([51e4a2f](https://github.com/yeoman/yeoman-api/commit/51e4a2f)), closes [#43](https://github.com/yeoman/yeoman-api/issues/43)
- fix(conflicter): ghost dependency on slash package (#8) ([8c7ba32](https://github.com/yeoman/yeoman-api/commit/8c7ba32)), closes [#8](https://github.com/yeoman/yeoman-api/issues/8)
- drop xo ([a92f48f](https://github.com/yeoman/yeoman-api/commit/a92f48f))
- feat(adapter)!: bump inquirer to v11.1.0 (#40) ([a417795](https://github.com/yeoman/yeoman-api/commit/a417795)), closes [#40](https://github.com/yeoman/yeoman-api/issues/40)
- update eslint to v9 ([ad86730](https://github.com/yeoman/yeoman-api/commit/ad86730))
- update prettier to v3 (#31) ([ac80763](https://github.com/yeoman/yeoman-api/commit/ac80763)), closes [#31](https://github.com/yeoman/yeoman-api/issues/31)
- feat(eslint): add unicorn plugin ([a9d851b](https://github.com/yeoman/yeoman-api/commit/a9d851b))

## [2.0.0](https://github.com/yeoman/yeoman-api/compare/@yeoman/conflicter@2.0.0-alpha.2...@yeoman/conflicter@2.0.0) (2023-10-27)

### Features

- **conflicter:** improve diff output ([aedf3a6](https://github.com/yeoman/yeoman-api/commit/aedf3a6177b1c0eec365bad6ccb3501253d50f61))

## [2.0.0-alpha.2](https://github.com/yeoman/yeoman-api/compare/@yeoman/conflicter@2.0.0-alpha.1...@yeoman/conflicter@2.0.0-alpha.2) (2023-10-16)

### Bug Fixes

- **conflicter:** filter files at transforms ([be768f7](https://github.com/yeoman/yeoman-api/commit/be768f7dcd72db58ed4c3c3532386d27a19b8ae3))

## [2.0.0-alpha.1](https://github.com/yeoman/yeoman-api/compare/@yeoman/conflicter@2.0.0-alpha.0...@yeoman/conflicter@2.0.0-alpha.1) (2023-10-12)

### Bug Fixes

- **conflicter:** adjust createConflicterTransform type ([83012fb](https://github.com/yeoman/yeoman-api/commit/83012fb595752c55cc2ba9107264f27060825c07))

## [2.0.0-alpha.0](https://github.com/yeoman/yeoman-api/compare/@yeoman/conflicter@1.1.0...@yeoman/conflicter@2.0.0-alpha.0) (2023-10-11)

### ⚠ BREAKING CHANGES

- **conflicter:** update dependencies and bump node version

### Features

- **conflicter:** emit .yo-resolve file instead of editing ([202bbde](https://github.com/yeoman/yeoman-api/commit/202bbde4b392084d349443dd9d4d3ab2972c9810))
- **conflicter:** update dependencies and bump node version ([bebd6d4](https://github.com/yeoman/yeoman-api/commit/bebd6d4746471dcb4781b26c43e72f7ca43fe40a))

## [1.1.0](https://github.com/yeoman/yeoman-api/compare/@yeoman/conflicter@1.0.12...@yeoman/conflicter@1.1.0) (2023-10-11)

### Features

- **conflicter:** move mem-fs to peer dependencies. ([ca73310](https://github.com/yeoman/yeoman-api/commit/ca733105ee8fa96d2ac3b5e711f33232416ad690))

## [1.0.12](https://github.com/yeoman/yeoman-api/compare/@yeoman/conflicter@1.0.11...@yeoman/conflicter@1.0.12) (2023-10-11)

**Note:** Version bump only for package @yeoman/conflicter

## [1.0.11](https://github.com/yeoman/yeoman-api/compare/@yeoman/conflicter@1.0.10...@yeoman/conflicter@1.0.11) (2023-10-11)

**Note:** Version bump only for package @yeoman/conflicter

## [1.0.10](https://github.com/yeoman/yeoman-api/compare/@yeoman/conflicter@1.0.9...@yeoman/conflicter@1.0.10) (2023-09-14)

### Bug Fixes

- **conflicter:** adjust diff message. ([82a9e67](https://github.com/yeoman/yeoman-api/commit/82a9e6756f35294825f2fde9e289e5aedbd3bade))

## [1.0.9](https://github.com/yeoman/yeoman-api/compare/@yeoman/conflicter@1.0.8...@yeoman/conflicter@1.0.9) (2023-09-14)

### Bug Fixes

- parse file diff on file mode changes ([0cbf162](https://github.com/yeoman/yeoman-api/commit/0cbf1623eeea8a4c2cf62c51760df72776480039))

## [1.0.8](https://github.com/yeoman/yeoman-api/compare/@yeoman/conflicter@1.0.7...@yeoman/conflicter@1.0.8) (2023-06-14)

**Note:** Version bump only for package @yeoman/conflicter

## [1.0.7](https://github.com/yeoman/yeoman-api/compare/@yeoman/conflicter@1.0.6...@yeoman/conflicter@1.0.7) (2023-06-07)

**Note:** Version bump only for package @yeoman/conflicter

## [1.0.6](https://github.com/yeoman/yeoman-api/compare/@yeoman/conflicter@1.0.5...@yeoman/conflicter@1.0.6) (2023-05-30)

**Note:** Version bump only for package @yeoman/conflicter

## [1.0.5](https://github.com/yeoman/yeoman-api/compare/@yeoman/conflicter@1.0.4...@yeoman/conflicter@1.0.5) (2023-05-29)

**Note:** Version bump only for package @yeoman/conflicter

## [1.0.4](https://github.com/yeoman/yeoman-api/compare/@yeoman/conflicter@1.0.3...@yeoman/conflicter@1.0.4) (2023-05-26)

**Note:** Version bump only for package @yeoman/conflicter

## [1.0.3](https://github.com/yeoman/yeoman-api/compare/@yeoman/conflicter@1.0.2...@yeoman/conflicter@1.0.3) (2023-05-26)

**Note:** Version bump only for package @yeoman/conflicter

## [1.0.2](https://github.com/yeoman/yeoman-api/compare/@yeoman/conflicter@1.0.1...@yeoman/conflicter@1.0.2) (2023-05-24)

**Note:** Version bump only for package @yeoman/conflicter

## [1.0.1](https://github.com/yeoman/yeoman-api/compare/@yeoman/conflicter@1.0.0...@yeoman/conflicter@1.0.1) (2023-05-19)

### Bug Fixes

- **conflicter:** move @yeoman/types to peerDependencies ([af11666](https://github.com/yeoman/yeoman-api/commit/af1166619329124674ae2c5fa2c09de3551c7b46))

## [1.0.0](https://github.com/yeoman/yeoman-api/compare/@yeoman/conflicter@0.6.1...@yeoman/conflicter@1.0.0) (2023-05-19)

**Note:** Version bump only for package @yeoman/conflicter

## [0.6.1](https://github.com/yeoman/yeoman-api/compare/@yeoman/conflicter@0.6.0...@yeoman/conflicter@0.6.1) (2023-05-19)

**Note:** Version bump only for package @yeoman/conflicter

## [0.6.0](https://github.com/yeoman/yeoman-api/compare/@yeoman/conflicter@0.5.0...@yeoman/conflicter@0.6.0) (2023-05-18)

**Note:** Version bump only for package @yeoman/conflicter

## [0.5.0](https://github.com/yeoman/yeoman-api/compare/@yeoman/conflicter@0.4.1...@yeoman/conflicter@0.5.0) (2023-05-17)

### Features

- **adapter:** pass adapter through options. ([bde63df](https://github.com/yeoman/yeoman-api/commit/bde63df0b9d3d45c8cc34534175d839486cfd091))

### Bug Fixes

- **conflicter:** convert methods to private ([c72868f](https://github.com/yeoman/yeoman-api/commit/c72868f6a174899be7c6b7c3eccaf87e4542e638))

## [0.4.1](https://github.com/yeoman/yeoman-api/compare/@yeoman/conflicter@0.4.0...@yeoman/conflicter@0.4.1) (2023-05-16)

### Features

- **conflicter:** refactor conflicter logic ([716d891](https://github.com/yeoman/yeoman-api/commit/716d8913a7fe16bdc46a1db2236f8d35ad727668))

## [0.4.0](https://github.com/yeoman/yeoman-api/compare/@yeoman/conflicter@0.3.5...@yeoman/conflicter@0.4.0) (2023-05-16)

### Features

- bump namespace and transform to 1.0.0-beta.0. ([adf653d](https://github.com/yeoman/yeoman-api/commit/adf653d7b8a794c93565d66301ed0bd1c1556bc8))
- **conflicter:** add transforms ([4468110](https://github.com/yeoman/yeoman-api/commit/4468110e27d2eb0e937974d04273f67d641dad53))

## [0.3.5](https://github.com/yeoman/yeoman-api/compare/@yeoman/conflicter@0.3.4...@yeoman/conflicter@0.3.5) (2023-05-16)

### Bug Fixes

- **conflicter:** drop console.log leftover ([bc57496](https://github.com/yeoman/yeoman-api/commit/bc57496471265c7493a9450a4c3f05db59dda3fe))

## [0.3.4](https://github.com/yeoman/yeoman-api/compare/@yeoman/conflicter@0.3.3...@yeoman/conflicter@0.3.4) (2023-05-11)

**Note:** Version bump only for package @yeoman/conflicter

## [0.3.3](https://github.com/yeoman/yeoman-api/compare/@yeoman/conflicter@0.3.2...@yeoman/conflicter@0.3.3) (2023-05-11)

**Note:** Version bump only for package @yeoman/conflicter

## [0.3.2](https://github.com/yeoman/yeoman-api/compare/@yeoman/conflicter@0.3.1...@yeoman/conflicter@0.3.2) (2023-05-11)

**Note:** Version bump only for package @yeoman/conflicter

## [0.3.1](https://github.com/yeoman/yeoman-api/compare/@yeoman/conflicter@0.3.0...@yeoman/conflicter@0.3.1) (2023-05-11)

### Bug Fixes

- **conflicter:** export yo-resolve ([60460bf](https://github.com/yeoman/yeoman-api/commit/60460bfde97ab6549cc9ca0701f40df49427148e))

## [0.3.0](https://github.com/yeoman/yeoman-api/compare/@yeoman/conflicter@0.2.0...@yeoman/conflicter@0.3.0) (2023-05-11)

### Features

- **conflicter:** add yo-resolve ([7fc8a06](https://github.com/yeoman/yeoman-api/commit/7fc8a063f0a66303a374c35770ab346f9182943c))

### Bug Fixes

- **conflicter:** fix minimatch pattern at windows ([84b673f](https://github.com/yeoman/yeoman-api/commit/84b673f533035039970be92e0027f682e05c639b))
- **conflicter:** use transform instead of passthrough ([6559573](https://github.com/yeoman/yeoman-api/commit/65595733fba521be24c9b2ecde6d4057fe65f046))

## [0.2.0](https://github.com/yeoman/yeoman-api/compare/@yeoman/conflicter@0.1.1...@yeoman/conflicter@0.2.0) (2023-05-10)

### ⚠ BREAKING CHANGES

- **conflicter:** implement createTransform

### Features

- **conflicter:** implement createTransform ([ac36f16](https://github.com/yeoman/yeoman-api/commit/ac36f163534c06a27f6805cd068d35a3f21d0ebb))
- **conflicter:** implement setConflicterStatus ([f43e4ae](https://github.com/yeoman/yeoman-api/commit/f43e4ae5b3a543f884d016521e7e3dfca83128da))

## [0.1.1](https://github.com/yeoman/yeoman-api/compare/@yeoman/conflicter@0.1.0...@yeoman/conflicter@0.1.1) (2023-05-10)

### Bug Fixes

- add index.ts to conflicter ([2dab56a](https://github.com/yeoman/yeoman-api/commit/2dab56a9d724efa4386911c3d1577064838c0c12))

## 0.1.0 (2023-05-10)

### Features

- implement conflicter ([d69760b](https://github.com/yeoman/yeoman-api/commit/d69760b31c0ae94ec4a68ef58e6b630ae0134799))
