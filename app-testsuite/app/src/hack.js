import { createRuntime } from '@binaris/shift-fetch-runtime';
export const { hack: notExposed } = createRuntime(['hack'], { filename: 'index' });
export const { hack: invalidFile } = createRuntime(['hack'], { filename: '../index' });
