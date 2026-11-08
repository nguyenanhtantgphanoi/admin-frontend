'use strict'
const fastify = require('fastify')()
const path = require('node:path')
const { JSDOM } = require('jsdom');
const { exec } = require('child_process')
const mammoth = require('mammoth')
const cron = require('node-cron')
const {
  parseMongoObjectId,
  buildNgayLeUpdatePayload,
  updateNgayLeDocument
} = require('../services/holidayService')

const cron_tasks = []
class DOMParser {
  parseFromString(s, contentType = 'text/html') {
    return new JSDOM(s, { contentType }).window.document;
  }
}

function escapeHtml(value = '') {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function textToHtml(value) {
  return value
    .split(/\r?\n\r?\n/)
    .filter(block => block.trim() !== '')
    .map(block => `<p>${escapeHtml(block).replace(/\r?\n/g, '<br>')}</p>`)
    .join('\n')
}

const BAC_LE_SORT_ORDER = [
  'Canh thức vượt qua',
  'Tuần thánh',
  'Tiệc ly',
  'Bát nhật Phục sinh',
  'Trọng buộc',
  'Trọng',
  'Chúa Nhật',
  'Theo truyền thống',
  'Khởi đầu mùa chay',
  'Kính',
  'Nhớ (hoặc Kính)',
  'Nhớ buộc',
  'Nhớ',
  'Nhớ không buộc',
  'Thường'
]

const BAC_LE_ORDER_MAP = new Map(
  BAC_LE_SORT_ORDER.map((item, index) => [item.toLocaleLowerCase('vi-VN'), index])
)

function getBacLeSortIndex(bacLe) {
  if (typeof bacLe !== 'string') {
    return Number.MAX_SAFE_INTEGER
  }

  const normalized = bacLe.trim().toLocaleLowerCase('vi-VN')
  if (!normalized) {
    return Number.MAX_SAFE_INTEGER
  }

  return BAC_LE_ORDER_MAP.has(normalized)
    ? BAC_LE_ORDER_MAP.get(normalized)
    : Number.MAX_SAFE_INTEGER
}

function sortArrCacLeByBacLe(arrCacLe = []) {
  return arrCacLe
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
      const sortIndexA = getBacLeSortIndex(a.item && a.item.bac_le)
      const sortIndexB = getBacLeSortIndex(b.item && b.item.bac_le)

      if (sortIndexA !== sortIndexB) {
        return sortIndexA - sortIndexB
      }

      return a.index - b.index
    })
    .map((entry) => entry.item)
}

async function convertUploadedDocumentToHtml(file) {
  const extension = path.extname(file.filename || '').toLowerCase()
  const buffer = await file.toBuffer()

  if (!buffer || buffer.length === 0) {
    throw new Error('The uploaded file is empty.')
  }

  if (extension === '.docx') {
    const result = await mammoth.convertToHtml({ buffer })
    return {
      html: result.value,
      messages: result.messages || [],
      sourceType: 'docx'
    }
  }

  if (extension === '.html' || extension === '.htm') {
    return {
      html: buffer.toString('utf8'),
      messages: [],
      sourceType: 'html'
    }
  }

  if (extension === '.txt' || extension === '.md') {
    return {
      html: textToHtml(buffer.toString('utf8')),
      messages: [],
      sourceType: 'text'
    }
  }

  throw new Error('Unsupported file type. Upload a .docx, .html, .htm, .txt, or .md file.')
}


/**
 * After updating a ngay-le document, propagate its updatedAt value to all
 * lich-cong-giao documents whose `date` matches any value in the ngay-le's
 * `assigned_date` map.
 *
 * @param {object} db        - MongoDB db instance
 * @param {object} ObjectId  - MongoDB ObjectId constructor
 * @param {string} ngayLeId  - _id of the updated ngay-le document
 * @param {Date}   updatedAt - timestamp to propagate
 */
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

const rootController = require('../controllers/rootController')
const articleController = require('../controllers/articleController')
const contentController = require('../controllers/contentController')
const calendarController = require('../controllers/calendarController')
const ritualController = require('../controllers/ritualController')
const documentController = require('../controllers/documentController')
const notificationController = require('../controllers/notificationController')
const dataVersionController = require('../controllers/dataVersionController')

