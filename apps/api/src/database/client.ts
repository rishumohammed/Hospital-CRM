import { PrismaClient } from '@prisma/client';
import { logger } from '../logger/index';

const prismaClientSingleton = () => {
  return new PrismaClient({
    log: [
      { emit: 'event', level: 'error' },
      { emit: 'event', level: 'warn' },
    ],
  });
};

declare global {
  // eslint-disable-next-line no-var
  var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>;
}

export const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') {
  globalThis.prismaGlobal = prisma;
}

// Log Prisma warnings and errors
(prisma as any).$on?.('error', (e: any) => {
  logger.error({ err: e }, 'Prisma error');
});

(prisma as any).$on?.('warn', (e: any) => {
  logger.warn({ warning: e }, 'Prisma warning');
});
