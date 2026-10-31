'use strict'

const { exec } = require('node:child_process')
const cron = require('node-cron')

const cronTasks = []

const quickUtilities = [
  {
    id: 'retreat-confession-schedule',
    title: 'Lịch tĩnh tâm/giải tội',
    icon: 'calendar-outline',
    url: 'https://www.tonggiaophanhanoi.org/lich-tinh-tam-mua-chay-va-tuan-thanh-2026-tai-cac-nha-tho-noi-thanh-ha-noi/'
  },
  {
    id: 'reflection',
    title: 'Suy tư tản mạn',
    icon: 'bulb-outline',
    url: 'https://www.tonggiaophanhanoi.org/category/song-dao/suy-tu-tan-man/'
  },
  {
    id: 'catechism',
    title: 'Giáo lý',
    icon: 'school-outline',
    url: 'https://www.tonggiaophanhanoi.org/category/song-dao/giao-ly-cho-nguoi-truong-thanh/'
  },
  {
    id: 'saints',
    title: 'Hạnh các thánh',
    icon: 'sparkles-outline',
    url: 'https://www.tonggiaophanhanoi.org/category/phung-vu/hanh-cac-thanh/'
  },
  {
    id: 'general-prayers',
    title: 'Lời nguyện tín hữu',
    icon: 'prayer-outline',
    url: 'https://www.tonggiaophanhanoi.org/loi-nguyen-tin-huu-2/'
  },
  {
    id: 'synod-documents',
    title: 'Văn kiện hậu công nghị',
    icon: 'scroll-outline',
    url: 'https://www.tonggiaophanhanoi.org/van-kien-hau-cong-nghi/'
  },
  {
    id: 'historical-documents',
    title: 'Tài liệu lịch sử',
    icon: 'book-outline',
    url: 'https://www.tonggiaophanhanoi.org/tu-lieu-lich-su/'
  }
]

const quickUtilitiesV2 = {
  buttonColors: {
    cgkpv: '#c0392b',
    reading: '#67ad44',
    lich: '#16a085',
    homNay: '#2980b9',
    homNayDisabled: '#95a5a6'
  },
  data: [
    {
      id: 'announcement',
      title: 'Thông báo',
      icon: 'megaphone-outline',
      iconBackgroundColor: '#2895fc',
      url: 'https://www.tonggiaophanhanoi.org/category/thong-bao/'
    },
    {
      id: 'mass-schedule',
      title: 'Lịch Lễ Nội Thành',
      icon: 'calendar-outline',
      iconBackgroundColor: '#16a085',
      url: 'https://www.tonggiaophanhanoi.org/gio-le-tai-ha-noi-xep-theo-thu-tu-ten-nha-tho/'
    },
    {
      id: 'reflection',
      title: 'Suy tư tản mạn',
      icon: 'bulb-outline',
      iconBackgroundColor: '#f39c12',
      url: 'https://www.tonggiaophanhanoi.org/category/song-dao/suy-tu-tan-man/'
    },
    {
      id: 'catechism',
      title: 'Giáo lý',
      icon: 'school-outline',
      iconBackgroundColor: '#16a085',
      url: 'https://www.tonggiaophanhanoi.org/category/song-dao/giao-ly-cho-nguoi-truong-thanh/'
    },
    {
      id: 'saints',
      title: 'Hạnh các thánh',
      icon: 'people-sharp',
      iconBackgroundColor: '#2980b9',
      url: 'https://www.tonggiaophanhanoi.org/category/phung-vu/hanh-cac-thanh/'
    },
    {
      id: 'general-prayers',
      title: 'Lời nguyện tín hữu',
      icon: 'document-text-outline',
      iconBackgroundColor: '#2980b9',
      url: 'https://www.tonggiaophanhanoi.org/loi-nguyen-tin-huu-2/'
    },
    {
      id: 'synod-documents',
      title: 'Văn kiện hậu công nghị',
      icon: 'document',
      iconBackgroundColor: '#c0392b',
      url: 'https://www.tonggiaophanhanoi.org/van-kien-hau-cong-nghi/'
    },
    {
      id: 'historical-documents',
      title: 'Tư liệu lịch sử',
      icon: 'book-outline',
      iconBackgroundColor: '#95a5a6',
      url: 'https://www.tonggiaophanhanoi.org/tu-lieu-lich-su/'
    }
  ]
}

async function notificationPage(request, reply) {
  return reply.view('admin/notification.ejs')
}

async function pushNotification(request, reply) {
  const { message, title } = request.body

  if (!message || !title) {
    return reply.code(500).send({ error: 'Not Finding title or message' })
  }

  const cmd = `curl --location 'http://localhost:3456/notification/push/all' --header 'Content-Type: application/json' --data '{"title": "${title}","body": "${message}"}'`

  return new Promise((resolve, reject) => {
    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        console.error('exec error PPP:', error)
        reply.code(500).send({ error: stderr })
        reject(error)
        return
      }

      reply.send({ output: stdout })
      resolve(stdout)
    })
  })
}

async function addCronJob(request, reply) {
  const { data, title } = request.query

  if (data !== undefined && title !== undefined) {
    cronTasks.push(cron.schedule('15 11 * * 2', () => {
      console.log('Running a task every 1 minutes')
      console.log('title: ' + title)
      console.log('data: ' + data)
    }))
  }

  return reply.view('admin/notif-scheduling.ejs', { cron_tasks: cronTasks })
}

async function getQuickUtilities(request, reply) {
  return quickUtilities
}

async function getQuickUtilitiesV2(request, reply) {
  return quickUtilitiesV2
}

function cleanupCronTasks() {
  cronTasks.forEach((task) => task.stop())
}

module.exports = {
  notificationPage,
  pushNotification,
  addCronJob,
  getQuickUtilities,
  getQuickUtilitiesV2,
  cleanupCronTasks
}
