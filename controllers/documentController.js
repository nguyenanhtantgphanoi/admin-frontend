'use strict'

const path = require('node:path')
const mammoth = require('mammoth')

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function textToHtml(value) {
  return value
    .split(/\r?\n\r?\n/)
    .filter((block) => block.trim() !== '')
    .map((block) => `<p>${escapeHtml(block).replace(/\r?\n/g, '<br>')}</p>`)
    .join('\n')
}

async function convertUploadedDocumentToHtml(file) {
  const extension = path.extname(file.filename || '').toLowerCase()
  const buffer = await file.toBuffer()

  if (!buffer || buffer.length === 0) {
    throw new Error('The uploaded file is empty.')
  }

  if (extension === '.docx') {
    const result = await mammoth.convertToHtml({ buffer })
    return { html: result.value, messages: result.messages || [], sourceType: 'docx' }
  }

  if (extension === '.html' || extension === '.htm') {
    return { html: buffer.toString('utf8'), messages: [], sourceType: 'html' }
  }

  if (extension === '.txt' || extension === '.md') {
    return { html: textToHtml(buffer.toString('utf8')), messages: [], sourceType: 'text' }
  }

  throw new Error('Unsupported file type. Upload a .docx, .html, .htm, .txt, or .md file.')
}

async function documentToHtmlPage(request, reply) {
  return reply.viewWithLayout('admin/document-to-html.ejs', {
    title: 'Chuyển tài liệu sang HTML',
    outputHtml: '',
    fileName: ''
  })
}

async function convertDocument(request, reply) {
  if (!request.isMultipart()) {
    return reply.code(400).send({ success: false, message: 'Choose a file before converting.' })
  }

  const file = await request.file()

  if (!file) {
    return reply.code(400).send({ success: false, message: 'Choose a file before converting.' })
  }

  try {
    const payload = await convertUploadedDocumentToHtml(file)
    return {
      success: true,
      sourceType: payload.sourceType,
      html: payload.html,
      messages: payload.messages
    }
  } catch (err) {
    reply.code(400)
    return { success: false, message: err.message }
  }
}

module.exports = {
  documentToHtmlPage,
  convertDocument
}
