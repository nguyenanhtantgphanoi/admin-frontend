'use strict'

const { parseMongoObjectId } = require('../helpers/validation')
const ritualService = require('../services/ritualService')

async function listRituals(request, reply) {
  const collection = this.mongo.db.collection('nghi-thuc')
  const { search } = request.query

  try {
    const query = search ? { title: { $regex: search, $options: 'i' } } : {}
    const items = await collection.find(query).sort({ order: 1 }).toArray()
    return reply.viewWithLayout('nghi-thuc/manage.ejs', { nghi_thuc: items, search })
  } catch (err) {
    return err
  }
}

async function editRitual(request, reply) {
  const { _id } = request.query
  const collection = this.mongo.db.collection('nghi-thuc')

  try {
    const item = _id ? await collection.findOne({ _id: new this.mongo.ObjectId(_id) }) : null
    return reply.viewWithLayout('nghi-thuc/nghi-thuc-edit.ejs', { item })
  } catch (err) {
    return err
  }
}

async function saveRitual(request, reply) {
  const { _id, title, content, order, group, html } = request.body
  const collection = this.mongo.db.collection('nghi-thuc')

  try {
    if (_id && String(_id).trim() !== '') {
      await collection.updateOne(
        { _id: new this.mongo.ObjectId(_id) },
        { $set: { title: title || content, group: group || null, html: html || content, order, updatedAt: new Date() } }
      )
      return { success: true }
    }

    const result = await collection.insertOne({
      title: title || content,
      group: group || null,
      html: html || content,
      order,
      createdAt: new Date(),
      updatedAt: new Date()
    })

    return { success: true, insertedId: result.insertedId }
  } catch (err) {
    reply.code(500)
    return { success: false, message: err.message }
  }
}

async function deleteRitual(request, reply) {
  const { _id } = request.body
  try {
    const mongoId = parseMongoObjectId(_id, { label: '_id' })
    const collection = this.mongo.db.collection('nghi-thuc')
    await collection.deleteOne({ _id: new this.mongo.ObjectId(mongoId) })
    return { success: true }
  } catch (err) {
    reply.code(400)
    return { success: false, message: err.message }
  }
}

async function getNghiThuc(request, reply) {
  const collection = this.mongo.db.collection('nghi-thuc')
  try {
    return await ritualService.listDocuments(collection)
  } catch (err) {
    return err
  }
}

async function getKinhNguyen(request, reply) {
  const collection = this.mongo.db.collection('kinh-nguyen')
  try {
    return await ritualService.listDocuments(collection)
  } catch (err) {
    return err
  }
}

async function listKinhNguyen(request, reply) {
  const collection = this.mongo.db.collection('kinh-nguyen')
  try {
    const items = await ritualService.listDocuments(collection)
    return items
  } catch (err) {
    return err
  }
}

async function getKinhNguyenGrouped(request, reply) {
  const collection = this.mongo.db.collection('kinh-nguyen')
  try {
    const items = await ritualService.listDocuments(collection, { order: 1 })
    return ritualService.groupByTitleOrGroup(items)
  } catch (err) {
    return err
  }
}

async function getNghiThucGrouped(request, reply) {
  const collection = this.mongo.db.collection('nghi-thuc')
  try {
    const items = await ritualService.listDocuments(collection, { order: 1 })
    return ritualService.groupByTitleOrGroup(items)
  } catch (err) {
    return err
  }
}

function getLatestUpdatedAt(collectionName, label) {
  return async function (request, reply) {
    const collection = this.mongo.db.collection(collectionName)
    try {
      return await ritualService.getLatestUpdatedAt(collection, label)
    } catch (err) {
      reply.code(err.statusCode || 500)
      return { error: err.message }
    }
  }
}

async function manageKinhNguyenPage(request, reply) {
  try {
    return reply.viewWithLayout('nghi-thuc/manage.ejs', {
      title: 'Manage Kinh Nguyen',
      manager: {
        pageTitle: 'Manage Kinh Nguyện',
        entityLabel: 'Kinh Nguyện',
        apiGet: '/get-kinh-nguyen',
        apiSave: '/save-kinh-nguyen',
        apiUpdate: '/update-kinh-nguyen',
        apiDelete: '/delete-kinh-nguyen',
        apiUpdateOrder: '/update-kinh-nguyen-order'
      }
    })
  } catch (err) {
    return err
  }
}

