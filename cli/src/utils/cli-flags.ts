import { flags } from '@oclif/command';
import { error } from '@oclif/errors';
import { isISO8601, isInt } from 'validator';
import ms from 'ms';

export type MinMaxIntFlagOptions = Parameters<(typeof flags.integer)>[0] & {
  min: number,
  max: number,
};

export default {
  ...flags,
  minMaxInt: ({ min, max }: MinMaxIntFlagOptions) => flags.integer({
    parse(val) {
      if (!isInt(val, { min, max })) {
        error(`Expected an integer between ${min} and ${max} but received: ${val}`);
      }
      return parseInt(val, 10);
    },
  }),
  durationOrISO8601: flags.build({
    parse(val) {
      if (isISO8601(val)) {
        return new Date(val);
      }
      const valMs = ms(val);
      if (valMs !== undefined) {
        return val;
      }
      error(`Expected a formatted duration or ISO 8601 string format but received: ${val}`);
      throw new Error('Should not get here');
    },
  }),
};
