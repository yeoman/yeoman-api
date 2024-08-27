/* eslint-disable @typescript-eslint/ban-ts-comment */
import type { BaseGenerator, BaseGeneratorConstructor } from './generator.js';
import type { GetGeneratorConstructor } from './utils.js';

declare let Constructor1: BaseGeneratorConstructor;
declare let Constructor2: GetGeneratorConstructor;
declare let generator1: BaseGenerator;

const _testTypes = () => {
  // @ts-expect-error
  constructor1 = generator1;

  generator1 = new Constructor1();
  generator1 = new Constructor2();

  Constructor1 = Constructor2;
  Constructor2 = Constructor1;
};
