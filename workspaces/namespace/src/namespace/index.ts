const NAME_REGEX = /^[a-z\d-~][a-z\d-._~]*$/;
const SEMVER_REGEX = /^[a-z\d-. *+<=>^~]*$/;
const METHOD_REGEX = /^[\dA-Za-z]\w*$/;
const TOKEN_SCOPE_SEPARATOR = '/';
const TOKEN_GENERATOR = ':';
const TOKEN_SEMVER = '@';
const TOKEN_INSTANCE_ID = '#';
const TOKEN_METHOD = '+';
const TOKEN_OPTIONAL = '?';
const UNESCOPED_STOP_TOKENS = [TOKEN_GENERATOR, TOKEN_SEMVER, TOKEN_INSTANCE_ID, TOKEN_METHOD, TOKEN_OPTIONAL];
const GENERATOR_STOP_TOKENS = [TOKEN_SEMVER, TOKEN_INSTANCE_ID, TOKEN_METHOD, TOKEN_OPTIONAL];
const INSTANCE_ID_STOP_TOKENS = [TOKEN_METHOD, TOKEN_OPTIONAL];
const flags = { optional: '?' };

export const ENTRYPOINT_GENERATOR_NAME = 'app';

function nextTokenIndex(value: string, start: number, tokens: string[]): number {
  let end = value.length;

  for (const token of tokens) {
    const index = value.indexOf(token, start);
    if (index !== -1 && index < end) {
      end = index;
    }
  }

  return end;
}

function isName(value: string): boolean {
  return NAME_REGEX.test(value);
}

function isGenerator(value: string): boolean {
  return value.length > 0 && value.split(':').every(value => isName(value));
}

function isSemver(value: string): boolean {
  return SEMVER_REGEX.test(value);
}

function isMethodList(value: string): boolean {
  if (value === '') {
    return true;
  }

  const methods = value.split('+');
  for (let index = 0; index < methods.length; index += 1) {
    const method = methods[index];

    // Keep compatibility with trailing '+' (e.g. 'build+') from previous parser behavior.
    if (method === '' && index === methods.length - 1) {
      return true;
    }

    if (!METHOD_REGEX.test(method)) {
      return false;
    }
  }

  return true;
}

function parseNamespace<GeneratorPropertyType extends string | undefined = undefined | string>(
  complete: string,
): YeomanNamespace<GeneratorPropertyType> | undefined {
  if (typeof complete !== 'string') {
    throw new TypeError('Must be a string');
  }

  let cursor = 0;
  const parsed: ParsedNamespace = { complete, unscoped: '' };

  if (complete.startsWith('@')) {
    const scopeEnd = complete.indexOf(TOKEN_SCOPE_SEPARATOR);
    if (scopeEnd === -1) {
      return;
    }

    const scope = complete.slice(0, scopeEnd);
    if (!isName(scope.slice(1))) {
      return;
    }

    parsed.scope = scope;
    cursor = scopeEnd + 1;
  }

  const unscopedEnd = nextTokenIndex(complete, cursor, UNESCOPED_STOP_TOKENS);
  const unscoped = complete.slice(cursor, unscopedEnd);
  if (!isName(unscoped)) {
    return;
  }

  parsed.unscoped = unscoped;
  cursor = unscopedEnd;

  if (complete.charAt(cursor) === TOKEN_GENERATOR) {
    cursor += 1;
    const generatorEnd = nextTokenIndex(complete, cursor, GENERATOR_STOP_TOKENS);
    const generator = complete.slice(cursor, generatorEnd);
    if (!isGenerator(generator)) {
      return;
    }

    parsed.generator = generator;
    cursor = generatorEnd;
  }

  if (complete.charAt(cursor) === TOKEN_SEMVER) {
    cursor += 1;

    const hashAt = complete.indexOf(TOKEN_INSTANCE_ID, cursor);
    const flagAt = complete.indexOf(TOKEN_OPTIONAL, cursor);
    let tokenEnd = complete.length;
    if (hashAt !== -1 && hashAt < tokenEnd) {
      tokenEnd = hashAt;
    }

    if (flagAt !== -1 && flagAt < tokenEnd) {
      tokenEnd = flagAt;
    }

    let semverEnd = tokenEnd;
    let nextCursor = tokenEnd;
    const closingAt = complete.indexOf(TOKEN_SEMVER, cursor);
    if (closingAt !== -1 && closingAt <= tokenEnd) {
      semverEnd = closingAt;
      nextCursor = closingAt + 1;
    }

    const semver = complete.slice(cursor, semverEnd);
    if (!isSemver(semver)) {
      return;
    }

    parsed.semver = semver;
    cursor = nextCursor;
  }

  if (complete.charAt(cursor) === TOKEN_INSTANCE_ID) {
    cursor += 1;
    const instanceIdEnd = nextTokenIndex(complete, cursor, INSTANCE_ID_STOP_TOKENS);
    const instanceId = complete.slice(cursor, instanceIdEnd);
    if (instanceId !== '*' && !isName(instanceId)) {
      return;
    }

    parsed.instanceId = instanceId;
    cursor = instanceIdEnd;
  }

  if (complete.charAt(cursor) === TOKEN_METHOD) {
    cursor += 1;
    const methodsEnd = complete.endsWith(TOKEN_OPTIONAL) ? complete.length - 1 : complete.length;
    const method = complete.slice(cursor, methodsEnd);
    if (!isMethodList(method)) {
      return;
    }

    parsed.method = method;
    cursor = methodsEnd;
  }

  if (complete.charAt(cursor) === TOKEN_OPTIONAL) {
    parsed.flags = TOKEN_OPTIONAL;
    cursor += 1;
  }

  if (cursor !== complete.length) {
    return;
  }

  return new YeomanNamespace(parsed);
}

