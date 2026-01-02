'use strict'
const fastify = require('fastify')()



module.exports = async function (fastify, opts) {
  fastify.get('/', async function (request, reply) {
    return reply.view('index.ejs', { message: 'Hello from Fastify!' })
    // return { root: true, at: false }
  });
  fastify.get('/helloworld', async function (request, reply) {
    return reply.view('admin/src/test-dynamic-field.ejs')
    return { root: true, at: "hello world" } 
  });
  fastify.get('/ngay-le', async function (req, reply) {
    // Or this.mongo.client.db('mydb').collection('users')
    //return {ngayle: "ngayf le"};
    const users = this.mongo.db.collection('lich-cong-giao')

    // if the id is an ObjectId format, you need to create a new ObjectId
  //const id = this.mongo.ObjectId(req.params.id)
    try {
      const user = await users.find({})
      return user
    } catch (err) {
      return err
    }
  });
  fastify.get('/admin', async function (request, reply) {
    const users = this.mongo.db.collection('ngay-le')
    try{
      let query = { date: "" };
      // const alluser = await users.find(query);
      const alluser = await users.find({}).toArray();
      // console.log("FF", typeof (alluser))
      // return alluser
      // let r = [];
      // await alluser.forEach(doc => {
      //   console.log(doc); // doc is a JavaScript object
      //   r.push(doc);
      // });
      //console.log(alluser);
      return reply.view('admin/src/index.ejs', { numofuser: alluser})
      // return alluser;
    }catch(err){
      return err
    }
  });
  fastify.get('/temp-man', async function (request, reply) {
    const users = this.mongo.db.collection('ngay-le')
    try{
      let query = { date: "" };
      const alluser = await users.find(query);
      // const alluser = await users.find({});
      let r = [];
      await alluser.forEach(doc => {
        console.log(doc); // doc is a JavaScript object
        r.push(doc);
      });
      //console.log(alluser);
      return reply.view('admin/src/temp-man.ejs', { numofuser: r})
    }catch(err){
      return err
    }
  });
  fastify.get('/showall-lich', async function (request, reply) {
    const users = this.mongo.db.collection('lich-cong-giao')
    const ngayle = this.mongo.db.collection('ngay-le')
    try{
      //let query = { date: "" };
      let alluser = await users.find({}).sort({date: 1}).toArray();

      // for (let index = 0; index < alluser.length; index++) {
      //   const e = alluser[index]
      // //   console.log(e.id_le_theo_mua_phung_vu)
      // e.le_theo_mua_phung_vu = {}  
      // e.le_theo_mua_phung_vu = await ngayle.findOne({_id: e.id_le_theo_mua_phung_vu})
      // //   let ad = new Date(e.date)
      // //   if( !e.le_theo_mua_phung_vu.hasOwnProperty("assigned_date")){
      // //     e.le_theo_mua_phung_vu.assigned_date = {}
      // //   }        
      // //   e.le_theo_mua_phung_vu.assigned_date [ad.getFullYear()] =  ad.getDate()+"/"+(ad.getMonth()+1)
      //   // return alluser[index]
      //   //await ngayle.updateOne( { _id: e.id_le_theo_mua_phung_vu }, { $set: { assigned_date: e.le_theo_mua_phung_vu.assigned_date } })
      //   // break
      // }        
      // return 
      return reply.view('admin/src/showall-lich-cong-giao.ejs', { lich: alluser})
    }catch(err){
      return err
    }
  });
  fastify.get('/bien-tap-lich', async function (request, reply) {
      return reply.view('admin/src/showall-lich-cong-giao.ejs', { lich: alluser})
  });
  fastify.get('/bien-tap-ngay-le', async function (request, reply) {
    
    const ngayle = this.mongo.db.collection('ngay-le')
    try{
    
      let col = await ngayle.find({}).toArray();
       
      return reply.view('admin/src/bien-tap-ngay-le.ejs', { ngay_le: col})
    }catch(err){
      return err
    }
  });
  fastify.get('/insert-lich/:jso', async function (request, reply) {
    const { jso } = request.params;
    return jso
    //const users = this.mongo.db.collection('lich-cong-giao')
  });
  fastify.get('/update-ngay-le', async function (request, reply) {
    // Access the parsed JSON body
    const collection = this.mongo.db.collection('ngay-le')
    // const { _id, title, , bac_le, , mau_ao_le, } = request.query
    const {_id, title, date, assigned_date, week, season, url, bac_le, mau_ao_le, ban_van} = request.query
    // console.log(`Name: ${title}, date: ${date}, id_le: ${id_le_theo_mua_phung_vu}, mau_ao_le: ${mau_ao_le}`)
    //let lich_cong_giao = this.mongo.db.collection('lich-cong-giao')
    console.log("isNan = "+isNaN(new Date(assigned_date)))
    let f_doc
    try{
      f_doc = await collection.findOne({_id: new this.mongo.ObjectId(_id)})      
      if(!f_doc.hasOwnProperty("assigned_date")){        
        f_doc.assigned_date = {}
      }
      let a_date = new Date(assigned_date)
      if(!isNaN(a_date)){
        f_doc.assigned_date[a_date.getFullYear()] = assigned_date
      }
    }catch(err){
      return err
    }
    let doc = {      
      title:title,
      date:date,
      bac_le: bac_le,
      assigned_date: f_doc.assigned_date,
      mau_ao_le:mau_ao_le,      
    }
    if(week != undefined){
      doc.week = week
    }
    if(season != undefined){
      doc.season = season
    }
    if(url != undefined){
      doc.url = url
    }
    if(ban_van != undefined){
      doc.ban_van = ban_van
    }
    console.log(doc)
    try{
      await collection.updateOne({_id: new this.mongo.ObjectId(_id)},{$set: doc})
    }catch(err){
      return err
    }
    // Respond with a success message and the received data
    return { message: 'Data received!', data: doc }
  });
  fastify.get('/submitdata', async function (request, reply) {
    // Access the parsed JSON body
    const users = this.mongo.db.collection('lich-cong-giao')
    const { title, date, id_le_theo_mua_phung_vu, mau_ao_le } = request.query
    // console.log(`Name: ${title}, date: ${date}, id_le: ${id_le_theo_mua_phung_vu}, mau_ao_le: ${mau_ao_le}`)
    //let lich_cong_giao = this.mongo.db.collection('lich-cong-giao')
    
    let doc = {
      title:title,
      date:date,
      id_le_theo_mua_phung_vu: new this.mongo.ObjectId(id_le_theo_mua_phung_vu),
      mau_ao_le:mau_ao_le
    }
    try{
      await users.insertOne(doc)
    }catch(err){
      return err
    }
    // Respond with a success message and the received data
    return { message: 'Data received!', data: title }
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
      // console.log(ngay_le_1)
      // console.log(ngay_le_2)
      
      
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
  fastify.get('/get-calendar', async function (request, reply) {
    const tb_lich = this.mongo.db.collection('lich-cong-giao')

    // const tb_ngayle = this.mongo.db.collection('ngay-le')
    // if the id is an ObjectId format, you need to create a new ObjectId
    //const id = this.mongo.ObjectId(req.params.id)
    const {date} = request.query
    //console.log(`${_id}`)
    try {
      let cur_month = []  
      let prev_month = []    
      let nxt_month = []
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
        nxt_month = await tb_lich.find({date: {$regex: `^${n_y}-${n_m}-\\d{2}`}}).sort({date: 1}).toArray()
        return {cur_month: cur_month, prev_month: prev_month, nxt_month: nxt_month}
      }else{
        reply.code(400).send({ error: 'Missing required parameter: date or month' });
      }                  
      
    } catch (err) {
      return err
    }
  });
  fastify.get('/update-ngay-lich', async function (request, reply) {
    const tb_lich = this.mongo.db.collection('lich-cong-giao')

    // const tb_ngayle = this.mongo.db.collection('ngay-le')
    // if the id is an ObjectId format, you need to create a new ObjectId
    //const id = this.mongo.ObjectId(req.params.id)
    const {_id, title, url, mua_phung_vu, bac_le, mau_ao_le, bd_1, bd_2, dap_ca, alleluia, tin_mung, cau_loi_chua, xu_chau_luot, luu_y, under_title} = request.query
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
      under_title: under_title
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
}



// fastify.listen({ port: 3000, host: "0.0.0.0" }, err => {
//   if (err) throw err
// })