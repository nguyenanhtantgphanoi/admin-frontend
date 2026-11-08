'use strict'

const crypto = require('node:crypto')

const BASELINE_TIMESTAMP = '1970-01-01T00:00:00.000Z'
const VERSION_OVERRIDE_COLLECTION = 'data-version-overrides'

const MODULE_KEYS = Object.freeze({
  lichCongGiaoDaycardVersion: 'lich-cong-giao-daycard',
  lichCongGiaoYearVersion: 'lich-cong-giao-year',
  kinhNguyenVersion: 'kinh-nguyen',
  nghiThucVersion: 'nghi-thuc'
})

const MODULE_SOURCES = Object.freeze({
  [MODULE_KEYS.lichCongGiaoDaycardVersion]: ['lich-cong-giao', 'ngay-le', 'articles'],
  [MODULE_KEYS.lichCongGiaoYearVersion]: ['lich-cong-giao'],
  [MODULE_KEYS.kinhNguyenVersion]: ['kinh-nguyen'],
  [MODULE_KEYS.nghiThucVersion]: ['nghi-thuc']
})

let hasEnsuredOverrideIndex = false
let snapshotCache = null
const SNAPSHOT_CACHE_TTL_MS = 45 * 1000

function stableStringify(value) {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value)
  }

  if (Array.isArray(value)) {
    return '[' + value.map(stableStringify).join(',') + ']'
  }

  const keys = Object.keys(value).sort()
  return '{' + keys.map((key) => JSON.stringify(key) + ':' + stableStringify(value[key])).join(',') + '}'
}

function buildHash(value) {
  return crypto.createHash('sha1').update(value).digest('hex')
}

function normalizeIsoTimestamp(value) {
  if (value instanceof Date && !isNaN(value)) {
    return value.toISOString()
  }

  const parsed = new Date(value)
  if (isNaN(parsed)) {
    return BASELINE_TIMESTAMP
  }

  return parsed.toISOString()
}

function createModuleVersion({ moduleKey, fingerprintsByCollection, overrideSeed }) {
  const collections = MODULE_SOURCES[moduleKey] || []
  const payload = {
    moduleKey,
    overrideSeed: overrideSeed || '',
    sources: collections.map((collectionName) => {
      const fingerprint = fingerprintsByCollection[collectionName] || {
        count: 0,
        latestTouchAt: BASELINE_TIMESTAMP
      }

      return {
        collectionName,
        count: Number.isFinite(fingerprint.count) ? fingerprint.count : 0,
        latestTouchAt: normalizeIsoTimestamp(fingerprint.latestTouchAt)
      }
    })
  }

  const versionHash = buildHash(stableStringify(payload))
  return versionHash
}

function buildDataVersions({ fingerprintsByCollection, overrideMap }) {
  return {
    lichCongGiaoDaycardVersion: createModuleVersion({
      moduleKey: MODULE_KEYS.lichCongGiaoDaycardVersion,
      fingerprintsByCollection,
      overrideSeed: overrideMap[MODULE_KEYS.lichCongGiaoDaycardVersion]
    }),
    lichCongGiaoYearVersion: createModuleVersion({
      moduleKey: MODULE_KEYS.lichCongGiaoYearVersion,
      fingerprintsByCollection,
      overrideSeed: overrideMap[MODULE_KEYS.lichCongGiaoYearVersion]
    }),
    kinhNguyenVersion: createModuleVersion({
      moduleKey: MODULE_KEYS.kinhNguyenVersion,
      fingerprintsByCollection,
      overrideSeed: overrideMap[MODULE_KEYS.kinhNguyenVersion]
    }),
    nghiThucVersion: createModuleVersion({
      moduleKey: MODULE_KEYS.nghiThucVersion,
      fingerprintsByCollection,
      overrideSeed: overrideMap[MODULE_KEYS.nghiThucVersion]
    })
  }
}

async function ensureOverrideCollectionIndex(db) {
  if (hasEnsuredOverrideIndex) {
    return
  }

  await db.collection(VERSION_OVERRIDE_COLLECTION).createIndex({ moduleKey: 1 }, { unique: true })
  hasEnsuredOverrideIndex = true
}

