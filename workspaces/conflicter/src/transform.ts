import { transformFileField } from '@yeoman/transform';
import { type FileTransform } from 'mem-fs';
import { type MemFsEditorFile } from 'mem-fs-editor';
import { type ConflicterFile } from './conflicter.js';

export const forceFileTransform = (pattern: string): FileTransform<MemFsEditorFile> =>
  transformFileField<'conflicter', ConflicterFile>('conflicter', 'force', { pattern });

export const forceYoFiles = (): FileTransform<MemFsEditorFile> => forceFileTransform('**/{.yo-rc.json,.yo-resolve,.yo-rc-global.json}');
