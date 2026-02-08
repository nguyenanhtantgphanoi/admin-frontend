"use strict"

const fp = require('fastify-plugin')

module.exports = fp(async function (fastify, opts) {
  // reply.view is provided by @fastify/view
  fastify.decorateReply('viewWithLayout', function (template, data = {}) {
    const d = Object.assign({}, data, { body: template })
    return this.view('layout.ejs', d)
  })

})
