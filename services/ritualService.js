'use strict'

function removeVietnameseTones(str = '') {
  let next = String(str)
    .replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, 'a')
    .replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, 'e')
    .replace(/ì|í|ị|ỉ|ĩ/g, 'i')
    .replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, 'o')
    .replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, 'u')
    .replace(/ỳ|ý|ỵ|ỷ|ỹ/g, 'y')
    .replace(/đ/g, 'd')
    .replace(/À|Á|Ạ|Ả|Ã|Â|Ầ|Ấ|Ậ|Ẩ|Ẫ|Ă|Ằ|Ắ|Ặ|Ẳ|Ẵ/g, 'A')
    .replace(/È|É|Ẹ|Ẻ|Ẽ|Ê|Ề|Ế|Ệ|Ể|Ễ/g, 'E')
    .replace(/Ì|Í|Ị|Ỉ|Ĩ/g, 'I')
    .replace(/Ò|Ó|Ọ|Ỏ|Õ|Ô|Ồ|Ố|Ộ|Ổ|Ỗ|Ơ|Ờ|Ớ|Ợ|Ở|Ỡ/g, 'O')
    .replace(/Ù|Ú|Ụ|Ủ|Ũ|Ư|Ừ|Ứ|Ự|Ử|Ữ/g, 'U')
    .replace(/Ỳ|Ý|Ỵ|Ỷ|Ỹ/g, 'Y')
    .replace(/Đ/g, 'D')
    .replace(/\u0300|\u0301|\u0303|\u0309|\u0323/g, '')
    .replace(/\u02C6|\u0306|\u031B/g, '')
    .replace(/ + /g, ' ')
    .trim()

  return next.replace(/!|@|%|\^|\*|\(|\)|\+|\=|\<|\>|\?|\/|,|\.|\:|\;|'|"|&|#|\[|\]|~|\$|_|`|-|\{|\}|\||\\/g, ' ')
}

async function listDocuments(collection, sort = { order: 1, createdAt: 1, _id: 1 }) {
  return collection.find({}).sort(sort).toArray()
}

function groupByTitleOrGroup(items) {
  const grouped = {}

  items.forEach((element, index) => {
    let key = element.group

    if (key !== undefined && key !== null && String(key).trim() !== '') {
      key = removeVietnameseTones(key)
      key = key.toLowerCase().replace(/[^a-z0-9 -]/g, '').replace(/\s+/g, '_').replace(/-+/g, '_')

      if (!grouped[key]) {
        grouped[key] = { data: [], level: 1, title: element.group, _id: index }
      }

      const groupDoc = { ...element }
      delete groupDoc.group
      grouped[key].data.push(groupDoc)
      return
    }

    const itemKey = removeVietnameseTones(element.title || '')
      .toLowerCase()
      .replace(/[^a-z0-9 -]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')

    grouped[itemKey] = {
      data: [element],
      level: 0,
      title: element.title,
      _id: index
    }
  })

  return grouped
}

async function getLatestUpdatedAt(collection, label) {
  const latestDoc = await collection.findOne(
    {},
    { sort: { updatedAt: -1 }, projection: { _id: 0, updatedAt: 1 } }
  )

  if (!latestDoc || !latestDoc.updatedAt) {
    const error = new Error(`No ${label} documents found or updatedAt field is missing`)
    error.statusCode = 404
    throw error
  }

  return { updatedAt: latestDoc.updatedAt }
}

async function getNextOrder(collection) {
  const [maxOrderDoc] = await collection
    .find({ order: { $type: 'number' } })
    .sort({ order: -1 })
    .limit(1)
    .toArray()

  if (maxOrderDoc && Number.isFinite(maxOrderDoc.order)) {
    return maxOrderDoc.order + 1
  }

  return collection.countDocuments()
}

async function saveDocument(collection, payload) {
  const document = {
    title: payload.title,
    group: payload.group || null,
    html: payload.html,
    order: payload.order,
    createdAt: new Date(),
    updatedAt: new Date()
  }

  return collection.insertOne(document)
}

async function updateDocument(collection, id, payload, ObjectId) {
  const result = await collection.updateOne(
    { _id: new ObjectId(id) },
    {
      $set: {
        title: payload.title,
        group: payload.group || null,
        html: payload.html,
        updatedAt: new Date()
      }
    }
  )

  return result
}

async function updateOrder(collection, orderList, ObjectId) {
  const operations = orderList
    .filter((item) => item && item._id)
    .map((item) => ({
      updateOne: {
        filter: { _id: new ObjectId(item._id) },
        update: {
          $set: {
            order: Number.isFinite(item.order) ? item.order : 0,
            updatedAt: new Date()
          }
        }
      }
    }))

  if (operations.length === 0) {
    return { applied: 0 }
  }

  await collection.bulkWrite(operations)
  return { applied: operations.length }
}

async function deleteDocument(collection, id, ObjectId) {
  return collection.deleteOne({ _id: new ObjectId(id) })
}

module.exports = {
  removeVietnameseTones,
  groupByTitleOrGroup,
  listDocuments,
  getLatestUpdatedAt,
  getNextOrder,
  saveDocument,
  updateDocument,
  updateOrder,
  deleteDocument
}
