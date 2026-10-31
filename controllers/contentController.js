'use strict'

const { parseMongoObjectId } = require('../helpers/validation')

async function clearHolidayFields(request, reply) {
  const ngayle = this.mongo.db.collection('ngay-le')
  const { _id } = request.query

  if (!_id) {
    return reply.code(400).send({ success: false, message: 'Missing _id' })
  }

  try {
    const docId = parseMongoObjectId(_id, { label: '_id' })
    const _updatedAt = new Date()

    await ngayle.updateMany(
      { _id: new this.mongo.ObjectId(docId) },
      {
        $unset: {
          'ban_van.Dẫn vào Thánh Lễ': '',
          'ban_van.Ca nhập lễ': '',
          'ban_van.Lời nguyện nhập lễ': '',
          'ban_van.Bài Ðọc I:': '',
          'ban_van.Ðáp Ca:': '',
          'ban_van.Bài Ðọc II:': '',
          'ban_van.Alleluia:': '',
          'ban_van.Phúc Âm:': '',
          'ban_van.Lời nguyện tín hữu': '',
          'ban_van.Lời nguyện tiến lễ': '',
          'ban_van.Ca hiệp lễ': '',
          'ban_van.Lời nguyện hiệp lễ': ''
        },
        $set: { updatedAt: _updatedAt }
      }
    )

    await propagateUpdatedAtToLich(this.mongo.db, this.mongo.ObjectId, docId, _updatedAt)
    return { success: true }
  } catch (err) {
    return reply.code(400).send({ success: false, message: err.message })
  }
}

async function bienTapBanVanHandler(request, reply) {
  const ngayle = this.mongo.db.collection('ngay-le')
  const payload = request.method === 'POST' ? (request.body || {}) : (request.query || {})

  if (!('_id' in payload)) {
    return reply.viewWithLayout('admin/bien-tap-ban-van.ejs', { u: null })
  }

  const updateableFields = [
    'dan_vao_thanh_le',
    'ca_nhap_le',
    'loi_nguyen_nhap_le',
    'bd1_le_trich_tu',
    'cau_bd1_le_tom_gon',
    'bd1_le',
    'dap_ca_le_trich_tu',
    'dap_ca_le',
    'bd1_chan_trich_tu',
    'cau_bd1_chan_tom_gon',
    'bd1_chan',
    'dap_ca_chan_trich_tu',
    'dap_ca_chan',
    'bd2_trich_tu',
    'cau_bd2_tom_gon',
    'bd2',
    'alleluia_trich_tu',
    'alleluia',
    'phuc_am_trich_tu',
    'cau_phuc_am_tom_gon',
    'phuc_am',
    'loi_nguyen_tin_huu',
    'loi_nguyen_tien_le',
    'ca_hiep_le',
    'loi_nguyen_hiep_le',
    'kinh_tien_tung'
  ]

  const banVanUpdates = {}
  for (const field of updateableFields) {
    if (field in payload) {
      banVanUpdates[`ban_van.${field}`] = payload[field]
    }
  }

  try {
    if (Object.keys(banVanUpdates).length > 0) {
      const _updatedAt = new Date()
      banVanUpdates.updatedAt = _updatedAt
      await ngayle.updateOne(
        { _id: new this.mongo.ObjectId(payload._id) },
        { $set: banVanUpdates }
      )
      await propagateUpdatedAtToLich(this.mongo.db, this.mongo.ObjectId, payload._id, _updatedAt)
    }

    const doc = await ngayle.findOne({ _id: new this.mongo.ObjectId(payload._id) })

    if ('is_ajax' in payload) {
      return { message: 'Server message: Update Successful' }
    }

    return reply.viewWithLayout('admin/bien-tap-ban-van.ejs', { u: doc })
  } catch (err) {
    return err
  }
}

