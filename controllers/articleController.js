'use strict'

const { parseMongoObjectId } = require('../helpers/validation')

async function listArticles(request, reply) {
  const { _id } = request.query
  const ngayLeCollection = this.mongo.db.collection('ngay-le')
  const articlesCollection = this.mongo.db.collection('articles')

  if (_id) {
    try {
      const articlesOfNgayLe = await ngayLeCollection.findOne({ _id: new this.mongo.ObjectId(_id) })
      if (!articlesOfNgayLe) {
        return reply.viewWithLayout('admin/bien-tap-suy-niem.ejs', { articles: [], urlParams: request.query, ngayLe: null })
      }

      const reflectionsIds = articlesOfNgayLe.reflections || []
      const articles = await articlesCollection.find({
        _id: { $in: reflectionsIds.map((id) => new this.mongo.ObjectId(id)) }
      }).toArray()

      return reply.viewWithLayout('admin/bien-tap-suy-niem.ejs', {
        articles,
        urlParams: request.query,
        ngayLe: articlesOfNgayLe
      })
    } catch (err) {
      return reply.viewWithLayout('admin/bien-tap-suy-niem.ejs', { articles: [], urlParams: request.query, ngayLe: null })
    }
  }

  try {
    const articles = await articlesCollection.find({}).toArray()

    for (const art of articles) {
      try {
        const parent = await ngayLeCollection.findOne({ reflections: { $in: [art._id] } })
        art.ngay_le_title = parent ? (parent.title || '') : ''
        art.ngay_le_id = parent ? parent._id : null
      } catch (innerErr) {
        art.ngay_le_title = ''
        art.ngay_le_id = null
      }
    }

    return reply.viewWithLayout('admin/bien-tap-suy-niem.ejs', { articles, urlParams: {} })
  } catch (err) {
    return reply.viewWithLayout('admin/bien-tap-suy-niem.ejs', { articles: [], urlParams: {} })
  }
}

async function editArticle(request, reply) {
  const { _id } = request.query
  const articlesCollection = this.mongo.db.collection('articles')
  const ngayLeCollection = this.mongo.db.collection('ngay-le')

  let article = null
  if (_id) {
    try {
      article = await articlesCollection.findOne({ _id: new this.mongo.ObjectId(_id) })
    } catch (err) {
      article = null
    }
  }

  let ngayLeList = []
  try {
    ngayLeList = await ngayLeCollection.find({}).toArray()
  } catch (err) {
    ngayLeList = []
  }

  return reply.viewWithLayout('admin/bien-tap-suy-niem-edit.ejs', {
    article,
    search: request.query,
    ngayLeList
  })
}

async function saveArticle(request, reply) {
  try {
    const { title, author, content, _id, ngay_le_id } = request.body
    const articlesCollection = this.mongo.db.collection('articles')
    const ngayLeCollection = this.mongo.db.collection('ngay-le')

    if (_id && String(_id).trim() !== '') {
      await articlesCollection.updateOne(
        { _id: new this.mongo.ObjectId(_id) },
        { $set: { title, author, content, updatedAt: new Date() } }
      )
      return { success: true, message: 'Article saved successfully' }
    }

    const result = await articlesCollection.insertOne({
      title,
      author,
      content,
      createdAt: new Date(),
      updatedAt: new Date()
    })

    if (ngay_le_id && String(ngay_le_id).trim() !== '') {
      const _updatedAt = new Date()
      await ngayLeCollection.updateOne(
        { _id: new this.mongo.ObjectId(ngay_le_id) },
        { $push: { reflections: result.insertedId }, $set: { updatedAt: _updatedAt } }
      )
      await propagateUpdatedAtToLich(this.mongo.db, this.mongo.ObjectId, ngay_le_id, _updatedAt)
    }

    return { success: true, message: 'Article saved successfully' }
  } catch (err) {
    reply.code(500)
    return { success: false, message: 'Failed to save article', error: err.message }
  }
}

async function deleteArticle(request, reply) {
  try {
    const { _id } = request.body
    const articlesCollection = this.mongo.db.collection('articles')
    const ngayLeCollection = this.mongo.db.collection('ngay-le')

    if (!parseMongoObjectId(_id, { label: '_id' })) {
      reply.code(400)
      return { success: false, message: 'Invalid article id' }
    }

    await articlesCollection.deleteOne({ _id: new this.mongo.ObjectId(_id) })

    const articleObjectId = new this.mongo.ObjectId(_id)
    const affectedNgayLeDocs = await ngayLeCollection
      .find({ reflections: { $in: [articleObjectId] } }, { projection: { _id: 1 } })
      .toArray()

    const _updatedAt = new Date()
    await ngayLeCollection.updateMany(
      { reflections: { $in: [articleObjectId] } },
      { $pull: { reflections: articleObjectId }, $set: { updatedAt: _updatedAt } }
    )

    for (const doc of affectedNgayLeDocs) {
      await propagateUpdatedAtToLich(this.mongo.db, this.mongo.ObjectId, doc._id.toString(), _updatedAt)
    }

    return { success: true, message: 'Article deleted successfully' }
  } catch (err) {
    reply.code(500)
    return { success: false, message: 'Failed to delete article', error: err.message }
  }
}

async function propagateUpdatedAtToLich(db, ObjectId, ngayLeId, updatedAt) {
  try {
    const ngayLeDoc = await db.collection('ngay-le').findOne(
      { _id: new ObjectId(ngayLeId) },
      { projection: { assigned_date: 1 } }
    )

    if (!ngayLeDoc || !ngayLeDoc.assigned_date) return

    const dates = Object.values(ngayLeDoc.assigned_date).filter(Boolean)
    if (dates.length === 0) return

    await db.collection('lich-cong-giao').updateMany(
      { date: { $in: dates } },
      { $set: { updatedAt } }
    )
  } catch (err) {
    console.error('propagateUpdatedAtToLich error:', err)
  }
}

module.exports = {
  listArticles,
  editArticle,
  saveArticle,
  deleteArticle
}
