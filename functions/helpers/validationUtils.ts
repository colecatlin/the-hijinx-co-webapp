/**
 * Payload validation utilities for backend functions
 */

export function validateRequired(payload, requiredFields) {
  const missing = [];
  for (const field of requiredFields) {
    if (!payload[field]) {
      missing.push(field);
    }
  }
  if (missing.length > 0) {
    throw new Error(`Missing required fields: ${missing.join(', ')}`);
  }
}

export function validateEnum(value, allowedValues, fieldName) {
  if (!allowedValues.includes(value)) {
    throw new Error(`Invalid ${fieldName}. Allowed values: ${allowedValues.join(', ')}`);
  }
}

export function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new Error('Invalid email format');
  }
}

export function validateDateFormat(dateStr, format = 'ISO') {
  try {
    if (format === 'ISO') {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) throw new Error();
    }
    return true;
  } catch {
    throw new Error(`Invalid date format: ${dateStr}`);
  }
}

export function createValidationError(status, message) {
  return Response.json({ error: message }, { status });
}