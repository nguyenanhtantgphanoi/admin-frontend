'use strict'

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

function getBacLeSortIndex (bacLe) {
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

async function getCalendar(request, reply) {
  const tb_lich = this.mongo.db.collection('lich-cong-giao')
  const ngay_le = this.mongo.db.collection('ngay-le')
  const articlesCollection = this.mongo.db.collection('articles')
  const { date } = request.query

  try {
    if (date == undefined) {
      return reply.code(400).send({ error: 'Missing required parameter: date' })
    }

    const toDateStr = (d) => {
      const y = d.getFullYear()
      const m = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      return `${y}-${m}-${day}`
    }

    const center = new Date(date)
    const startDate = new Date(center)
    startDate.setDate(startDate.getDate() - 7)
    const endDate = new Date(center)
    endDate.setDate(endDate.getDate() + 14)

    const startStr = toDateStr(startDate)
    const endStr = toDateStr(endDate)

    const windowDays = await tb_lich.find({
      date: { $gte: startStr, $lte: endStr }
    }).sort({ date: 1 }).toArray()

    for (const dayRecord of windowDays) {
      const dayValue = new Date(dayRecord.date)
      let arrCacLe = await ngay_le.find({ ['assigned_date.' + dayValue.getFullYear()]: dayRecord.date }).toArray()

      for (const item of arrCacLe) {
        if ((item.ban_van && item.ban_van.bd1_chan_trich_tu !== '' && item.ban_van.bd1_chan_trich_tu !== undefined) && dayValue.getFullYear() % 2 === 0) {
          item.ban_van.bd1_le = item.ban_van.bd1_chan
          item.ban_van.bd1_le_trich_tu = item.ban_van.bd1_chan_trich_tu
          item.ban_van.cau_bd1_le_tom_gon = item.ban_van.cau_bd1_chan_tom_gon
          item.ban_van.dap_ca_le_trich_tu = item.ban_van.dap_ca_chan_trich_tu
          item.ban_van.dap_ca_le = item.ban_van.dap_ca_chan
        }

        delete item.bai_viet

        if (item.reflections && item.reflections.length > 0) {
          try {
            const reflectionIds = item.reflections.map((id) => new this.mongo.ObjectId(id))
            item.articles = await articlesCollection.find({ _id: { $in: reflectionIds } }).toArray()
          } catch (err) {
            item.articles = []
          }
        } else {
          item.articles = []
        }
      }

      arrCacLe = arrCacLe
        .map((item, index) => ({ item, index }))
        .sort((a, b) => {
          const sortIndexA = getBacLeSortIndex(a.item.bac_le)
          const sortIndexB = getBacLeSortIndex(b.item.bac_le)

          if (sortIndexA !== sortIndexB) {
            return sortIndexA - sortIndexB
          }

          return a.index - b.index
        })
        .map((entry) => entry.item)

      dayRecord.arr_cac_le = arrCacLe
    }

    return { cur_month: windowDays, prev_month: [], nxt_month: [] }
  } catch (err) {
    return err
  }
}

async function getCalendarYear(request, reply) {
  const tb_lich = this.mongo.db.collection('lich-cong-giao')
  const { year } = request.query

  if (!year) {
    return reply.code(400).send({ error: 'Missing required parameter: year' })
  }

  try {
    const startDate = `${year}-01-01`
    const endDate = `${year}-12-31`
    const list = await tb_lich.find({ date: { $gte: startDate, $lte: endDate } }).sort({ date: 1 }).toArray()
    return { data: list }
  } catch (err) {
    return err
  }
}

async function getOneDay(request, reply) {
  const tb_lich = this.mongo.db.collection('lich-cong-giao')
  const { date } = request.query

  if (!date) {
    return reply.code(400).send({ error: 'Missing required parameter: date' })
  }

  try {
    const item = await tb_lich.findOne({ date })
    return item || { date }
  } catch (err) {
    return err
  }
}

module.exports = {
  getCalendar,
  getCalendarYear,
  getOneDay
}
