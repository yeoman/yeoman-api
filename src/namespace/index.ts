// ===================== | == @ ======== scope ======== | ===== unscoped ===== | = : ========== generator ======== | = @ ===== semver ===== @  | = # ========= instanceId ======== | == + ======== method ======= |= flags = |
const NAMESPACE_REGEX =
  /^(?:(@[a-z\d-~][a-z\d-._~]*)\/)?([a-z\d-~][a-z\d-._~]*)(?::((?:[a-z\d-~][a-z\d-._~]*:?)*))?(?:@([a-z\d-.~><+=^* ]*)@?)?(?:#((?:[a-z\d-~][a-z\d-._~]*|\*)))?(?:\+((?:[a-zA-Z\d]\w*\+?)*))?(\?)?$/;

const groups = {
  complete: 0,
  scope: 1,
  unscoped: 2,
  generator: 3,
  semver: 4,
  instanceId: 5,
  method: 6,
  flags: 7,
};
const flags = { optional: '?' };

function parseNamespace(complete: string): YeomanNamespace | undefined {
  if (typeof complete !== 'string') {
    throw new TypeError('Must be a string');
  }

  const result = NAMESPACE_REGEX.exec(complete);
  if (!result) {
    return;
  }

  const parsed = { complete };
  // Populate fields
  for (const [name, value] of Object.entries(groups)) {
    if (result[value]) {
      parsed[name] = result[value];
    }
  }

  return new YeomanNamespace(parsed);
}

export class YeomanNamespace {
  _original: string;
  scope: string;
  unscoped: string;
  generator: string;
  instanceId: string;
  semver: string;
  methods: string[];
  flags: any;
  command: any;

  constructor(parsed) {
    this._original = parsed.complete;
    this.scope = parsed.scope;
    this.unscoped = parsed.unscoped;
    this.generator = parsed.generator;
    this.instanceId = parsed.instanceId;
    this.semver = parsed.semver;
    this.methods = parsed.method ? parsed.method.split('+') : parsed.methods;
    this.flags = parsed.flags;

    // Populate flags
    if (this.flags) {
      for (const [name, value] of Object.entries(flags)) {
        if (this.flags === value) {
          this[name] = true;
        } else {
          // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
          delete this[name];
        }
      }
    }
  }

  get _scopeAddition() {
    return this.scope ? `${this.scope}/` : '';
  }

  get generatorName() {
    return this.generator ? `:${this.generator}` : '';
  }

  get instanceName() {
    return this.instanceId ? `#${this.instanceId}` : '';
  }

  get complete() {
    let methods = '';
    if (this.methods && this.methods.length > 0) {
      methods = '+' + this.methods.join('+');
    }

    const postSemver = `${this.instanceName}${methods}${this.flags || ''}`;
    return `${this.namespace}${this._semverAddition(postSemver)}`;
  }

  get packageNamespace() {
    return `${this._scopeAddition}${this.unscoped}`;
  }

  get namespace() {
    return `${this.packageNamespace}${this.generatorName}`;
  }

  set namespace(namespace) {
    const parsed = parseNamespace(namespace);
    if (!parsed) {
      throw new Error(`Error parsing namespace ${namespace}`);
    }

    this._update(parsed);
  }

  get unscopedNamespace() {
    return `${this.unscoped}${this.generatorName}`;
  }

  get id() {
    return `${this.namespace}${this.instanceName}`;
  }

  get generatorHint() {
    return `${this._scopeAddition}generator-${this.unscoped}`;
  }

  get versionedHint() {
    return this.semver ? `${this.generatorHint}@"${this.semver}"` : this.generatorHint;
  }

  with(newValues) {
    return new YeomanNamespace({
      ...this,
      ...newValues,
    });
  }

  toString() {
    return this.complete;
  }

  private _semverAddition(post?: string) {
    if (!this.semver) {
      return post ?? '';
    }

    if (post) {
      return `@${this.semver}@${post}`;
    }

    return `@${this.semver}`;
  }

  private _update(parsed) {
    this.scope = parsed.scope || this.scope;
    this.unscoped = parsed.unscoped || this.unscoped;
    this.generator = parsed.generator || this.generator;
    this.instanceId = parsed.instanceId || this.instanceId;
    this.command = parsed.command || this.command;
    this.flags = parsed.flags || this.flags;
  }
}

/**
 * Convert a namespace to a namespace object
 */
export function toNamespace(namespace: string | YeomanNamespace): YeomanNamespace | undefined {
  return isNamespaceObject(namespace) ? (namespace as YeomanNamespace) : parseNamespace(namespace as string);
}

/**
 * Convert a package name to a namespace object
 *
 * @throws if not a valid generator package name (starts with 'generator-')
 */
export function namespaceFromPackageName(packageName: string): YeomanNamespace {
  const namespace = parseNamespace(packageName);
  if (!namespace?.unscoped?.startsWith('generator-')) {
    throw new Error(`${packageName} is not a valid generator package name`);
  }

  namespace.unscoped = namespace.unscoped.replace(/^generator-/, '');
  return namespace;
}

/**
 * Convert a namespace to a namespace object
 *
 * @throws if not a valid namespace
 */
export function requireNamespace(namespace: string | YeomanNamespace): YeomanNamespace {
  const parsed = toNamespace(namespace);
  if (!parsed) {
    throw new Error(`Error parsing namespace ${namespace}`);
  }

  return parsed;
}

/**
 * Test if the object is an YeomanNamespace instance.
 */
export function isNamespaceObject(namespace: unknown): boolean {
  return namespace?.constructor?.name === 'YeomanNamespace';
}
