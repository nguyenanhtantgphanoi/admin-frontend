'use strict'

const dataVersionService = require('../services/dataVersionService')

function applyDataVersionCorsHeaders(request, reply, config) {
  const configured = (config && (config.MOBILE_APP_CORS_ORIGIN || config.CORS_ORIGIN)) ||
    process.env.MOBILE_APP_CORS_ORIGIN ||
    process.env.CORS_ORIGIN ||
    '*'
  const allowedOrigins = configured
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)

  if (allowedOrigins.length === 0 || allowedOrigins.includes('*')) {
    reply.header('Access-Control-Allow-Origin', '*')
  } else {
    const requestOrigin = request.headers.origin
    const resolvedOrigin = requestOrigin && allowedOrigins.includes(requestOrigin)
      ? requestOrigin
      : allowedOrigins[0]

    reply.header('Access-Control-Allow-Origin', resolvedOrigin)
    reply.header('Vary', 'Origin')
  }

  reply.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  reply.header('Access-Control-Allow-Headers', 'Content-Type,If-None-Match')
}

async function dataVersionPage(request, reply) {
  return reply.viewWithLayout('admin/data-version.ejs', {
    title: 'Data Versions'
  })
}

async function preflightDataVersions(request, reply) {
  applyDataVersionCorsHeaders(request, reply, this.config)
  return reply.code(204).send()
}

async function getDataVersions(request, reply) {
  applyDataVersionCorsHeaders(request, reply, this.config)
  reply.header('Cache-Control', 'public, max-age=45')

  try {
    const snapshot = await dataVersionService.calculateDataVersionSnapshot(this.mongo.db)
    reply.header('ETag', snapshot.etag)

    const ifNoneMatch = request.headers['if-none-match']
    if (ifNoneMatch && ifNoneMatch === snapshot.etag) {
      return reply.code(304).send()
    }

    return {
      success: true,
      data: snapshot.data,
      serverTime: snapshot.serverTime
    }
  } catch (err) {
    console.error('getDataVersions error:', err)
    return reply.code(500).send({
      success: false,
      message: 'Failed to get data versions'
    })
  }
}

async function purgeDataVersions(request, reply) {
  applyDataVersionCorsHeaders(request, reply, this.config)

  const body = request.body || {}
  const fields = Array.isArray(body.fields) ? body.fields : []

  if (fields.length === 0) {
    return reply.code(400).send({
      success: false,
      message: 'fields is required and must be a non-empty array'
    })
  }

  const moduleKeys = []
  for (const fieldName of fields) {
    const moduleKey = dataVersionService.toModuleKeyFromResponseField(fieldName)
    if (!moduleKey) {
      return reply.code(400).send({
        success: false,
        message: `Unsupported field: ${fieldName}`,
        supportedFields: dataVersionService.listSupportedResponseFields()
      })
    }

    moduleKeys.push(moduleKey)
  }

  try {
    await dataVersionService.purgeModules(this.mongo.db, moduleKeys)
    const snapshot = await dataVersionService.calculateDataVersionSnapshot(this.mongo.db)
    return {
      success: true,
      data: snapshot.data,
      serverTime: snapshot.serverTime,
      purgedFields: fields
    }
  } catch (err) {
    console.error('purgeDataVersions error:', err)
    return reply.code(500).send({
      success: false,
      message: 'Failed to purge data versions'
    })
  }
}

async function purgeAllDataVersions(request, reply) {
  applyDataVersionCorsHeaders(request, reply, this.config)

  try {
    const allFields = dataVersionService.listSupportedResponseFields()
    const allModuleKeys = dataVersionService.listAllModuleKeys()
    await dataVersionService.purgeModules(this.mongo.db, allModuleKeys)
    const snapshot = await dataVersionService.calculateDataVersionSnapshot(this.mongo.db)

    return {
      success: true,
      data: snapshot.data,
      serverTime: snapshot.serverTime,
      purgedFields: allFields
    }
  } catch (err) {
    console.error('purgeAllDataVersions error:', err)
    return reply.code(500).send({
      success: false,
      message: 'Failed to purge all data versions'
    })
  }
}

module.exports = {
  dataVersionPage,
  preflightDataVersions,
  getDataVersions,
  purgeDataVersions,
  purgeAllDataVersions
}