type ParsedNamespace = {
  complete: string;
  scope?: string;
  unscoped: string;
  generator?: string;
  instanceId?: string;
  semver?: string;
  method?: string;
  flags?: string;
};

export class YeomanNamespace<GeneratorPropertyType extends string | undefined = undefined | string> implements ParsedNamespace {
  _original: string;
  scope?: string;
  unscoped: string;
  generator: GeneratorPropertyType;
  instanceId?: string;
  semver?: string;
  methods?: string[];
  flags?: string;
  command?: any;

  constructor(parsed: ParsedNamespace) {
    this._original = parsed.complete;
    this.scope = parsed.scope;
    this.unscoped = parsed.unscoped;
    this.generator = parsed.generator as GeneratorPropertyType;
    this.instanceId = parsed.instanceId;
    this.semver = parsed.semver;
    this.methods = parsed.method?.split('+');
    this.flags = parsed.flags;

    // Populate flags
    if (this.flags) {
      for (const [name, value] of Object.entries(flags)) {
        if (this.flags === value) {
          (this as any)[name] = true;
        } else {
          delete (this as any)[name];
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
      methods = `+${this.methods.join('+')}`;
    }

    const postSemver = `${this.instanceName}${methods}${this.flags ?? ''}`;
    return `${this.namespace}${this._semverAddition(postSemver)}`;
  }

  get packageNamespace() {
    return `${this._scopeAddition}${this.unscoped}`;
  }

  get namespace() {
    return `${this.packageNamespace}${this.generatorName}`;
  }

  set namespace(namespace) {
    const parsed = parseNamespace<GeneratorPropertyType>(namespace);
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

  with(newValues: Partial<ParsedNamespace>) {
    return new YeomanNamespace({
      ...this,
      ...newValues,
    } as any);
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

  private _update<T extends YeomanNamespace<GeneratorPropertyType>>(parsed: T) {
    this.scope = parsed.scope ?? this.scope;
    this.unscoped = parsed.unscoped ?? this.unscoped;
    this.generator = parsed.generator ?? this.generator;
    this.instanceId = parsed.instanceId ?? this.instanceId;
    this.command = parsed.command ?? this.command;
    this.flags = parsed.flags ?? this.flags;
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
export function requireNamespace(namespace: YeomanNamespace, options: { allowPackageOnlyNamespace: false }): YeomanNamespace<string>;
export function requireNamespace<T extends YeomanNamespace>(namespace: T, options?: { allowPackageOnlyNamespace: true | undefined }): T;
export function requireNamespace(namespace: string, options: { allowPackageOnlyNamespace: false }): YeomanNamespace<string>;
export function requireNamespace(namespace: string, options?: { allowPackageOnlyNamespace: true | undefined }): YeomanNamespace;
export function requireNamespace(
  namespace: string | YeomanNamespace,
  options: { allowPackageOnlyNamespace?: boolean } = {},
): YeomanNamespace {
  const { allowPackageOnlyNamespace = true } = options;
  const parsed = toNamespace(namespace);
  if (!parsed) {
    throw new Error(`Error parsing namespace ${namespace.toString()}`);
  }
  if (allowPackageOnlyNamespace || hasGenerator(parsed)) {
    return parsed;
  }

  throw new Error(`Namespace ${namespace.toString()} does not contain a generator`);
}

/**
 * Test if the object is an YeomanNamespace instance.
 */
export function isNamespaceObject(namespace: unknown): namespace is YeomanNamespace {
  return namespace?.constructor?.name === 'YeomanNamespace';
}

export function hasGenerator(value: YeomanNamespace<string | undefined>): value is YeomanNamespace<string> {
  return value.generator !== undefined;
}
