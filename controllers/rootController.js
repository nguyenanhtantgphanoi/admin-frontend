'use strict'

const {
  parseMongoObjectId,
  buildNgayLeUpdatePayload,
  updateNgayLeDocument
} = require('../services/holidayService')

async function index(request, reply) {
  return reply.viewWithLayout('index.ejs', { title: 'Truyền Thông TGP Hà Nội Admin' })
}

async function helloWorld(request, reply) {
  return reply.viewWithLayout('admin/test-dynamic-field.ejs')
}

async function getNgayLe(req, reply) {
  const users = this.mongo.db.collection('lich-cong-giao')

  try {
    return await users.find({}).toArray()
  } catch (err) {
    return err
  }
}

async function adminDashboard(request, reply) {
  const users = this.mongo.db.collection('ngay-le')

  try {
    const alluser = await users.find({}).toArray()
    return reply.viewWithLayout('admin/index.ejs', { numofuser: alluser })
  } catch (err) {
    return err
  }
}

async function tempMan(request, reply) {
  const users = this.mongo.db.collection('ngay-le')

  try {
    const alluser = await users.find({}).toArray()
    const r = alluser.map((doc) => ({
      ...doc,
      _id: doc && doc._id ? String(doc._id) : '',
      title: doc && doc.title ? String(doc.title) : '',
      mau_ao_le: doc && doc.mau_ao_le ? String(doc.mau_ao_le) : ''
    }))

    return reply.view('admin/temp-man.ejs', { numofuser: r })
  } catch (err) {
    request.log.error({ err }, 'Failed to render temp-man page')
    return reply.code(500).send({ success: false, message: 'Không thể tải trang quản lý ngày lễ' })
  }
}

async function showAllLich(request, reply) {
  const users = this.mongo.db.collection('lich-cong-giao')
  const { fromDate } = request.query

  try {
    const alluser = await users.find({}).sort({ date: 1 }).toArray()
    const startDate = fromDate ? new Date(`${fromDate}T00:00:00`) : null
    const filtered = !startDate || Number.isNaN(startDate.getTime())
      ? alluser
      : alluser.filter((item) => {
          if (!item || !item.date) return false
          const itemDate = new Date(item.date)
          return !Number.isNaN(itemDate.getTime()) && itemDate >= startDate
        })

    return reply.viewWithLayout('admin/showall-lich-cong-giao.ejs', {
      lich: filtered,
      startDate: fromDate || ''
    })
  } catch (err) {
    return err
  }
}

async function bienTapLich(request, reply) {
  return reply.view('admin/showall-lich-cong-giao.ejs', { lich: [] })
}

async function bienTapNgayLe(request, reply) {
  const ngayle = this.mongo.db.collection('ngay-le')

  try {
    const col = await ngayle.find({}).toArray()
    return reply.viewWithLayout('admin/bien-tap-ngay-le.ejs', { ngay_le: col })
  } catch (err) {
    return err
  }
}

async function hcDapCa(request, reply) {
  const ngayle = this.mongo.db.collection('ngay-le')

  try {
    const col = await ngayle.find({}).toArray()
    return reply.viewWithLayout('admin/hc-dap-ca.ejs', { ngay_le: col })
  } catch (err) {
    return err
  }
}

async function hcMuaChay(request, reply) {
  const ngayle = this.mongo.db.collection('ngay-le')

  try {
    const col = await ngayle.find({}).toArray()
    return reply.viewWithLayout('admin/hc-mua-chay.ejs', { ngay_le: col })
  } catch (err) {
    return err
  }
}

async function updateNgayLe(request, reply) {
  const collection = this.mongo.db.collection('ngay-le')
  const { _id, title, date, assigned_date, week, season, url, bac_le, mau_ao_le } = request.query

  if (!_id) {
    return reply.code(400).send({ success: false, message: 'Thiếu _id' })
  }

  let objectId
  try {
    objectId = new this.mongo.ObjectId(parseMongoObjectId(_id, { label: '_id' }))
  } catch (err) {
    return reply.code(400).send({ success: false, message: 'ID không hợp lệ', error: err.message })
  }

  let existingDoc
  try {
    existingDoc = await collection.findOne({ _id: objectId })
  } catch (err) {
    return reply.code(500).send({ success: false, message: 'Không thể đọc dữ liệu ngày lễ', error: err.message })
  }

  if (!existingDoc) {
    return reply.code(404).send({ success: false, message: 'Không tìm thấy ngày lễ' })
  }

  const payload = buildNgayLeUpdatePayload({
    existingDoc,
    title,
    date,
    assigned_date,
    week,
    season,
    url,
    bac_le,
    mau_ao_le
  })

  try {
    await updateNgayLeDocument({
      collection,
      mongoObjectId: this.mongo.ObjectId,
      documentId: _id,
      payload
    })
    await propagateUpdatedAtToLich(this.mongo.db, this.mongo.ObjectId, _id, payload.updatedAt)
  } catch (err) {
    return reply.code(500).send({ success: false, message: 'Không thể cập nhật ngày lễ', error: err.message })
  }

  return { success: true, message: 'Data received!', data: payload }
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
  index,
  helloWorld,
  getNgayLe,
  adminDashboard,
  tempMan,
  showAllLich,
  bienTapLich,
  bienTapNgayLe,
  hcDapCa,
  hcMuaChay,
  updateNgayLe
}
