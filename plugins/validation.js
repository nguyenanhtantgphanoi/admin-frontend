'use strict'

const fp = require('fastify-plugin')
const { isValidMongoObjectId } = require('../helpers/validation')

async function validationPlugin(fastify) {
  fastify.decorate('validateMongoObjectId', function validateMongoObjectId(value, { label = '_id', allowEmpty = false } = {}) {
    const normalized = value === undefined || value === null ? '' : String(value).trim()

    if (normalized === '' && allowEmpty) {
      return null
    }

    if (normalized === '' || !isValidMongoObjectId(normalized)) {
      throw new Error(`${label} must be a valid Mongo ObjectId.`)
    }

    return normalized
  })

  fastify.decorate('validateRequiredFields', function validateRequiredFields(payload, requiredFields) {
    for (const field of requiredFields) {
      const value = payload[field]
      if (value === undefined || value === null || String(value).trim() === '') {
        throw new Error(`Missing required field: ${field}`)
      }
    }
    return true
  })
}

module.exports = fp(validationPlugin)
