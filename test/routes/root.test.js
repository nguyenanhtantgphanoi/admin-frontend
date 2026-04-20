'use strict'

const { test } = require('node:test')
const assert = require('node:assert')
const { build } = require('../helper')

test('default root route', async (t) => {
  const app = await build(t)

  const res = await app.inject({
    url: '/'
  })
  assert.strictEqual(res.statusCode, 200)
  assert.match(res.headers['content-type'], /text\/html/)
  assert.match(res.payload, /Truyền Thông TGP Hà Nội Admin/)
})

test('document to html page renders', async (t) => {
  const app = await build(t)

  const res = await app.inject({
    url: '/document-to-html'
  })

  assert.strictEqual(res.statusCode, 200)
  assert.match(res.headers['content-type'], /text\/html/)
  assert.match(res.payload, /Chuyển tài liệu sang HTML/)
})

test('document to html conversion requires a file', async (t) => {
  const app = await build(t)

  const res = await app.inject({
    method: 'POST',
    url: '/document-to-html/convert'
  })

  assert.strictEqual(res.statusCode, 400)
  assert.deepStrictEqual(JSON.parse(res.payload), {
    success: false,
    message: 'Choose a file before converting.'
  })
})

// inject callback style:
//
// test('default root route', (t) => {
//   t.plan(2)
//   const app = await build(t)
//
//   app.inject({
//     url: '/'
//   }, (err, res) => {
//     t.error(err)
//     assert.deepStrictEqual(JSON.parse(res.payload), { root: true })
//   })
// })
