import { beforeEach } from 'vitest';

const DELAY_MS = 2000;

beforeEach(async () => {
  await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
});
