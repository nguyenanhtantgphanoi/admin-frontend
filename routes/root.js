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
      //let query = { date: "" };
      let col = await ngayle.find({}).toArray();
      // let t = []
      // for (let index = 0; index < col.length; index++) {
      //   const element = col[index];
      //   let _id = element._id
      //   if(element.hasOwnProperty("assigned_date")){
      //     let assigned_date = element.assigned_date
      //     for(const key in assigned_date){
      //       if(isNaN(assigned_date[key])){
      //         assigned_date[key] = key+"-"+(assigned_date[key].split("/")[1] < 10? "0"+assigned_date[key].split("/")[1]:assigned_date[key].split("/")[1])+"-"+(assigned_date[key].split("/")[0] < 10? "0"+assigned_date[key].split("/")[0]:assigned_date[key].split("/")[0])
      //       }
      //     }
      //     try{
      //       await ngayle.updateOne({_id: new this.mongo.ObjectId(_id)},{$set: {assigned_date: assigned_date}})
      //     }catch(err){
      //       return err
      //     }
      //     t.push({assigned_date: assigned_date})
      //   }
      // }
      // return t
      // return col   
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
    const { _id, title, date, bac_le, assigned_date, mau_ao_le, week, season} = request.query
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
      let query = {["assigned_date."+n_date.getFullYear()] : lich.date, date:""}
      const ngay_le_1 = await tb_ngayle.find({date: (n_date.getDate() >9?n_date.getDate():"0"+n_date.getDate())+"/"+(n_date.getMonth()+1 > 9? n_date.getMonth()+1: "0"+(n_date.getMonth()+1))}).toArray()
      const ngay_le_2 = await tb_ngayle.find(query).toArray()

      console.log("---> "+(n_date.getDate() >9?n_date.getDate():"0"+n_date.getDate())+"/"+(n_date.getMonth()+1 > 9? n_date.getMonth()+1: "0"+(n_date.getMonth()+1)))
      console.log(ngay_le_1)
      console.log(ngay_le_2)
      
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
  fastify.get('/update-ngay-lich', async function (request, reply) {
    const tb_lich = this.mongo.db.collection('lich-cong-giao')

    // const tb_ngayle = this.mongo.db.collection('ngay-le')
    // if the id is an ObjectId format, you need to create a new ObjectId
    //const id = this.mongo.ObjectId(req.params.id)
    const {_id, title, url, mua_phung_vu, bac_le, mau_ao_le, bd_1, bd_2, dap_ca, alleluia, tin_mung, cau_loi_chua} = request.query
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
      cau_loi_chua: cau_loi_chua
    }
    try {
      console.log(update_data)
      await tb_lich.updateOne({_id: new this.mongo.ObjectId(_id)}, {$set: update_data})            
      return {_id: _id}
    } catch (err) {
      return err
    }
  });
}



// fastify.listen({ port: 3000, host: "0.0.0.0" }, err => {
//   if (err) throw err
// })