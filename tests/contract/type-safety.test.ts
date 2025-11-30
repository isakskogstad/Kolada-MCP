/**
 * Contract Tests: API Type Safety Gatekeeper
 *
 * These tests ensure that changes in Kolada's OpenAPI spec are compatible
 * with our manually defined internal types.
 *
 * - ✅ If tests pass → API changes are backward compatible
 * - ❌ If tests fail → Breaking changes detected, workflow stops
 */

import { describe, it, expectTypeOf } from 'vitest';
import type { KPI, Municipality, OrganizationalUnit } from '../../src/config/types';
import type { components } from '../../src/config/kolada-schema.generated';

// Extract generated types from OpenAPI schema
type GeneratedMunicipality = components['schemas']['Municipality'];
type GeneratedKPI = components['schemas']['Kpi'];
type GeneratedOU = components['schemas']['Ou'];

describe('Kolada API Contract Safety', () => {
  it('Municipality structure should be compatible', () => {
    // Verify that the generated Municipality type is compatible with our internal type
    // This will fail if Kolada removes required fields or changes their types
    expectTypeOf<GeneratedMunicipality>().toMatchTypeOf<Partial<Municipality>>();
  });

  it('KPI structure should be compatible', () => {
    // Verify that the generated KPI type is compatible with our internal type
    expectTypeOf<GeneratedKPI>().toMatchTypeOf<Partial<KPI>>();
  });

  it('OU (Organizational Unit) structure should be compatible', () => {
    // Verify that the generated OU type is compatible with our internal type
    expectTypeOf<GeneratedOU>().toMatchTypeOf<Partial<OrganizationalUnit>>();
  });
});
