import { transformFileField } from '@yeoman/transform';
import { type ConflicterFile } from './conflicter.js';

export const forceFileTransform = (pattern: string) => transformFileField<'conflicter', ConflicterFile>('conflicter', 'force', { pattern });

export const forceYoFiles = () => forceFileTransform('**/{.yo-rc.json,.yo-resolve,.yo-rc-global.json}');
