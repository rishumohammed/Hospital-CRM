import { describe, it, expect } from 'vitest';
import pino from 'pino';
import { pinoRedactionPaths } from './index';

describe('Logger PII Redaction', () => {
  it('redacts sensitive fields (phone, name, concern, password) in log outputs', () => {
    let output = '';
    const destination = {
      write(chunk: string) {
        output += chunk;
      },
    };

    const pinoFactory = (typeof pino === 'function' ? pino : (pino as any).default || (pino as any).pino) as typeof pino;
    const testLogger = pinoFactory(
      {
        level: 'info',
        redact: {
          paths: pinoRedactionPaths,
          censor: '[REDACTED]',
        },
      },
      destination
    );

    const sensitiveData = {
      mobile: '+919876543210',
      name: 'John Doe Patient',
      concern: 'Severe abdominal pain and fever',
      password: 'superSecretPassword123',
      nested: {
        mobile: '+919999988888',
        name: 'Jane Relative',
        concern: 'Ayurvedic wellness query',
      },
      nonSensitiveField: 'public_lead_id_42',
    };

    testLogger.info(sensitiveData, 'Processed new enquiry');

    expect(output).toContain('[REDACTED]');
    expect(output).toContain('public_lead_id_42');

    // Verify raw PII values NEVER appear in the log output
    expect(output).not.toContain('+919876543210');
    expect(output).not.toContain('John Doe Patient');
    expect(output).not.toContain('Severe abdominal pain and fever');
    expect(output).not.toContain('superSecretPassword123');
    expect(output).not.toContain('+919999988888');
    expect(output).not.toContain('Jane Relative');
    expect(output).not.toContain('Ayurvedic wellness query');
  });
});
