import { describe, it, expect } from 'vitest';
import en from '../locales/en.json';
import ml from '../locales/ml.json';

describe('Locales configuration', () => {
  it('both English and Malayalam locale files are valid and contain core navigation keys', () => {
    expect(en.app_name).toBeDefined();
    expect(ml.app_name).toBeDefined();
    expect(en.nav.my_work).toBe('Dashboard');
    expect(ml.nav.my_work).toBe('എന്റെ ജോലികൾ');

    // Ensure all top-level keys in en exist in ml
    const enKeys = Object.keys(en);
    const mlKeys = Object.keys(ml);
    expect(mlKeys).toEqual(expect.arrayContaining(enKeys));
  });

  it('contains desk definitions in both languages', () => {
    expect(en.desks.support_title).toContain('Support Desk');
    expect(ml.desks.support_title).toContain('സപ്പോർട്ട് ഡെസ്ക്');
    expect(en.desks.admission_title).toContain('Admission Desk');
    expect(ml.desks.admission_title).toContain('അഡ്മിഷൻ ഡെസ്ക്');
    expect(en.desks.aftercare_title).toContain('Aftercare Desk');
    expect(ml.desks.aftercare_title).toContain('ആഫ്റ്റർകെയർ ഡെസ്ക്');
  });
});