async function getCollectionFingerprint(db, collectionName) {
  const fallbackDate = new Date(BASELINE_TIMESTAMP)

  const [row] = await db.collection(collectionName).aggregate([
    {
      $project: {
        touchAt: {
          $ifNull: [
            '$updatedAt',
            {
              $ifNull: [
                '$createdAt',
                {
                  $cond: [
                    { $eq: [{ $type: '$_id' }, 'objectId'] },
                    { $toDate: '$_id' },
                    fallbackDate
                  ]
                }
              ]
            }
          ]
        }
      }
    },
    {
      $group: {
        _id: null,
        count: { $sum: 1 },
        latestTouchAt: { $max: '$touchAt' }
      }
    }
  ]).toArray()

  if (!row) {
    return { count: 0, latestTouchAt: BASELINE_TIMESTAMP }
  }

  return {
    count: Number.isFinite(row.count) ? row.count : 0,
    latestTouchAt: normalizeIsoTimestamp(row.latestTouchAt)
  }
}

async function getOverrideMap(db) {
  await ensureOverrideCollectionIndex(db)
  const rows = await db.collection(VERSION_OVERRIDE_COLLECTION)
    .find({}, { projection: { _id: 0, moduleKey: 1, seed: 1 } })
    .toArray()

  return rows.reduce((acc, item) => {
    acc[item.moduleKey] = item.seed || ''
    return acc
  }, {})
}

async function calculateDataVersionSnapshot(db) {
  if (snapshotCache && snapshotCache.expiresAt > Date.now()) {
    return snapshotCache.value
  }

  const collections = new Set()
  Object.values(MODULE_SOURCES).forEach((list) => list.forEach((name) => collections.add(name)))

  const collectionList = Array.from(collections)
  const fingerprintEntries = await Promise.all(collectionList.map(async (collectionName) => {
    const fingerprint = await getCollectionFingerprint(db, collectionName)
    return [collectionName, fingerprint]
  }))

  const fingerprintsByCollection = Object.fromEntries(fingerprintEntries)
  const overrideMap = await getOverrideMap(db)
  const data = buildDataVersions({ fingerprintsByCollection, overrideMap })
  const serverTime = new Date().toISOString()

  const etagPayload = stableStringify({ data })
  const etag = '"' + buildHash(etagPayload) + '"'

  const snapshot = { data, serverTime, etag }
  snapshotCache = {
    value: snapshot,
    expiresAt: Date.now() + SNAPSHOT_CACHE_TTL_MS
  }

  return snapshot
}

function toModuleKeyFromResponseField(fieldName) {
  return MODULE_KEYS[fieldName] || null
}

async function purgeModules(db, moduleKeys) {
  await ensureOverrideCollectionIndex(db)
  const nowIso = new Date().toISOString()

  const operations = moduleKeys.map((moduleKey) => ({
    updateOne: {
      filter: { moduleKey },
      update: {
        $set: {
          moduleKey,
          seed: `${nowIso}-${crypto.randomBytes(6).toString('hex')}`,
          updatedAt: new Date()
        },
        $setOnInsert: {
          createdAt: new Date()
        }
      },
      upsert: true
    }
  }))

  if (operations.length > 0) {
    await db.collection(VERSION_OVERRIDE_COLLECTION).bulkWrite(operations, { ordered: false })
  }

  snapshotCache = null
}

function listAllModuleKeys() {
  return Object.values(MODULE_KEYS)
}

function listSupportedResponseFields() {
  return Object.keys(MODULE_KEYS)
}

function invalidateSnapshotCache() {
  snapshotCache = null
}

module.exports = {
  BASELINE_TIMESTAMP,
  MODULE_KEYS,
  buildDataVersions,
  calculateDataVersionSnapshot,
  toModuleKeyFromResponseField,
  purgeModules,
  listAllModuleKeys,
  listSupportedResponseFields,
  invalidateSnapshotCache
}
