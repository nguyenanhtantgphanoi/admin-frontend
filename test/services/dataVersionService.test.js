'use strict'

const { test } = require('node:test')
const assert = require('node:assert')
const dataVersionService = require('../../services/dataVersionService')

function createFingerprints() {
  return {
    'lich-cong-giao': { count: 365, latestTouchAt: '2026-11-08T12:00:00.000Z' },
    'ngay-le': { count: 180, latestTouchAt: '2026-11-08T12:00:00.000Z' },
    articles: { count: 250, latestTouchAt: '2026-11-08T12:00:00.000Z' },
    'kinh-nguyen': { count: 80, latestTouchAt: '2026-11-08T12:00:00.000Z' },
    'nghi-thuc': { count: 64, latestTouchAt: '2026-11-08T12:00:00.000Z' }
  }
}

test('buildDataVersions is idempotent when fingerprints are unchanged', () => {
  const fingerprints = createFingerprints()
  const overrideMap = {}

  const first = dataVersionService.buildDataVersions({ fingerprintsByCollection: fingerprints, overrideMap })
  const second = dataVersionService.buildDataVersions({ fingerprintsByCollection: fingerprints, overrideMap })

  assert.deepStrictEqual(second, first)
})

test('changing ngay-le only changes daycard version', () => {
  const fingerprintsBefore = createFingerprints()
  const fingerprintsAfter = createFingerprints()
  fingerprintsAfter['ngay-le'] = { count: 181, latestTouchAt: '2026-11-09T06:00:00.000Z' }

  const before = dataVersionService.buildDataVersions({
    fingerprintsByCollection: fingerprintsBefore,
    overrideMap: {}
  })
  const after = dataVersionService.buildDataVersions({
    fingerprintsByCollection: fingerprintsAfter,
    overrideMap: {}
  })

  assert.notStrictEqual(after.lichCongGiaoDaycardVersion, before.lichCongGiaoDaycardVersion)
  assert.strictEqual(after.lichCongGiaoYearVersion, before.lichCongGiaoYearVersion)
  assert.strictEqual(after.kinhNguyenVersion, before.kinhNguyenVersion)
  assert.strictEqual(after.nghiThucVersion, before.nghiThucVersion)
})

test('changing kinh-nguyen only changes kinhNguyenVersion', () => {
  const fingerprintsBefore = createFingerprints()
  const fingerprintsAfter = createFingerprints()
  fingerprintsAfter['kinh-nguyen'] = { count: 81, latestTouchAt: '2026-11-09T06:05:00.000Z' }

  const before = dataVersionService.buildDataVersions({
    fingerprintsByCollection: fingerprintsBefore,
    overrideMap: {}
  })
  const after = dataVersionService.buildDataVersions({
    fingerprintsByCollection: fingerprintsAfter,
    overrideMap: {}
  })

  assert.strictEqual(after.lichCongGiaoDaycardVersion, before.lichCongGiaoDaycardVersion)
  assert.strictEqual(after.lichCongGiaoYearVersion, before.lichCongGiaoYearVersion)
  assert.notStrictEqual(after.kinhNguyenVersion, before.kinhNguyenVersion)
  assert.strictEqual(after.nghiThucVersion, before.nghiThucVersion)
})
