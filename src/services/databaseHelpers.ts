import prisma from './prisma';
import { NotFoundError, AppError } from '../errors/AppError';
import { Prisma } from '@prisma/client';

/**
 * A generic helper to find a unique entity by a query or throw a NotFoundError.
 * @param modelName The name of the Prisma model (e.g., 'account', 'merchantAccount').
 * @param query The Prisma query object for findUnique (e.g., { where: { id: 'some-id' } }).
 * @param entityNameForError User-friendly name of the entity for error messages (e.g., 'Account', 'Merchant').
 * @param identifierForError The identifier used in the query, for error messages.
 * @returns The found entity.
 * @throws NotFoundError if the entity is not found.
 */
export async function findUniqueOrThrow<T>(
  modelName: Prisma.ModelName,
  query: { where: Record<string, any>; select?: Record<string, any> }, // select can be complex
  entityNameForError: string,
  identifierForError?: string | number
): Promise<T> {
  const modelDelegate = (prisma as any)[modelName.charAt(0).toLowerCase() + modelName.slice(1)];
  
  if (!modelDelegate || typeof modelDelegate.findUnique !== 'function') {
    throw new Error(`Invalid model name or model delegate not found: ${String(modelName)}`);
  }

  const entity = await modelDelegate.findUnique(query) as T | null;

  if (!entity) {
    throw new NotFoundError(entityNameForError, identifierForError);
  }
  return entity;
}

/**
 * Ensures that an entity belongs to the expected merchant.
 * Throws an error if ownership check fails.
 * @param entity An object that has a merchant_id property.
 * @param expectedMerchantId The merchant ID the entity should belong to.
 * @param entityNameForError User-friendly name of the entity for error messages (e.g., 'Account').
 * @param entityIdForError The ID of the entity being checked.
 * @throws NotFoundError if the entity does not belong to the expected merchant.
 *         (Could also be a 403 Forbidden error depending on desired semantics).
 */
export function ensureEntityBelongsToMerchant(
  entity: { merchant_id: string | null | undefined }, // Entity must have a merchant_id
  expectedMerchantId: string,
  entityNameForError: string,
  entityIdForError: string | number
): void {
  if (entity.merchant_id !== expectedMerchantId) {
    // Message should align with what tests expect or tests should be updated.
    // The core issue is that an entity belonging to another merchant is often treated as "not found" for the current merchant context.
    throw new NotFoundError(
      `${entityNameForError} with ID ${entityIdForError} does not belong to merchant ${expectedMerchantId}` // Removed trailing period for consistency if tests expect no period. Or ensure tests expect the period.
    );
    // Alternatively, for stricter access control:
    // throw new AppError(
    //   `${entityNameForError} with ID ${entityIdForError} does not belong to merchant ${expectedMerchantId}. Access denied.`,
    //   403, 
    //   'ERR_FORBIDDEN'
    // );
  }
}


// TODO: Add helpers for common create, update, delete patterns if they emerge,
// especially around consistent error handling for P2002, P2025 etc.