async function saveKinhNguyen(request, reply) {
  return saveDocumentByCollection.call(this, 'kinh-nguyen', request, reply)
}

async function saveDocumentByCollection(collectionName, request, reply) {
  const collection = this.mongo.db.collection(collectionName)
  const { title, group, html } = request.body

  if (!title || !html) {
    return reply.code(400).send({ error: 'Title and HTML content are required' })
  }

  try {
    const nextOrder = await ritualService.getNextOrder(collection)
    const result = await ritualService.saveDocument(collection, { title, group, html, order: nextOrder })
    return { _id: result.insertedId, message: 'Document created successfully' }
  } catch (err) {
    return reply.code(500).send({ error: 'Error saving document' })
  }
}

async function updateKinhNguyen(request, reply) {
  return updateDocumentByCollection.call(this, 'kinh-nguyen', request, reply)
}

async function updateDocumentByCollection(collectionName, request, reply) {
  const collection = this.mongo.db.collection(collectionName)
  const { _id, title, group, html } = request.body

  if (!_id || !title || !html) {
    return reply.code(400).send({ error: 'ID, Title, and HTML content are required' })
  }

  try {
    const result = await ritualService.updateDocument(collection, _id, { title, group, html }, this.mongo.ObjectId)
    if (result.matchedCount === 0) {
      return reply.code(404).send({ error: 'Document not found' })
    }
    return { _id, message: 'Document updated successfully' }
  } catch (err) {
    return reply.code(500).send({ error: 'Error updating document' })
  }
}

async function updateOrderByCollection(collectionName, request, reply) {
  const collection = this.mongo.db.collection(collectionName)
  const { order } = request.body

  if (!Array.isArray(order)) {
    return reply.code(400).send({ error: 'Order array is required' })
  }

  try {
    const outcome = await ritualService.updateOrder(collection, order, this.mongo.ObjectId)
    if (outcome.applied === 0) {
      return { message: 'No updates applied' }
    }
    return { message: 'Order updated successfully' }
  } catch (err) {
    return reply.code(500).send({ error: 'Error updating order' })
  }
}

async function updateNghiThucOrder(request, reply) {
  return updateOrderByCollection.call(this, 'nghi-thuc', request, reply)
}

async function updateKinhNguyenOrder(request, reply) {
  return updateOrderByCollection.call(this, 'kinh-nguyen', request, reply)
}

async function deleteByCollection(collectionName, request, reply) {
  const collection = this.mongo.db.collection(collectionName)
  const { _id } = request.body

  if (!_id) {
    return reply.code(400).send({ error: 'ID is required' })
  }

  try {
    const result = await ritualService.deleteDocument(collection, _id, this.mongo.ObjectId)
    if (result.deletedCount === 0) {
      return reply.code(404).send({ error: 'Document not found' })
    }
    return { message: 'Document deleted successfully' }
  } catch (err) {
    return reply.code(500).send({ error: 'Error deleting document' })
  }
}

async function deleteNghiThuc(request, reply) {
  return deleteByCollection.call(this, 'nghi-thuc', request, reply)
}

async function deleteKinhNguyen(request, reply) {
  return deleteByCollection.call(this, 'kinh-nguyen', request, reply)
}

async function updateNghiThuc(request, reply) {
  return updateDocumentByCollection.call(this, 'nghi-thuc', request, reply)
}

async function saveNghiThuc(request, reply) {
  return saveDocumentByCollection.call(this, 'nghi-thuc', request, reply)
}

module.exports = {
  listRituals,
  editRitual,
  saveRitual,
  deleteRitual,
  getNghiThuc,
  getKinhNguyen,
  listKinhNguyen,
  getKinhNguyenGrouped,
  getNghiThucGrouped,
  getLatestUpdatedAt,
  manageKinhNguyenPage,
  saveKinhNguyen,
  updateKinhNguyen,
  updateKinhNguyenOrder,
  deleteKinhNguyen,
  saveNghiThuc,
  updateNghiThuc,
  updateNghiThucOrder,
  deleteNghiThuc
}
