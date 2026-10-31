'use strict'

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : value
}

function parseMongoObjectId(rawValue, { label = '_id', allowEmpty = false } = {}) {
  const value = normalizeString(rawValue)

  if (value === undefined || value === null || value === '') {
    if (allowEmpty) return null
    throw new Error(`${label} is required.`)
  }

  const parsedValue = String(value)
  if (!/^[0-9a-fA-F]{24}$/.test(parsedValue)) {
    throw new Error(`${label} must be a valid Mongo ObjectId.`)
  }

  return parsedValue
}

function getAssignedDateMap(existingDoc, rawAssignedDate) {
  const nextMap = { ...(existingDoc && existingDoc.assigned_date ? existingDoc.assigned_date : {}) }

  if (!rawAssignedDate || rawAssignedDate === 'undefined' || rawAssignedDate === 'null') {
    return nextMap
  }

  const parsedDate = new Date(rawAssignedDate)
  if (Number.isNaN(parsedDate.getTime())) {
    return nextMap
  }

  nextMap[parsedDate.getFullYear()] = rawAssignedDate
  return nextMap
}

function buildNgayLeUpdatePayload({
  existingDoc,
  title,
  date,
  assigned_date,
  week,
  season,
  url,
  bac_le,
  mau_ao_le
}) {
  const doc = {
    title,
    date,
    bac_le,
    assigned_date: getAssignedDateMap(existingDoc, assigned_date),
    mau_ao_le,
    updatedAt: new Date()
  }

  if (week !== undefined) doc.week = week
  if (season !== undefined) doc.season = season
  if (url !== undefined) doc.url = url

  return doc
}

async function updateNgayLeDocument({ collection, mongoObjectId, documentId, payload }) {
  const objectId = new mongoObjectId(documentId)
  await collection.updateOne({ _id: objectId }, { $set: payload })
  return payload
}

module.exports = {
  parseMongoObjectId,
  buildNgayLeUpdatePayload,
  getAssignedDateMap,
  updateNgayLeDocument
}
