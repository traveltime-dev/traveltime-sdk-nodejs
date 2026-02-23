import { beforeEach } from 'vitest';

const DELAY_MS = 1000;

beforeEach(async () => {
  await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
});
