This projects uses [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/).

Releasing:

```sh
GH_TOKEN=foo npx lerna publish
```

Publishing a single package:

```sh
npx lerna publish --ignore-changes '**' --force-publish @yeoman/types
```
