import { flags } from '@oclif/command';
import { error } from '@oclif/errors';
import validator from 'validator';
import ms from 'ms';

export type MinMaxIntFlagOptions = Parameters<(typeof flags.integer)>[0] & Partial<{
  min: number,
  max: number,
}>;

export default {
  ...flags,
  minMaxInt: ({ min, max, ...options }: MinMaxIntFlagOptions) => flags.integer({
    parse(val) {
      if (!validator.isInt(val, { min, max })) {
        error(`Expected an integer between ${min} and ${max} but received: ${val}`);
      }
      return parseInt(val, 10);
    },
    ...options,
  }),
  durationOrISO8601: flags.build({
    parse(val) {
      if (validator.isISO8601(val)) {
        return new Date(val);
      }
      const valMs = ms(val);
      if (valMs !== undefined) {
        return val;
      }
      error(`Expected a formatted duration or ISO 8601 string format but received: ${val}`);
    },
  }),
  keyValue: flags.build({
    parse(val) {
      const kvMatch = /^([^=]+)=(.*)$/.exec(val);
      if (!kvMatch) return error(`Expected 'KEY=value' but received: ${val}`);
      return { key: kvMatch[1], value: kvMatch[2] };
    },
  }),
};
