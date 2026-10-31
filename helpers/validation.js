'use strict'

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : value
}

function isValidMongoObjectId(value) {
  const normalized = normalizeString(value)
  return typeof normalized === 'string' && /^[0-9a-fA-F]{24}$/.test(normalized)
}

function parseMongoObjectId(rawValue, { label = '_id', allowEmpty = false } = {}) {
  const value = normalizeString(rawValue)

  if (value === undefined || value === null || value === '') {
    if (allowEmpty) return null
    throw new Error(`${label} is required.`)
  }

  const parsedValue = String(value)
  if (!isValidMongoObjectId(parsedValue)) {
    throw new Error(`${label} must be a valid Mongo ObjectId.`)
  }

  return parsedValue
}

function validateRequiredFields(payload, requiredFields) {
  for (const field of requiredFields) {
    const value = payload[field]
    if (value === undefined || value === null || String(value).trim() === '') {
      throw new Error(`Missing required field: ${field}`)
    }
  }
}

module.exports = {
  isValidMongoObjectId,
  parseMongoObjectId,
  validateRequiredFields
}
