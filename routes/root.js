'use strict'
const fastify = require('fastify')()
const { JSDOM } = require('jsdom');
const { exec } = require('child_process')
const cron = require('node-cron')

const cron_tasks = []
class DOMParser {
  parseFromString(s, contentType = 'text/html') {
    return new JSDOM(s, { contentType }).window.document;
  }
}


module.exports = async function (fastify, opts) {
  
  fastify.get('/', async function (request, reply) {
     return reply.viewWithLayout('index.ejs', { message: 'Hello from Fastify!' })
    // return { root: true, at: false }
  });
  fastify.get('/helloworld', async function (request, reply) {
    return reply.viewWithLayout('admin/test-dynamic-field.ejs')
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
      return reply.viewWithLayout('admin/index.ejs', { numofuser: alluser})
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
      return reply.viewWithLayout('admin/temp-man.ejs', { numofuser: r})
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
      return reply.viewWithLayout('admin/showall-lich-cong-giao.ejs', { lich: alluser})
    }catch(err){
      return err
    }
  });
  fastify.get('/bien-tap-lich', async function (request, reply) {
      return reply.view('admin/showall-lich-cong-giao.ejs', { lich: alluser})
  });
  fastify.get('/bien-tap-ngay-le', async function (request, reply) {
    
    const ngayle = this.mongo.db.collection('ngay-le')
    try{
    
      let col = await ngayle.find({}).toArray();
       
      return reply.viewWithLayout('admin/bien-tap-ngay-le.ejs', { ngay_le: col})
    }catch(err){
      return err
    }
  });
   
  fastify.get('/hc-dap-ca', async function (request, reply) {
    
    const ngayle = this.mongo.db.collection('ngay-le')
    try{
    
      let col = await ngayle.find({}).toArray();
       
      return reply.viewWithLayout('admin/hc-dap-ca.ejs', { ngay_le: col})
    }catch(err){
      return err
    }
  });
  fastify.get('/hc-mua-chay', async function (request, reply) {
    
    const ngayle = this.mongo.db.collection('ngay-le')
    try{
    
      let col = await ngayle.find({}).toArray();
       
      return reply.viewWithLayout('admin/hc-mua-chay.ejs', { ngay_le: col})
    }catch(err){
      return err
    }
  });
  fastify.get('/xoa-truong-', async function (request, reply) {
    const ngayle = this.mongo.db.collection('ngay-le')
    if('_id' in request.query){
      try{        
        await ngayle.updateMany(
          {_id: new this.mongo.ObjectId(request.query._id)},
          {$unset: {
            "ban_van.Dẫn vào Thánh Lễ":'', 
            "ban_van.Ca nhập lễ":'',
            "ban_van.Lời nguyện nhập lễ":'',
            "ban_van.Bài Ðọc I:":'',
            "ban_van.Ðáp Ca:":'',
            "ban_van.Bài Ðọc II:":'',
            "ban_van.Alleluia:":'',
            "ban_van.Phúc Âm:":'',
            "ban_van.Lời nguyện tín hữu":'',
            "ban_van.Lời nguyện tiến lễ":'',
            "ban_van.Ca hiệp lễ":'',
            "ban_van.Lời nguyện hiệp lễ":''
            
          }})          
      }catch(err){
        return err
      }
    }
  })
  fastify.get('/bien-tap-suy-niem', async function (request, reply) {
     if('_id' in request.query){
      try {
        const ngay_le = this.mongo.db.collection('ngay-le')
        const articlesCollection = this.mongo.db.collection('articles')
        
        const articlesOfNgayLe = await ngay_le.findOne({_id: new this.mongo.ObjectId(request.query._id)})
        let reflections_ids = articlesOfNgayLe.reflections || []
        const articles = await articlesCollection.find({_id: {$in: reflections_ids.map(id => new this.mongo.ObjectId(id))}}).toArray()
        return reply.viewWithLayout('admin/bien-tap-suy-niem.ejs', { articles: articles, urlParams: request.query, ngayLe: articlesOfNgayLe })
      } catch (err) {
        console.error(err)
        return reply.viewWithLayout('admin/bien-tap-suy-niem.ejs', { articles: [], urlParams: request.query, ngayLe: null })
      }
    }else{
      try {
        const articlesCollection = this.mongo.db.collection('articles')
        const ngay_le = this.mongo.db.collection('ngay-le')

        let articles = await articlesCollection.find({}).toArray()

        // For each article, find the ngay-le that includes it in reflections
        for (let i = 0; i < articles.length; i++) {
          const art = articles[i]
          try {
            const parent = await ngay_le.findOne({ reflections: { $in: [art._id] } })
            if (parent) {
              art.ngay_le_title = parent.title || ''
              art.ngay_le_id = parent._id
            } else {
              art.ngay_le_title = ''
              art.ngay_le_id = null
            }
          } catch (innerErr) {
            console.error('Error finding parent ngay-le for article', art._id, innerErr)
            art.ngay_le_title = ''
            art.ngay_le_id = null
          }
        }

        return reply.viewWithLayout('admin/bien-tap-suy-niem.ejs', { articles: articles, urlParams: {} })
      } catch (err) {
        console.error(err)
        return reply.viewWithLayout('admin/bien-tap-suy-niem.ejs', { articles: [], urlParams: {} })
      }
    }
  })
  fastify.get('/bien-tap-suy-niem-edit', async function (request, reply) {
    let article = null
    if('_id' in request.query){
      try {
        const articlesCollection = this.mongo.db.collection('articles')
        article = await articlesCollection.findOne({_id: new this.mongo.ObjectId(request.query._id)})
      } catch (err) {
        console.error(err)
      }
    }
    // load list of ngay-le for selector when needed
    let ngayLeList = []
    try {
      const ngayLeCollection = this.mongo.db.collection('ngay-le')
      ngayLeList = await ngayLeCollection.find({}).toArray()
    } catch (err) {
      console.error('Failed to load ngay-le list:', err)
    }

    return reply.viewWithLayout('admin/bien-tap-suy-niem-edit.ejs', { article: article, search: request.query, ngayLeList: ngayLeList })
  })
  fastify.post('/save-article', async function (request, reply) {
    try {
      const { title, author, content, _id, ngay_le_id } = request.body
      const articlesCollection = this.mongo.db.collection('articles')
      const ngayLeCollection = this.mongo.db.collection('ngay-le')
      
      if(_id && _id.trim() !== '') {
        // Update existing article
        await articlesCollection.updateOne(
          { _id: new this.mongo.ObjectId(_id) },
          { $set: { title, author, content, updatedAt: new Date() } }
        )
      } else {
        // Insert new article
        const result = await articlesCollection.insertOne({
          title,
          author,
          content,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        
        // Map new article to ngay-le reflections if ngay_le_id is provided
        if(ngay_le_id && ngay_le_id.trim() !== '') {
          try {
            await ngayLeCollection.updateOne(
              { _id: new this.mongo.ObjectId(ngay_le_id) },
              { $push: { reflections: result.insertedId } }
            )
          } catch (ngayLeErr) {
            console.error('Error adding article to ngay-le reflections:', ngayLeErr)
          }
        }
      }
      
      return { success: true, message: 'Article saved successfully' }
    } catch (err) {
      console.error(err)
      reply.code(500)
      return { success: false, message: 'Failed to save article', error: err.message }
    }
  })

  fastify.post('/delete-article', async function (request, reply) {
    try {
      const { _id } = request.body
      const articlesCollection = this.mongo.db.collection('articles')
      const ngayLeCollection = this.mongo.db.collection('ngay-le')

      // Delete article from articles collection
      await articlesCollection.deleteOne({
        _id: new this.mongo.ObjectId(_id)
      })

      // Remove article ID from all ngay-le reflections
      await ngayLeCollection.updateMany(
        { reflections: { $in: [new this.mongo.ObjectId(_id)] } },
        { $pull: { reflections: new this.mongo.ObjectId(_id) } }
      )

      return { success: true, message: 'Article deleted successfully' }
    } catch (err) {
      console.error(err)
      reply.code(500)
      return { success: false, message: 'Failed to delete article', error: err.message }
    }
  })

  fastify.get('/bien-tap-ban-van', async function (request, reply) {
    const ngayle = this.mongo.db.collection('ngay-le')
    if('_id' in request.query){
      if('dan_vao_thanh_le' in request.query){
        try{        
          await ngayle.updateOne({_id: new this.mongo.ObjectId(request.query._id)},{$set: {"ban_van.dan_vao_thanh_le": request.query.dan_vao_thanh_le}})          
        }catch(err){
          return err
        }
      }
      if('ca_nhap_le' in request.query){
        try{        
          await ngayle.updateOne({_id: new this.mongo.ObjectId(request.query._id)},{$set: {"ban_van.ca_nhap_le": request.query.ca_nhap_le}})          
        }catch(err){
          return err
        }
      }
      if('loi_nguyen_nhap_le' in request.query){
        try{        
          await ngayle.updateOne({_id: new this.mongo.ObjectId(request.query._id)},{$set: {"ban_van.loi_nguyen_nhap_le": request.query.loi_nguyen_nhap_le}})          
        }catch(err){
          return err
        }
      }
      if('bd1_le_trich_tu' in request.query){
        try{        
          await ngayle.updateOne({_id: new this.mongo.ObjectId(request.query._id)},{$set: {"ban_van.bd1_le_trich_tu": request.query.bd1_le_trich_tu}})          
        }catch(err){
          return err
        }
      }
      if('cau_bd1_le_tom_gon' in request.query){
        try{        
          await ngayle.updateOne({_id: new this.mongo.ObjectId(request.query._id)},{$set: {"ban_van.cau_bd1_le_tom_gon": request.query.cau_bd1_le_tom_gon}})          
        }catch(err){
          return err
        }
      }
      if('bd1_le' in request.query){
        try{        
          await ngayle.updateOne({_id: new this.mongo.ObjectId(request.query._id)},{$set: {"ban_van.bd1_le": request.query.bd1_le}})          
        }catch(err){
          return err
        }
      }
      if('dap_ca_le_trich_tu' in request.query){
        try{        
          await ngayle.updateOne({_id: new this.mongo.ObjectId(request.query._id)},{$set: {"ban_van.dap_ca_le_trich_tu": request.query.dap_ca_le_trich_tu}})          
        }catch(err){
          return err
        }
      }
      if('dap_ca_le' in request.query){
        try{        
          await ngayle.updateOne({_id: new this.mongo.ObjectId(request.query._id)},{$set: {"ban_van.dap_ca_le": request.query.dap_ca_le}})          
        }catch(err){
          return err
        }
      }
      //////////////////////
      if('bd1_chan_trich_tu' in request.query){
        try{        
          await ngayle.updateOne({_id: new this.mongo.ObjectId(request.query._id)},{$set: {"ban_van.bd1_chan_trich_tu": request.query.bd1_chan_trich_tu}})          
        }catch(err){
          return err
        }
      }
      if('cau_bd1_chan_tom_gon' in request.query){
        try{        
          await ngayle.updateOne({_id: new this.mongo.ObjectId(request.query._id)},{$set: {"ban_van.cau_bd1_chan_tom_gon": request.query.cau_bd1_chan_tom_gon}})          
        }catch(err){
          return err
        }
      }
      if('bd1_chan' in request.query){
        try{        
          await ngayle.updateOne({_id: new this.mongo.ObjectId(request.query._id)},{$set: {"ban_van.bd1_chan": request.query.bd1_chan}})          
        }catch(err){
          return err
        }
      }
      if('dap_ca_chan_trich_tu' in request.query){
        try{        
          await ngayle.updateOne({_id: new this.mongo.ObjectId(request.query._id)},{$set: {"ban_van.dap_ca_chan_trich_tu": request.query.dap_ca_chan_trich_tu}})          
        }catch(err){
          return err
        }
      }
      if('dap_ca_chan' in request.query){
        try{        
          await ngayle.updateOne({_id: new this.mongo.ObjectId(request.query._id)},{$set: {"ban_van.dap_ca_chan": request.query.dap_ca_chan}})          
        }catch(err){
          return err
        }
      }
      ///////////////////////////////////
      if('bd2_trich_tu' in request.query){
        try{        
          await ngayle.updateOne({_id: new this.mongo.ObjectId(request.query._id)},{$set: {"ban_van.bd2_trich_tu": request.query.bd2_trich_tu}})          
        }catch(err){
          return err
        }
      }
      if('cau_bd2_tom_gon' in request.query){
        try{        
          await ngayle.updateOne({_id: new this.mongo.ObjectId(request.query._id)},{$set: {"ban_van.cau_bd2_tom_gon": request.query.cau_bd2_tom_gon}})          
        }catch(err){
          return err
        }
      }
      if('bd2' in request.query){
        try{        
          await ngayle.updateOne({_id: new this.mongo.ObjectId(request.query._id)},{$set: {"ban_van.bd2": request.query.bd2}})          
        }catch(err){
          return err
        }
      }
      if('alleluia_trich_tu' in request.query){
        try{        
          await ngayle.updateOne({_id: new this.mongo.ObjectId(request.query._id)},{$set: {"ban_van.alleluia_trich_tu": request.query.alleluia_trich_tu}})          
        }catch(err){
          return err
        }
      }
      if('alleluia' in request.query){
        try{        
          await ngayle.updateOne({_id: new this.mongo.ObjectId(request.query._id)},{$set: {"ban_van.alleluia": request.query.alleluia}})          
        }catch(err){
          return err
        }
      }
      ///////////////////////////////////////////
      if('phuc_am_trich_tu' in request.query){
        try{        
          await ngayle.updateOne({_id: new this.mongo.ObjectId(request.query._id)},{$set: {"ban_van.phuc_am_trich_tu": request.query.phuc_am_trich_tu}})          
        }catch(err){
          return err
        }
      }
      if('cau_phuc_am_tom_gon' in request.query){
        try{        
          await ngayle.updateOne({_id: new this.mongo.ObjectId(request.query._id)},{$set: {"ban_van.cau_phuc_am_tom_gon": request.query.cau_phuc_am_tom_gon}})          
        }catch(err){
          return err
        }
      }
      if('phuc_am' in request.query){
        try{        
          await ngayle.updateOne({_id: new this.mongo.ObjectId(request.query._id)},{$set: {"ban_van.phuc_am": request.query.phuc_am}})          
        }catch(err){
          return err
        }
      }
      //////////////////////////////////////
      if('loi_nguyen_tin_huu' in request.query){
        try{        
          await ngayle.updateOne({_id: new this.mongo.ObjectId(request.query._id)},{$set: {"ban_van.loi_nguyen_tin_huu": request.query.loi_nguyen_tin_huu}})          
        }catch(err){
          return err
        }
      }
      if('loi_nguyen_tien_le' in request.query){
        try{        
          await ngayle.updateOne({_id: new this.mongo.ObjectId(request.query._id)},{$set: {"ban_van.loi_nguyen_tien_le": request.query.loi_nguyen_tien_le}})          
        }catch(err){
          return err
        }
      }
      if('ca_hiep_le' in request.query){
        try{        
          await ngayle.updateOne({_id: new this.mongo.ObjectId(request.query._id)},{$set: {"ban_van.ca_hiep_le": request.query.ca_hiep_le}})          
        }catch(err){
          return err
        }
      }
      if('loi_nguyen_hiep_le' in request.query){
        try{        
          await ngayle.updateOne({_id: new this.mongo.ObjectId(request.query._id)},{$set: {"ban_van.loi_nguyen_hiep_le": request.query.loi_nguyen_hiep_le}})          
        }catch(err){
          return err
        }
      }
      if('kinh_tien_tung' in request.query){
        try{        
          await ngayle.updateOne({_id: new this.mongo.ObjectId(request.query._id)},{$set: {"ban_van.kinh_tien_tung": request.query.kinh_tien_tung}})          
        }catch(err){
          return err
        }
      }
      let doc = await ngayle.findOne({_id: new this.mongo.ObjectId(request.query._id)})
      if('is_ajax' in request.query){
        return 'Server message: Update Successful'
      }else{
        return reply.viewWithLayout('admin/bien-tap-ban-van.ejs', { u: doc})
      }
    }else{
      return reply.viewWithLayout('admin/bien-tap-ban-van.ejs', {u: null})
    }
  })
  fastify.get('/bien-tap-ban-van--', async function (request, reply) {//Route dùng để hiệu chỉnh bản văn được crawl từ website// đã được sử dụng
    
    const ngayle = this.mongo.db.collection('ngay-le')
    if('_id' in request.query)
    {
      console.log("_id existes: "+request.query._id)
      let doc = await ngayle.findOne({_id: new this.mongo.ObjectId(request.query._id)})
      let dan_vao_thanh_le = doc.ban_van['Dẫn vào Thánh Lễ']
      let ca_nhap_le = doc.ban_van['Ca nhập lễ']
      let loi_nguyen_nhap_le = doc.ban_van['Lời nguyện nhập lễ']

      // let bd1_le_trich_tu = 
      //let cau_bd1_le_tom_gon = 
      let bd1_le = doc.ban_van['Bài Ðọc I:'] 

      // let bd1_chan_trich_tu = 
      // let cau_bd1_chan_tom_gon = 
      // let bd1_chan = 

      // let dap_ca_trich_tu =                                   
      let dap_ca_le = doc.ban_van['Ðáp Ca:']


      // let bd2_trich_tu = 
      // let cau_bd2_tom_gon = 
      let bd2 =  doc.ban_van['Bài Ðọc II:']

      // let alleluia_trich_tu =                                   
      let alleluia = doc.ban_van['Alleluia:']

      // let phuc_am_trich_tu = doc.ban_van['']
      // let cau_phuc_am_tom_gon = 
      let phuc_am = doc.ban_van['Phúc Âm:']

      let loi_nguyen_tin_huu = doc.ban_van['Lời nguyện tín hữu']
      let loi_nguyen_tien_le = doc.ban_van['Lời nguyện tiến lễ']
      let ca_hiep_le = doc.ban_van['Ca hiệp lễ']
      let loi_nguyen_hiep_le = doc.ban_van['Lời nguyện hiệp lễ']

      console.log(dan_vao_thanh_le)
      if(dan_vao_thanh_le != undefined){
        doc.ban_van.dan_vao_thanh_le = dan_vao_thanh_le.replace(/<p[^>]*>[\s\S]*?<\/p>/, '').replace("<p>",'').replace("</p>", '')
      }
      if(ca_nhap_le != undefined){
        doc.ban_van.ca_nhap_le = ca_nhap_le.replace(/<p[^>]*>[\s\S]*?<\/p>/, '').replace("<p>",'').replace("</p>", '')
      }
      if(loi_nguyen_nhap_le){
        doc.ban_van.loi_nguyen_nhap_le = loi_nguyen_nhap_le.replace(/<p[^>]*>[\s\S]*?<\/p>/, '')
      }
            

      let document = new JSDOM('', 'text/html').window.document

      const div = document.createElement('div');

      // Insert the HTML string
      if(bd1_le != undefined){
        div.innerHTML = bd1_le
        let f_p = div.getElementsByTagName('p')
        doc.ban_van.bd1_le_trich_tu = f_p[0].textContent.split(":")[1]
        doc.ban_van.cau_bd1_le_tom_gon = f_p[1].textContent
        div.removeChild(f_p[1])
        div.removeChild(f_p[0])
        let last_i_bd1_le = -1
        for (let index = 0; index < f_p.length; index++) {
          const element = f_p[index];
          if(element.textContent.match(/Ðó là lời Chúa/gi)!=null){
            last_i_bd1_le = index
            break
          }                    
        }
        const div_x = document.createElement('div');
        console.log("last index bd1 le: "+last_i_bd1_le)
        if(last_i_bd1_le < div.getElementsByTagName('p').length - 1){
          while(div.getElementsByTagName('p').length > last_i_bd1_le+1) {
            // const element = f_p[index];
            div_x.appendChild(f_p[last_i_bd1_le+1])      
            console.log("--> "+div.getElementsByTagName('p').length)    
          }
          doc.ban_van.cau_bd1_chan_tom_gon = div_x.getElementsByTagName('p')[0].textContent
          div_x.removeChild(div_x.getElementsByTagName('p')[0])
          doc.ban_van.bd1_chan = div_x.innerHTML
        }
        
        doc.ban_van.bd1_le = div.innerHTML
        
      }

      if(dap_ca_le != undefined){
        div.innerHTML = dap_ca_le
        let f_p = div.getElementsByTagName('p')
        doc.ban_van.dap_ca_le_trich_tu = f_p[0].textContent.split(":")[1]
        div.removeChild(f_p[0])
        doc.ban_van.dap_ca_le = div.innerHTML
      }

      if(bd2 != undefined){
        div.innerHTML = bd2
        let f_p = div.getElementsByTagName('p')
        doc.ban_van.bd2_trich_tu = f_p[0].textContent.split(":")[1]
        doc.ban_van.cau_bd2_tom_gon = f_p[1].textContent
        div.removeChild(f_p[1])
        div.removeChild(f_p[0])
        doc.ban_van.bd2 = div.innerHTML
      }

      if(alleluia != undefined){
        div.innerHTML = alleluia
        let f_p = div.getElementsByTagName('p')
        doc.ban_van.alleluia_trich_tu = f_p[0].textContent.split(":")[1]
        div.removeChild(f_p[0])
        doc.ban_van.alleluia = div.innerHTML
      }

      if(phuc_am != undefined){
        div.innerHTML = phuc_am
        let f_p = div.getElementsByTagName('p')
        doc.ban_van.phuc_am_trich_tu = f_p[0].textContent.split(":")[1]
        doc.ban_van.cau_phuc_am_tom_gon = f_p[1].textContent
        div.removeChild(f_p[1])
        div.removeChild(f_p[0])
        doc.ban_van.phuc_am = div.innerHTML
      }

      if(loi_nguyen_tin_huu != undefined){
        div.innerHTML = loi_nguyen_tin_huu
        let f_p = div.getElementsByTagName('p')      
        div.removeChild(f_p[0])
        doc.ban_van.loi_nguyen_tin_huu = div.innerHTML
      }

      if(loi_nguyen_tien_le != undefined){
        div.innerHTML = loi_nguyen_tien_le
        let f_p = div.getElementsByTagName('p')      
        div.removeChild(f_p[0])
        doc.ban_van.loi_nguyen_tien_le = div.innerHTML
      }

      if(ca_hiep_le != undefined){
        div.innerHTML = ca_hiep_le
        let f_p = div.getElementsByTagName('p')      
        div.removeChild(f_p[0])
        doc.ban_van.ca_hiep_le = div.textContent
      }

      if(loi_nguyen_hiep_le != undefined){
        div.innerHTML = loi_nguyen_hiep_le
        let f_p = div.getElementsByTagName('p')      
        div.removeChild(f_p[0])
        doc.ban_van.loi_nguyen_hiep_le = div.innerHTML
      }
      console.log(doc)
      try{        
        await ngayle.updateOne({_id: new this.mongo.ObjectId(request.query._id)},{$set: doc})
        return reply.view('admin/bien-tap-ban-van.ejs', { u: doc})
      }catch(err){
        return err
      }
      
    }else{
      console.log("_id does not exist")
      return reply.view('admin/bien-tap-ban-van.ejs')
    }
    // try{    
    //   let col = await ngayle.find({}).toArray();       
    //   return reply.view('admin/src/bien-tap-ban-van.ejs', { ngay_le: col})
    // }catch(err){
    //   return err
    // }
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
    const {_id, title, date, assigned_date, week, season, url, bac_le, mau_ao_le} = request.query
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
    // if(ban_van != undefined){
    //   doc.ban_van = ban_van
    // }
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
  fastify.get('/get-calendar', async function (request, reply) {
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
            if(arr_cac_le[j].title.toLowerCase().localeCompare(prev_month[index].title.toLowerCase()) == 0){
              let tmp = arr_cac_le[0]
              arr_cac_le[0] = arr_cac_le[j]
              arr_cac_le[j] = tmp
              //break
            }
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
            if(arr_cac_le[j].title.toLowerCase().localeCompare(cur_month[index].title.toLowerCase()) == 0){
              let tmp = arr_cac_le[0]
              arr_cac_le[0] = arr_cac_le[j]
              arr_cac_le[j] = tmp
              //break
            }
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
          cur_month[index].arr_cac_le = arr_cac_le
          prev_month.push(cur_month[index])
        }
        for (let index = 0; index < nxt_month.length; index++) {
          const element = nxt_month[index].date;
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
            if(arr_cac_le[j].title.toLowerCase().localeCompare(nxt_month[index].title.toLowerCase()) == 0){
              let tmp = arr_cac_le[0]
              arr_cac_le[0] = arr_cac_le[j]
              arr_cac_le[j] = tmp
              //break
            }
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
          nxt_month[index].arr_cac_le = arr_cac_le
          prev_month.push(nxt_month[index])
          
        }
        
        return {cur_month: prev_month, prev_month: [], nxt_month: []}
      }else{
        reply.code(400).send({ error: 'Missing required parameter: date or month' });
      }                  
      
    } catch (err) {
      return err
    }
  });
  fastify.get('/get-one-day', async function (request, reply) {
    const tb_lich = this.mongo.db.collection('lich-cong-giao')
    const ngay_le = this.mongo.db.collection('ngay-le')

    // const tb_ngayle = this.mongo.db.collection('ngay-le')
    // if the id is an ObjectId format, you need to create a new ObjectId
    //const id = this.mongo.ObjectId(req.params.id)
    const {day} = request.query
    let a_date = new Date(day)
    //console.log(`${_id}`)
    try {
      if(day != undefined && !isNaN(a_date)){
        let a_date = new Date(day)
        let year = a_date.getFullYear()
        let month = a_date.getMonth()+1
        let d = a_date.getDate()
        if(month < 10){
          month = "0"+month
        }
        if(d < 10){
          d = "0"+d
        }
        let day_string = year+"-"+month+"-"+d
        let today = await tb_lich.findOne({date: day_string})
        let arr_cac_le = await ngay_le.find({['assigned_date.'+a_date.getFullYear()]:day_string}).toArray()
        
        for (let j = 0; j < arr_cac_le.length; j++) {
            if((arr_cac_le[j].ban_van.bd1_chan_trich_tu != ""&& arr_cac_le[j].ban_van.bd1_chan_trich_tu != undefined) && a_date.getFullYear()%2==0){
              arr_cac_le[j].ban_van.bd1_le = arr_cac_le[j].ban_van.bd1_chan
              arr_cac_le[j].ban_van.bd1_le_trich_tu = arr_cac_le[j].ban_van.bd1_chan_trich_tu
              arr_cac_le[j].ban_van.cau_bd1_le_tom_gon = arr_cac_le[j].ban_van.cau_bd1_chan_tom_gon

              arr_cac_le[j].ban_van.dap_ca_le_trich_tu = arr_cac_le[j].ban_van.dap_ca_chan_trich_tu
              arr_cac_le[j].ban_van.dap_ca_le = arr_cac_le[j].ban_van.dap_ca_chan

            }
            //arr_cac_le[j].ban_van.bd1_le_trich_tu.replace(/\((?i:năm)\s*(?:II|2)\)/,'').replace(/\((?i:năm)\s*(?:I|1)\)/,'')

            if(arr_cac_le[j].title.toLowerCase().localeCompare(today.title.toLowerCase()) == 0){
              console.log("switching: "+arr_cac_le[j].title+ " with "+ arr_cac_le[0].title)
              let tmp = arr_cac_le[0]
              arr_cac_le[0] = arr_cac_le[j]
              arr_cac_le[j] = tmp
              //break
            }
            // console.log(arr_cac_le[j].ban_van.bd1_le)
            
          }
          today.arr_cac_le = arr_cac_le

        return today
      }else{
        reply.code(400).send({ error: 'Missing required parameter: date' });
      }                  
      
    } catch (err) {
      return err
    }
  });
  fastify.get('/get-calendar-year', async function (request, reply) {
    const tb_lich = this.mongo.db.collection('lich-cong-giao')
    try {

      let year = await tb_lich.find({}).project({date: 1, mau_ao_le: 1, bac_le: 1}).sort({date: 1}).toArray()


      return year
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
  fastify.get('/nghi-thuc-edit', async function (request, reply) {
    const tb_nghi_thuc = this.mongo.db.collection('nghi-thuc')
    const {_id} = request.query
    if(_id != undefined){

      try{
        let nghi_thuc =  await tb_nghi_thuc.findOne({_id:new this.mongo.ObjectId(_id)})
        return reply.view('nghi-thuc/nghi-thuc-edit.ejs',{nghi_thuc:nghi_thuc})
      }catch(err){
        return err
      }
    }else{
      let nghi_thuc =  await tb_nghi_thuc.find({}).toArray()
      try{
        return reply.view('nghi-thuc/nghi-thuc-edit.ejs',{nghi_thuc:nghi_thuc})
      }catch(err){
        return err
      }
    }
  });
  fastify.get('/kinh-nguyen-edit', async function (request, reply) {
    const tb_kinh_nguyen = this.mongo.db.collection('kinh-nguyen')
    const {_id} = request.query
    if(_id != undefined){

      try{
        let kinh_nguyen =  await tb_kinh_nguyen.findOne({_id:new this.mongo.ObjectId(_id)})
        return reply.view('nghi-thuc/kinh-nguyen-edit.ejs',{kinh_nguyen:kinh_nguyen})
      }catch(err){
        return err
      }
    }else{
      let kinh_nguyen =  await tb_kinh_nguyen.find({}).toArray()
      try{
        return reply.view('nghi-thuc/kinh-nguyen-edit.ejs',{kinh_nguyen:kinh_nguyen})
      }catch(err){
        return err
      }
    }
  });
  fastify.get('/save-code', async function (request, reply) {
    
    try{
      return reply.view('nghi-thuc/save-code.ejs')
    }catch(err){
      return err
    }
  });
  fastify.get('/get-nghi-thuc', async function (request, reply) {
    const tb_nghi_thuc = this.mongo.db.collection('nghi-thuc')
    let nghi_thuc =  await tb_nghi_thuc.find({}).toArray()
    try{
      return nghi_thuc
    }catch(err){
      return err
    }
  });
  fastify.get('/get-kinh-nguyen', async function (request, reply) {
    const tb_kinh_nguyen = this.mongo.db.collection('kinh-nguyen')
    let kinh_nguyen =  await tb_kinh_nguyen.find({}).toArray()
    
    
    try{
      return kinh_nguyen
    }catch(err){
      return err
    }
  });
  fastify.get('/get-kinh-nguyen-grouped', async function (request, reply) {
    const tb_kinh_nguyen = this.mongo.db.collection('kinh-nguyen')
    let kinh_nguyen =  await tb_kinh_nguyen.find({}).toArray()
    let r_kinh = {}
    for (let i = 0; i < kinh_nguyen.length; i++) {
      const element = kinh_nguyen[i];
      
      let key = element.group
      if(key != undefined && key != ''){
        key = removeVietnameseTones(key)
        key = key.toLowerCase().replace(/[^a-z0-9 -]/g, '').replace(/\s+/g, '_').replace(/-+/g, '_');  

        if(r_kinh[`${key}`] == undefined){
          r_kinh[`${key}`] = {}
          r_kinh[`${key}`].data = []
          r_kinh[`${key}`].level = 1
          r_kinh[`${key}`].title = element.group
          r_kinh[`${key}`]._id = i
        }
        delete element["group"]
        r_kinh[`${key}`].data.push(element)
        
        //delete r_kinh[`${key}`].data[r_kinh[`${key}`].length-1]["group"]
      }else{
        let key = element.title
        key = removeVietnameseTones(key)
        key = key.toLowerCase().replace(/[^a-z0-9 -]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-');
        r_kinh[`${key}`] = {}
        r_kinh[`${key}`].data = element
        r_kinh[`${key}`].level = 0
        r_kinh[`${key}`].title = element.title
        r_kinh[`${key}`]._id = i        
      }
      
    }
    try{
      return r_kinh
    }catch(err){
      return err
    }
  });  
  fastify.get('/get-nghi-thuc-grouped', async function (request, reply) {
    const tb_nghi_thuc = this.mongo.db.collection('nghi-thuc')
    let nghi_thuc =  await tb_nghi_thuc.find({}).toArray()
    let r_kinh = {}
    for (let i = 0; i < nghi_thuc.length; i++) {
      const element = nghi_thuc[i];
      
      let key = element.group
      if(key != undefined && key != ''){
        key = removeVietnameseTones(key)
        key = key.toLowerCase().replace(/[^a-z0-9 -]/g, '').replace(/\s+/g, '_').replace(/-+/g, '_');  

        if(r_kinh[`${key}`] == undefined){
          r_kinh[`${key}`] = {}
          r_kinh[`${key}`].data = []
          r_kinh[`${key}`].level = 1
          r_kinh[`${key}`].title = element.group
          r_kinh[`${key}`]._id = i
        }
        delete element["group"]
        r_kinh[`${key}`].data.push(element)
        
        //delete r_kinh[`${key}`].data[r_kinh[`${key}`].length-1]["group"]
      }else{
        let key = element.title
        key = removeVietnameseTones(key)
        key = key.toLowerCase().replace(/[^a-z0-9 -]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-');
        r_kinh[`${key}`] = {}
        r_kinh[`${key}`].data = [element]
        r_kinh[`${key}`].level = 0
        r_kinh[`${key}`].title = element.title
        r_kinh[`${key}`]._id = i        
      }
      
    }
    try{
      return r_kinh
    }catch(err){
      return err
    }
  });
  fastify.get('/notification', async function (request, reply) {
    return reply.view('admin/notification.ejs')
  })

  fastify.post('/push-notif', async function (request, reply) {
    
    let bd = request.body.message
    let title = request.body.title
    if(!bd || !title){
      return reply.code(500).send({ error: "Not Finding title or message" });
    }

    console.log(bd)
    console.log(title)

    let cmd = `curl --location 'http://localhost:3456/notification/push/all' \--header 'Content-Type: application/json' \--data '{\"title\": \"${title}\",\"body\": \"${bd}\"}'`
    console.log("Executing command: "+cmd)
    
    return new Promise((resolve, reject) => {
      exec(cmd, (error, stdout, stderr) => {
        if (error) {
          console.error(`exec error PPP: ${error}`);
          reply.code(500).send({ error: stderr });
          reject(error);
        } else {
          reply.send({ output: stdout });
          resolve(stdout);
        }
      });
    });
  });

  // Cleanup All Cron tasks on close
  fastify.addHook('onClose', async () => {
    console.log("Cleanup All Cron tasks on close")
    cron_tasks.forEach(task => task.stop());
  });

  fastify.get('/add-cronj', async function (request, reply) {
    if('data' in request.query && 'title' in request.query){
      let title = request.query.title
      let data = request.query.data
      cron_tasks.push(cron.schedule('15 11 * * 2', function(){
        console.log('Running a task every 1 minutes');
        console.log('title: '+ title)
        console.log("data: "+data)
        
        // Your scheduled task logic here
      }))
    }
    return reply.view('admin/notif-scheduling.ejs',{cron_tasks: cron_tasks })
  });

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