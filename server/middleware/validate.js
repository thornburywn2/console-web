/**
 * Zod Validation Middleware
 *
 * Provides consistent input validation across all API routes
 * using Zod schemas.
 */

import { ZodError } from 'zod';
import { createLogger } from '../services/logger.js';

const log = createLogger('validation');

/**
 * Create validation middleware for a specific source
 *
 * @param {import('zod').ZodSchema} schema - Zod schema to validate against
 * @param {'body' | 'query' | 'params'} source - Request property to validate
 * @returns {Function} Express middleware
 *
 * @example
 * // Validate request body
 * router.post('/', validate(sessionSchema, 'body'), handler);
 *
 * // Validate query parameters
 * router.get('/', validate(paginationSchema, 'query'), handler);
 *
 * // Validate URL parameters
 * router.get('/:id', validate(idSchema, 'params'), handler);
 */
export const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    try {
      // Get data from the specified source
      const data = source === 'body' ? req.body
                 : source === 'query' ? req.query
                 : source === 'params' ? req.params
                 : req[source];

      // Parse and validate
      const result = schema.parse(data);

      // Store validated data with capitalized source name
      // e.g., req.validatedBody, req.validatedQuery, req.validatedParams
      const capitalizedSource = source.charAt(0).toUpperCase() + source.slice(1);
      req[`validated${capitalizedSource}`] = result;

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        // Format validation errors
        const issues = error.issues.map(issue => ({
          path: issue.path.join('.') || 'root',
          code: issue.code,
          message: issue.message,
          ...(issue.expected && { expected: issue.expected }),
          ...(issue.received && { received: issue.received }),
        }));

        log.warn({
          path: req.path,
          method: req.method,
          source,
          issues,
          requestId: req.id,
        }, 'validation failed');

        return res.status(400).json({
          error: 'Validation failed',
          message: 'The request data is invalid',
          issues,
          requestId: req.id,
        });
      }

      // Re-throw non-Zod errors
      next(error);
    }
  };
};

/**
 * Convenience middleware for body validation
 */
export const validateBody = (schema) => validate(schema, 'body');

/**
 * Convenience middleware for query validation
 */
export const validateQuery = (schema) => validate(schema, 'query');

/**
 * Convenience middleware for params validation
 */
export const validateParams = (schema) => validate(schema, 'params');

/**
 * Validate multiple sources at once
 *
 * @example
 * router.put('/:id',
 *   validateMultiple({
 *     params: idSchema,
 *     body: updateSchema,
 *   }),
 *   handler
 * );
 */
export const validateMultiple = (schemas) => {
  return (req, res, next) => {
    const errors = [];

    for (const [source, schema] of Object.entries(schemas)) {
      try {
        const data = req[source];
        const result = schema.parse(data);

        const capitalizedSource = source.charAt(0).toUpperCase() + source.slice(1);
        req[`validated${capitalizedSource}`] = result;
      } catch (error) {
        if (error instanceof ZodError) {
          errors.push(...error.issues.map(issue => ({
            source,
            path: issue.path.join('.') || 'root',
            code: issue.code,
            message: issue.message,
          })));
        } else {
          return next(error);
        }
      }
    }

    if (errors.length > 0) {
      log.warn({
        path: req.path,
        method: req.method,
        errors,
        requestId: req.id,
      }, 'multi-source validation failed');

      return res.status(400).json({
        error: 'Validation failed',
        message: 'The request data is invalid',
        issues: errors,
        requestId: req.id,
      });
    }

    next();
  };
};

export default {
  validate,
  validateBody,
  validateQuery,
  validateParams,
  validateMultiple,
};