async function crawlBanVan(request, reply) {
  const ngayle = this.mongo.db.collection('ngay-le')
  const { _id } = request.query

  if (!_id) {
    return reply.view('admin/bien-tap-ban-van.ejs')
  }

  try {
    const doc = await ngayle.findOne({ _id: new this.mongo.ObjectId(_id) })
    if (!doc) {
      return reply.view('admin/bien-tap-ban-van.ejs')
    }

    const dan_vao_thanh_le = doc.ban_van && doc.ban_van['Dẫn vào Thánh Lễ']
    const ca_nhap_le = doc.ban_van && doc.ban_van['Ca nhập lễ']
    const loi_nguyen_nhap_le = doc.ban_van && doc.ban_van['Lời nguyện nhập lễ']
    const bd1_le = doc.ban_van && doc.ban_van['Bài Ðọc I:']
    const dap_ca_le = doc.ban_van && doc.ban_van['Ðáp Ca:']
    const bd2 = doc.ban_van && doc.ban_van['Bài Ðọc II:']
    const alleluia = doc.ban_van && doc.ban_van['Alleluia:']
    const phuc_am = doc.ban_van && doc.ban_van['Phúc Âm:']
    const loi_nguyen_tin_huu = doc.ban_van && doc.ban_van['Lời nguyện tín hữu']
    const loi_nguyen_tien_le = doc.ban_van && doc.ban_van['Lời nguyện tiến lễ']
    const ca_hiep_le = doc.ban_van && doc.ban_van['Ca hiệp lễ']
    const loi_nguyen_hiep_le = doc.ban_van && doc.ban_van['Lời nguyện hiệp lễ']

    if (dan_vao_thanh_le) doc.ban_van.dan_vao_thanh_le = dan_vao_thanh_le.replace(/<p[^>]*>[\s\S]*?<\/p>/, '').replace('<p>', '').replace('</p>', '')
    if (ca_nhap_le) doc.ban_van.ca_nhap_le = ca_nhap_le.replace(/<p[^>]*>[\s\S]*?<\/p>/, '').replace('<p>', '').replace('</p>', '')
    if (loi_nguyen_nhap_le) doc.ban_van.loi_nguyen_nhap_le = loi_nguyen_nhap_le.replace(/<p[^>]*>[\s\S]*?<\/p>/, '')

    const document = new (require('jsdom').JSDOM)('', 'text/html').window.document
    const div = document.createElement('div')

    if (bd1_le) {
      div.innerHTML = bd1_le
      const f_p = div.getElementsByTagName('p')
      doc.ban_van.bd1_le_trich_tu = f_p[0].textContent.split(':')[1]
      doc.ban_van.cau_bd1_le_tom_gon = f_p[1].textContent
      div.removeChild(f_p[1])
      div.removeChild(f_p[0])
      let lastIndex = -1
      for (let i = 0; i < f_p.length; i += 1) {
        const element = f_p[i]
        if (element.textContent.match(/Ðó là lời Chúa/gi) !== null) {
          lastIndex = i
          break
        }
      }
      const divX = document.createElement('div')
      if (lastIndex < div.getElementsByTagName('p').length - 1) {
        while (div.getElementsByTagName('p').length > lastIndex + 1) {
          divX.appendChild(f_p[lastIndex + 1])
        }
        doc.ban_van.cau_bd1_chan_tom_gon = divX.getElementsByTagName('p')[0].textContent
        divX.removeChild(divX.getElementsByTagName('p')[0])
        doc.ban_van.bd1_chan = divX.innerHTML
      }
      doc.ban_van.bd1_le = div.innerHTML
    }

    if (dap_ca_le) {
      div.innerHTML = dap_ca_le
      const f_p = div.getElementsByTagName('p')
      doc.ban_van.dap_ca_le_trich_tu = f_p[0].textContent.split(':')[1]
      div.removeChild(f_p[0])
      doc.ban_van.dap_ca_le = div.innerHTML
    }

    if (bd2) {
      div.innerHTML = bd2
      const f_p = div.getElementsByTagName('p')
      doc.ban_van.bd2_trich_tu = f_p[0].textContent.split(':')[1]
      doc.ban_van.cau_bd2_tom_gon = f_p[1].textContent
      div.removeChild(f_p[1])
      div.removeChild(f_p[0])
      doc.ban_van.bd2 = div.innerHTML
    }

    if (alleluia) {
      div.innerHTML = alleluia
      const f_p = div.getElementsByTagName('p')
      doc.ban_van.alleluia_trich_tu = f_p[0].textContent.split(':')[1]
      div.removeChild(f_p[0])
      doc.ban_van.alleluia = div.innerHTML
    }

    if (phuc_am) {
      div.innerHTML = phuc_am
      const f_p = div.getElementsByTagName('p')
      doc.ban_van.phuc_am_trich_tu = f_p[0].textContent.split(':')[1]
      doc.ban_van.cau_phuc_am_tom_gon = f_p[1].textContent
      div.removeChild(f_p[1])
      div.removeChild(f_p[0])
      doc.ban_van.phuc_am = div.innerHTML
    }

    if (loi_nguyen_tin_huu) {
      div.innerHTML = loi_nguyen_tin_huu
      const f_p = div.getElementsByTagName('p')
      div.removeChild(f_p[0])
      doc.ban_van.loi_nguyen_tin_huu = div.innerHTML
    }

    if (loi_nguyen_tien_le) {
      div.innerHTML = loi_nguyen_tien_le
      const f_p = div.getElementsByTagName('p')
      div.removeChild(f_p[0])
      doc.ban_van.loi_nguyen_tien_le = div.innerHTML
    }

    if (ca_hiep_le) {
      div.innerHTML = ca_hiep_le
      const f_p = div.getElementsByTagName('p')
      div.removeChild(f_p[0])
      doc.ban_van.ca_hiep_le = div.textContent
    }

    if (loi_nguyen_hiep_le) {
      div.innerHTML = loi_nguyen_hiep_le
      const f_p = div.getElementsByTagName('p')
      div.removeChild(f_p[0])
      doc.ban_van.loi_nguyen_hiep_le = div.innerHTML
    }

    const _updatedAt = new Date()
    doc.updatedAt = _updatedAt
    await ngayle.updateOne({ _id: new this.mongo.ObjectId(_id) }, { $set: doc })
    await propagateUpdatedAtToLich(this.mongo.db, this.mongo.ObjectId, _id, _updatedAt)
    return reply.view('admin/bien-tap-ban-van.ejs', { u: doc })
  } catch (err) {
    return err
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
  clearHolidayFields,
  bienTapBanVanHandler,
  crawlBanVan
}