module.exports = async function (fastify, opts) {
  fastify.get('/', rootController.index)
  fastify.get('/helloworld', rootController.helloWorld)
  fastify.get('/ngay-le', rootController.getNgayLe)
  fastify.get('/admin', rootController.adminDashboard)
  fastify.get('/temp-man', rootController.tempMan)
  fastify.get('/showall-lich', rootController.showAllLich)
  fastify.get('/bien-tap-lich', rootController.bienTapLich)
  fastify.get('/bien-tap-ngay-le', rootController.bienTapNgayLe)
  fastify.get('/hc-dap-ca', rootController.hcDapCa)
  fastify.get('/hc-mua-chay', rootController.hcMuaChay)
  fastify.get('/update-ngay-le', rootController.updateNgayLe)


  fastify.get('/xoa-truong-', contentController.clearHolidayFields)
  fastify.get('/bien-tap-suy-niem', articleController.listArticles)
  fastify.get('/bien-tap-suy-niem-edit', articleController.editArticle)
  fastify.post('/save-article', articleController.saveArticle)
  fastify.post('/delete-article', articleController.deleteArticle)
  fastify.get('/bien-tap-ban-van', contentController.bienTapBanVanHandler)
  fastify.post('/bien-tap-ban-van', contentController.bienTapBanVanHandler)
  fastify.get('/bien-tap-ban-van--', contentController.crawlBanVan)
  fastify.get('/insert-lich/:jso', async function (request, reply) {
    const { jso } = request.params;
    return jso
    //const users = this.mongo.db.collection('lich-cong-giao')
  });
  fastify.get('/submitdata', async function (request, reply) {
    // Access the parsed JSON body
    const users = this.mongo.db.collection('lich-cong-giao')
    const { title, date, old_date, id_le_theo_mua_phung_vu, mau_ao_le } = request.query
    // console.log(`Name: ${title}, date: ${date}, id_le: ${id_le_theo_mua_phung_vu}, mau_ao_le: ${mau_ao_le}`)
    //let lich_cong_giao = this.mongo.db.collection('lich-cong-giao')
    
    let doc = {
      title:title,
      date:date,
      id_le_theo_mua_phung_vu: new this.mongo.ObjectId(id_le_theo_mua_phung_vu),
      mau_ao_le:mau_ao_le,
      updatedAt: new Date()
    }
    const normalizedOldDate = typeof old_date === 'string' ? old_date.trim() : ''
    const normalizedDate = typeof date === 'string' ? date.trim() : ''
    try{
      if (normalizedOldDate !== '') {
        if (normalizedDate === '') {
          const deleted = await users.deleteOne({ date: normalizedOldDate })
          if (deleted.deletedCount === 0) {
            reply.code(404)
            return { message: 'Không tìm thấy bản ghi theo old_date để xóa', data: title }
          }

          return { message: 'Data deleted!', data: title }
        }

        const updated = await users.updateOne(
          { date: normalizedOldDate },
          { $set: doc }
        )

        if (updated.matchedCount === 0) {
          reply.code(404)
          return { message: 'Không tìm thấy bản ghi theo old_date để cập nhật', data: title }
        }

        return { message: 'Data updated!', data: title }
      }

      await users.insertOne(doc)
      return { message: 'Data inserted!', data: title }
    }catch(err){
      return err
    }
  });
  fastify.get('/get-lich-cong-giao', async function (request, reply) {
    const users = this.mongo.db.collection('lich-cong-giao')
    // if the id is an ObjectId format, you need to create a new ObjectId
    //const id = this.mongo.ObjectId(req.params.id)
    try {
      const user = await users.find({}).toArray()
      return user
    } catch (err) {
      return err
    }
  });
  fastify.get('/get-lich-cong-giao-updated-at', async function (request, reply) {
    const lichCongGiao = this.mongo.db.collection('lich-cong-giao')
    const { date } = request.query

    if (!date) {
      return reply.code(400).send({ error: 'Missing required parameter: date' })
    }

    try {
      const doc = await lichCongGiao.findOne(
        { date: date },
        { projection: { _id: 0, date: 1, updatedAt: 1 } }
      )

      if (!doc) {
        return reply.code(404).send({ error: 'No lich-cong-giao document found for the provided date' })
      }

      return { updatedAt: doc.updatedAt || null }
    } catch (err) {
      return err
    }
  });
  fastify.get('/get-lich', async function (request, reply) {
    const tb_lich = this.mongo.db.collection('lich-cong-giao')

    const tb_ngayle = this.mongo.db.collection('ngay-le')
    // if the id is an ObjectId format, you need to create a new ObjectId
    //const id = this.mongo.ObjectId(req.params.id)
    const {_id} = request.query
    console.log(`${_id}`)
    try {
      const lich = await tb_lich.findOne({_id: new this.mongo.ObjectId(_id)})
      let n_date = new Date(lich.date)
      let query = {["assigned_date."+n_date.getFullYear()] : lich.date}
      
      const ngay_le_1 = await tb_ngayle.find({date: (n_date.getDate() >9?n_date.getDate():"0"+n_date.getDate())+"/"+(n_date.getMonth()+1 > 9? n_date.getMonth()+1: "0"+(n_date.getMonth()+1))}).toArray()
      const ngay_le_2 = await tb_ngayle.find(query).toArray()

      // console.log("---> "+(n_date.getDate() >9?n_date.getDate():"0"+n_date.getDate())+"/"+(n_date.getMonth()+1 > 9? n_date.getMonth()+1: "0"+(n_date.getMonth()+1)))
      console.log("Query 1 có: "+ngay_le_1.length)
      console.log("Query 2 có: "+ngay_le_2.length)
      
      
      // return {lich: lich, ngay_le: ngay_le_1.concat(ngay_le_2)}
      return {lich: lich, ngay_le: ngay_le_1.concat(ngay_le_2)}
    } catch (err) {
      return err
    }
  });
  fastify.get('/delete-ngay-lich', async function (request, reply) {
    const tb_lich = this.mongo.db.collection('lich-cong-giao')

    // const tb_ngayle = this.mongo.db.collection('ngay-le')
    // if the id is an ObjectId format, you need to create a new ObjectId
    //const id = this.mongo.ObjectId(req.params.id)
    const {_id} = request.query
    //console.log(`${_id}`)
    try {
      const lich = await tb_lich.deleteOne({_id: new this.mongo.ObjectId(_id)})            
      return {_id: _id}
    } catch (err) {
      return err
    }
  });
  fastify.get('/get-calendar', calendarController.getCalendar);
  fastify.get('/get-calendar-backup', async function (request, reply) {
    const tb_lich = this.mongo.db.collection('lich-cong-giao')
    const ngay_le = this.mongo.db.collection('ngay-le')
    const articlesCollection = this.mongo.db.collection('articles')

    // const tb_ngayle = this.mongo.db.collection('ngay-le')
    // if the id is an ObjectId format, you need to create a new ObjectId
    //const id = this.mongo.ObjectId(req.params.id)
    const {date} = request.query
    //console.log(`${_id}`)
    try {
      let cur_month = []  
      let prev_month = []    
      let next_month = []
      console.log(date)
      if(date != undefined){
        let d = new Date(date)
        let year = d.getFullYear()
        let month = d.getMonth()+1
        if(month < 10){
          month = "0"+month
        }

        let p_m = month
        let p_y = year
        if(p_m == 1){
          p_m = 12
          p_y--
        }else{
          p_m--
          if(p_m < 10){
            p_m = "0"+p_m
          }
        }

        let n_m = month
        let n_y = year
        if(n_m == 12){
          n_m = "01"
          n_y++
        }else{
          n_m++
          if(n_m < 10){
            n_m = "0"+n_m
          }
        }
        // console.log(year)
        // console.log(month)
        console.log(`^${year}-${month}-\d{2}`)
        //let reg = new RegExp(`^${year}-${month}-\d{2}`)
        cur_month = await tb_lich.find({date: {$regex: `^${year}-${month}-\\d{2}`}}).sort({date: 1}).toArray()
        prev_month = await tb_lich.find({date: {$regex: `^${p_y}-${p_m}-\\d{2}`}}).sort({date: 1}).toArray()
        next_month = await tb_lich.find({date: {$regex: `^${n_y}-${n_m}-\\d{2}`}}).sort({date: 1}).toArray()
        
        for (let index = 0; index < prev_month.length; index++) {
          const element = prev_month[index].date;
          let a_date = new Date(element)
          let arr_cac_le = await ngay_le.find({['assigned_date.'+a_date.getFullYear()]:element}).toArray()
          
          for (let j = 0; j < arr_cac_le.length; j++) {
            if((arr_cac_le[j].ban_van.bd1_chan_trich_tu != "" && arr_cac_le[j].ban_van.bd1_chan_trich_tu != undefined) && a_date.getFullYear()%2==0){
              arr_cac_le[j].ban_van.bd1_le = arr_cac_le[j].ban_van.bd1_chan
              arr_cac_le[j].ban_van.bd1_le_trich_tu = arr_cac_le[j].ban_van.bd1_chan_trich_tu
              arr_cac_le[j].ban_van.cau_bd1_le_tom_gon = arr_cac_le[j].ban_van.cau_bd1_chan_tom_gon

              arr_cac_le[j].ban_van.dap_ca_le_trich_tu = arr_cac_le[j].ban_van.dap_ca_chan_trich_tu
              arr_cac_le[j].ban_van.dap_ca_le = arr_cac_le[j].ban_van.dap_ca_chan

            }
            delete arr_cac_le[j].bai_viet
            // Fetch articles from reflections
            if(arr_cac_le[j].reflections && arr_cac_le[j].reflections.length > 0){
              try {
                const reflectionIds = arr_cac_le[j].reflections.map(id => new this.mongo.ObjectId(id))
                arr_cac_le[j].articles = await articlesCollection.find({_id: {$in: reflectionIds}}).toArray()
              } catch (err) {
                console.error('Error fetching articles for reflections:', err)
                arr_cac_le[j].articles = []
              }
            } else {
              arr_cac_le[j].articles = []
            }
            
          }
          arr_cac_le = sortArrCacLeByBacLe(arr_cac_le)
          prev_month[index].arr_cac_le = arr_cac_le
          
        }
        for (let index = 0; index < cur_month.length; index++) {
          const element = cur_month[index].date;
          let a_date = new Date(element)
          let arr_cac_le = await ngay_le.find({['assigned_date.'+a_date.getFullYear()]:element}).toArray()
          
          for (let j = 0; j < arr_cac_le.length; j++) {
            if((arr_cac_le[j].ban_van.bd1_chan_trich_tu != "" && arr_cac_le[j].ban_van.bd1_chan_trich_tu != undefined) && a_date.getFullYear()%2==0){
              arr_cac_le[j].ban_van.bd1_le = arr_cac_le[j].ban_van.bd1_chan
              arr_cac_le[j].ban_van.bd1_le_trich_tu = arr_cac_le[j].ban_van.bd1_chan_trich_tu
              arr_cac_le[j].ban_van.cau_bd1_le_tom_gon = arr_cac_le[j].ban_van.cau_bd1_chan_tom_gon

              arr_cac_le[j].ban_van.dap_ca_le_trich_tu = arr_cac_le[j].ban_van.dap_ca_chan_trich_tu
              arr_cac_le[j].ban_van.dap_ca_le = arr_cac_le[j].ban_van.dap_ca_chan

            }
            delete arr_cac_le[j].bai_viet
            // Fetch articles from reflections
            if(arr_cac_le[j].reflections && arr_cac_le[j].reflections.length > 0){
              try {
                const reflectionIds = arr_cac_le[j].reflections.map(id => new this.mongo.ObjectId(id))
                arr_cac_le[j].articles = await articlesCollection.find({_id: {$in: reflectionIds}}).toArray()
              } catch (err) {
                console.error('Error fetching articles for reflections:', err)
                arr_cac_le[j].articles = []
              }
            } else {
              arr_cac_le[j].articles = []
            }
            
          }
          arr_cac_le = sortArrCacLeByBacLe(arr_cac_le)
          cur_month[index].arr_cac_le = arr_cac_le
          prev_month.push(cur_month[index])
        }
        for (let index = 0; index < next_month.length; index++) {
          const element = next_month[index].date;
          let a_date = new Date(element)
          let arr_cac_le = await ngay_le.find({['assigned_date.'+a_date.getFullYear()]:element}).toArray()
          

          for (let j = 0; j < arr_cac_le.length; j++) {
            if((arr_cac_le[j].ban_van.bd1_chan_trich_tu != ""&& arr_cac_le[j].ban_van.bd1_chan_trich_tu != undefined) && a_date.getFullYear()%2==0){
              arr_cac_le[j].ban_van.bd1_le = arr_cac_le[j].ban_van.bd1_chan
              arr_cac_le[j].ban_van.bd1_le_trich_tu = arr_cac_le[j].ban_van.bd1_chan_trich_tu
              arr_cac_le[j].ban_van.cau_bd1_le_tom_gon = arr_cac_le[j].ban_van.cau_bd1_chan_tom_gon

              arr_cac_le[j].ban_van.dap_ca_le_trich_tu = arr_cac_le[j].ban_van.dap_ca_chan_trich_tu
              arr_cac_le[j].ban_van.dap_ca_le = arr_cac_le[j].ban_van.dap_ca_chan

            }
            delete arr_cac_le[j].bai_viet
            // Fetch articles from reflections
            if(arr_cac_le[j].reflections && arr_cac_le[j].reflections.length > 0){
              try {
                const reflectionIds = arr_cac_le[j].reflections.map(id => new this.mongo.ObjectId(id))
                arr_cac_le[j].articles = await articlesCollection.find({_id: {$in: reflectionIds}}).toArray()
              } catch (err) {
                console.error('Error fetching articles for reflections:', err)
                arr_cac_le[j].articles = []
              }
            } else {
              arr_cac_le[j].articles = []
            }
            // console.log(arr_cac_le[j].ban_van.bd1_le)
            
          }
          arr_cac_le = sortArrCacLeByBacLe(arr_cac_le)
          next_month[index].arr_cac_le = arr_cac_le
          prev_month.push(next_month[index])
          
        }
        
        return {cur_month: prev_month, prev_month: [], next_month: []}
      }else{
        reply.code(400).send({ error: 'Missing required parameter: date or month' });
      }                  
      
    } catch (err) {
      return err
    }
  });
  fastify.get('/get-calendar-for-web', async function (request, reply) {
    const tb_lich = this.mongo.db.collection('lich-cong-giao')
    const ngay_le = this.mongo.db.collection('ngay-le')

    // const tb_ngayle = this.mongo.db.collection('ngay-le')
    // if the id is an ObjectId format, you need to create a new ObjectId
    //const id = this.mongo.ObjectId(req.params.id)
    try {
      const d = new Date()

      const year = d.getFullYear()
      const monthNum = d.getMonth() + 1
      const month = monthNum < 10 ? '0' + monthNum : '' + monthNum

      let p_m = monthNum
      let p_y = year
      if (p_m === 1) {
        p_m = 12
        p_y--
      } else {
        p_m--
      }
      const prevMonth = p_m < 10 ? '0' + p_m : '' + p_m

      let n_m = monthNum
      let n_y = year
      if (n_m === 12) {
        n_m = 1
        n_y++
      } else {
        n_m++
      }
      const nextMonth = n_m < 10 ? '0' + n_m : '' + n_m

      const [cur_month, prev_month, next_month] = await Promise.all([
        tb_lich.find({ date: { $regex: `^${year}-${month}-\\d{2}` } }).sort({ date: 1 }).toArray(),
        tb_lich.find({ date: { $regex: `^${p_y}-${prevMonth}-\\d{2}` } }).sort({ date: 1 }).toArray(),
        tb_lich.find({ date: { $regex: `^${n_y}-${nextMonth}-\\d{2}` } }).sort({ date: 1 }).toArray()
      ])

      const allDays = [...prev_month, ...cur_month, ...next_month]
      if (allDays.length === 0) {
        return { data: [] }
      }

      const datesByYear = {}
      for (const day of allDays) {
        const dayDate = new Date(day.date)
        if (isNaN(dayDate)) {
          continue
        }
        const dayYear = dayDate.getFullYear()
        if (!datesByYear[dayYear]) {
          datesByYear[dayYear] = new Set()
        }
        datesByYear[dayYear].add(day.date)
      }

      const yearOrConditions = Object.entries(datesByYear).map(([dayYear, dateSet]) => ({
        [`assigned_date.${dayYear}`]: { $in: Array.from(dateSet) }
      }))

      const allNgayLe = yearOrConditions.length > 0
        ? await ngay_le.find({ $or: yearOrConditions }).toArray()
        : []

      const feastByDateYear = new Map()
      for (const feast of allNgayLe) {
        if (!feast.assigned_date) {
          continue
        }
        for (const [assignedYear, assignedDate] of Object.entries(feast.assigned_date)) {
          if (!datesByYear[assignedYear] || !datesByYear[assignedYear].has(assignedDate)) {
            continue
          }
          const mapKey = `${assignedYear}|${assignedDate}`
          if (!feastByDateYear.has(mapKey)) {
            feastByDateYear.set(mapKey, [])
          }
          feastByDateYear.get(mapKey).push(feast)
        }
      }

      const buildArrCacLeForDay = (day) => {
        const dayDate = new Date(day.date)
        if (isNaN(dayDate)) {
          return []
        }

        const dayYear = dayDate.getFullYear()
        const mapKey = `${dayYear}|${day.date}`
        const matchedFeasts = feastByDateYear.get(mapKey) || []
        const arr_cac_le = []

        for (const sourceFeast of matchedFeasts) {
          const sourceBanVan = sourceFeast.ban_van || {}
          const { assigned_date, ...feastWithoutAssignedDate } = sourceFeast
          const feast = { ...feastWithoutAssignedDate, ban_van: {} }
          let bd1LeTrichTu = sourceBanVan.bd1_le_trich_tu
          let dapCaLeTrichTu = sourceBanVan.dap_ca_le_trich_tu
          const hasChanBanVan = sourceBanVan.bd1_chan_trich_tu != '' && sourceBanVan.bd1_chan_trich_tu != undefined
          if (hasChanBanVan && dayYear % 2 === 0) {
            bd1LeTrichTu = sourceBanVan.bd1_chan_trich_tu
            dapCaLeTrichTu = sourceBanVan.dap_ca_chan_trich_tu
          }

          feast.ban_van = {
            bd1_le_trich_tu: bd1LeTrichTu,
            dap_ca_le_trich_tu: dapCaLeTrichTu,
            bd2_trich_tu: sourceBanVan.bd2_trich_tu,
            phuc_am_trich_tu: sourceBanVan.phuc_am_trich_tu,
            cau_phuc_am_tom_gon: sourceBanVan.cau_phuc_am_tom_gon,
            url: sourceBanVan.url
          }

          delete feast.bai_viet

          arr_cac_le.push(feast)
        }

        return sortArrCacLeByBacLe(arr_cac_le)
      }

      for (const day of allDays) {
        day.arr_cac_le = buildArrCacLeForDay(day)
      }

      return { data: allDays }
    } catch (err) {
      return err
    }
  });
  fastify.get('/get-one-day', calendarController.getOneDay);
  fastify.get('/get-calendar-year', calendarController.getCalendarYear);
  fastify.post('/update-ngay-lich', async function (request, reply) {
    const tb_lich = this.mongo.db.collection('lich-cong-giao')

    // const tb_ngayle = this.mongo.db.collection('ngay-le')
    // if the id is an ObjectId format, you need to create a new ObjectId
    //const id = this.mongo.ObjectId(req.params.id)
    const {_id, title, url, mua_phung_vu, bac_le, mau_ao_le, bd_1, bd_2, dap_ca, alleluia, tin_mung, cau_loi_chua, xu_chau_luot, luu_y, under_title} = request.body
    //console.log(`${_id}`)
    let update_data = {
      title: title,
      url: url,
      mua_phung_vu: mua_phung_vu,
      bac_le: bac_le,
      mau_ao_le: mau_ao_le,
      bd_1: bd_1,
      bd_2: bd_2,
      dap_ca: dap_ca,
      alleluia: alleluia,
      tin_mung: tin_mung,
      cau_loi_chua: cau_loi_chua,
      xu_chau_luot: xu_chau_luot,
      luu_y: luu_y,
      under_title: under_title,
      updatedAt: new Date()
    }
    try {
      // console.log(update_data)
      await tb_lich.updateOne({_id: new this.mongo.ObjectId(_id)}, {$set: update_data})            
      return {_id: _id}
    } catch (err) {
      return err
    }
  });

  fastify.get('/update-bien-tap-ngay-le', async function (request, reply) {
    const tb_ngay_le = this.mongo.db.collection('ngay-le')

    // const tb_ngayle = this.mongo.db.collection('ngay-le')
    // if the id is an ObjectId format, you need to create a new ObjectId
    //const id = this.mongo.ObjectId(req.params.id)
    const {_id, title, date, week, season, bac_le, mau_ao_le, ban_van, assigned_date} = request.query
    //console.log(`${_id}`)
    let d = new Date(assigned_date)
    let y = d.getFullYear()
    let update_data = {
      title: title,
      date: date,
      week: week,
      season: season,
      bac_le: bac_le,
      mau_ao_le: mau_ao_le,
      ban_van: ban_van,
      ['assigned_date.'+y]: assigned_date
    }
    try {
      console.log(update_data)
      //await tb_ngay_le.updateOne({_id: new this.mongo.ObjectId(_id)}, {$set: update_data})            
      return {update_data: update_data}
    } catch (err) {
      return err
    }
  });
  fastify.get('/nghi-thuc-edit', ritualController.editRitual);
  fastify.get('/kinh-nguyen-edit', async function (request, reply) {
    try {
      return reply.viewWithLayout('nghi-thuc/kinh-nguyen-edit.ejs', { title: 'Manage Kinh Nguyen' })
    } catch (err) {
      return err
    }
  });
  fastify.get('/save-code', async function (request, reply) {
    
    try{
      return reply.view('nghi-thuc/save-code.ejs')
    }catch(err){
      return err
    }
  });
  fastify.get('/get-nghi-thuc', ritualController.getNghiThuc)
  fastify.get('/get-kinh-nguyen', ritualController.getKinhNguyen)
  fastify.get('/get-kinh-nguyen-grouped', ritualController.getKinhNguyenGrouped)
  fastify.get('/get-kinh-nguyen-latest-updated-at', ritualController.getLatestUpdatedAt('kinh-nguyen', 'kinh-nguyen'))
  fastify.get('/get-nghi-thuc-grouped', ritualController.getNghiThucGrouped)
  fastify.get('/get-nghi-thuc-latest-updated-at', ritualController.getLatestUpdatedAt('nghi-thuc', 'nghi-thuc'))
  fastify.get('/manage-nghi-thuc', ritualController.listRituals)

  fastify.get('/manage-kinh-nguyen', ritualController.manageKinhNguyenPage)

  fastify.get('/document-to-html', documentController.documentToHtmlPage)

  fastify.get('/cgkpv', async function (request, reply) {
    try {
      return reply.viewWithLayout('admin/cgkpv.ejs', {
        title: 'CGKPV'
      })
    } catch (err) {
      return err
    }
  })

  fastify.post('/document-to-html/convert', documentController.convertDocument)

  fastify.post('/save-nghi-thuc', ritualController.saveNghiThuc)
  fastify.post('/update-nghi-thuc', ritualController.updateNghiThuc)
  fastify.post('/update-nghi-thuc-order', ritualController.updateNghiThucOrder)
  fastify.post('/delete-nghi-thuc', ritualController.deleteNghiThuc)

  fastify.post('/save-kinh-nguyen', ritualController.saveKinhNguyen)
  fastify.post('/update-kinh-nguyen', ritualController.updateKinhNguyen)
  fastify.post('/update-kinh-nguyen-order', ritualController.updateKinhNguyenOrder)
  fastify.post('/delete-kinh-nguyen', ritualController.deleteKinhNguyen)

  fastify.get('/notification', notificationController.notificationPage)

  fastify.post('/push-notif', notificationController.pushNotification)

  fastify.get('/data-version-manager', dataVersionController.dataVersionPage)
  fastify.options('/api/data-versions', dataVersionController.preflightDataVersions)
  fastify.options('/api/data-versions/purge', dataVersionController.preflightDataVersions)
  fastify.options('/api/data-versions/purge-all', dataVersionController.preflightDataVersions)
  fastify.get('/api/data-versions', dataVersionController.getDataVersions)
  fastify.post('/api/data-versions/purge', dataVersionController.purgeDataVersions)
  fastify.post('/api/data-versions/purge-all', dataVersionController.purgeAllDataVersions)
  fastify.options('/data-versions', dataVersionController.preflightDataVersions)
  fastify.options('/data-versions/purge', dataVersionController.preflightDataVersions)
  fastify.options('/data-versions/purge-all', dataVersionController.preflightDataVersions)
  fastify.get('/data-versions', dataVersionController.getDataVersions)
  fastify.post('/data-versions/purge', dataVersionController.purgeDataVersions)
  fastify.post('/data-versions/purge-all', dataVersionController.purgeAllDataVersions)

  fastify.addHook('onClose', async () => {
    notificationController.cleanupCronTasks()
  })

  fastify.get('/add-cronj', notificationController.addCronJob)
  fastify.get('/get-quick-utilities', notificationController.getQuickUtilities)
  fastify.get('/get-quick-utilities-v2', notificationController.getQuickUtilitiesV2)

}
function removeVietnameseTones(str) {
    str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g,"a"); 
    str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g,"e"); 
    str = str.replace(/ì|í|ị|ỉ|ĩ/g,"i"); 
    str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g,"o"); 
    str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g,"u"); 
    str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g,"y"); 
    str = str.replace(/đ/g,"d");
    str = str.replace(/À|Á|Ạ|Ả|Ã|Â|Ầ|Ấ|Ậ|Ẩ|Ẫ|Ă|Ằ|Ắ|Ặ|Ẳ|Ẵ/g, "A");
    str = str.replace(/È|É|Ẹ|Ẻ|Ẽ|Ê|Ề|Ế|Ệ|Ể|Ễ/g, "E");
    str = str.replace(/Ì|Í|Ị|Ỉ|Ĩ/g, "I");
    str = str.replace(/Ò|Ó|Ọ|Ỏ|Õ|Ô|Ồ|Ố|Ộ|Ổ|Ỗ|Ơ|Ờ|Ớ|Ợ|Ở|Ỡ/g, "O");
    str = str.replace(/Ù|Ú|Ụ|Ủ|Ũ|Ư|Ừ|Ứ|Ự|Ử|Ữ/g, "U");
    str = str.replace(/Ỳ|Ý|Ỵ|Ỷ|Ỹ/g, "Y");
    str = str.replace(/Đ/g, "D");
    // Some system encode vietnamese combining accent as individual utf-8 characters
    // Một vài bộ encode coi các dấu mũ, dấu chữ như một kí tự riêng biệt nên thêm hai dòng này
    str = str.replace(/\u0300|\u0301|\u0303|\u0309|\u0323/g, ""); // ̀ ́ ̃ ̉ ̣  huyền, sắc, ngã, hỏi, nặng
    str = str.replace(/\u02C6|\u0306|\u031B/g, ""); // ˆ ̆ ̛  Â, Ê, Ă, Ơ, Ư
    // Remove extra spaces
    // Bỏ các khoảng trắng liền nhau
    str = str.replace(/ + /g," ");
    str = str.trim();
    // Remove punctuations
    // Bỏ dấu câu, kí tự đặc biệt
    str = str.replace(/!|@|%|\^|\*|\(|\)|\+|\=|\<|\>|\?|\/|,|\.|\:|\;|\'|\"|\&|\#|\[|\]|~|\$|_|`|-|{|}|\||\\/g," ");
    // console.log(str)
    return str;
}

// fastify.listen({ port: 3000, host: "0.0.0.0" }, err => {
//   if (err) throw err
// })