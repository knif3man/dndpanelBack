const express = require('express');
var cors = require('cors')
const sqlite3 = require('sqlite3').verbose();


const PORT = 3010;
const app = express();


let db = new sqlite3.Database('./db/DND_base.db', (err) => {
    if (err) {
      console.error(err.message);
    }
    console.log('Connected to the DND_base database.');
});


app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', '*');
    next();
});

app.use(express.json());


app.post('/api/login', cors(), async(req, res) => {

    if(req.body.user && req.body.password){
        const {username,password} = req.body
        await db.all('SELECT passwd,status FROM users WHERE nick = ?', [req.body.user], function(err, rows) {
            res.setHeader('Content-Type','application/json')
            if (rows.length != 0){
                
                if(rows[0].passwd == req.body.password) {    
                    if(rows[0].status == 'gm'){
                        res.send({error:'',status:true,gm:true})
                    }else {
                        res.send({error:'',status:true,gm:false})
                    }
                
                } else {
                    res.send({error:'Неправильный пароль',status:false,gm:false})
                }
            } else {
                res.send({error:'Нет такого пользователя',status:false,gm:false})
            }
    
        })
    }
});



app.post('/api/getChar', cors(), async(req, res) => {
    await db.all('SELECT characters.char_name,characters.MAX_HP,characters.CURRENT_HP,characters.EXP,characters.GOLD,characters.LVL,xp_levels.xp_value FROM characters INNER JOIN xp_levels ON characters.LVL + 1 = xp_levels.level', function(err, rows) {
        res.setHeader('Content-Type','application/json')
        res.send(rows.filter(row=>row.char_name.indexOf('RIP') == -1))
    })
})


app.post('/api/getCharsheet', cors(), async(req, res) => {
    await db.all('SELECT * FROM charsheets WHERE charname = ?', [req.body.charname], function(err, rows) {
        res.setHeader('Content-Type','application/json')
        res.send(rows)
    })
})

app.post('/api/saveCharData', cors(), async(req, res) => {
    try{
        for(let property in req.body){
            // console.log('"' + property + '"','"' + req.body[property].toString().replace(/\n/g,'@@@X') + '"')
            db.run('UPDATE charsheets SET "'+property+'" = "'+req.body[property].toString().replace(/\n/g,'@@@X')+'" WHERE charname = "'+req.body.charname+'"')

            if(property == 'maxhp'){
                try{
                    console.log('UPDATE characters SET "MAX_HP" = ? WHERE char_name = "'+req.body.charname+'"')
                    console.log(typeof parseInt(req.body[property]))
                    db.run('UPDATE characters SET "MAX_HP" = ? WHERE char_name = "'+req.body.charname+'"',[parseInt(req.body[property])])
                }catch(e){
                    console.log(e)
                }
            }
        }
    
        res.send({
            status:'Сохранено',
        })
    } catch(e){
        res.send({
            status:'Ошибка'
        })
    }
    
})

app.post('/api/changeCharacters', cors(), async(req, res) => {
    const characterToChange = Object.keys(req.body)
    console.log(req.body)
    for(let char of characterToChange){
        for(let prop in req.body[char]){
            if(req.body[char][prop] != ''){
                if(prop == 'CURRENT_HP'){
                    db.get('SELECT MAX_HP FROM characters WHERE char_name = "'+char+'"',(err,maxhp)=>{
                        db.all('\nSELECT ' + prop + ' FROM characters WHERE char_name = "' + char + '"',function(err, curhp) {
                            if((curhp[0][prop] + parseInt(req.body[char][prop]))>maxhp['MAX_HP']){
                                // console.log(rows[0][prop])
                                // console.log(prop,req.body[char][prop])
                                db.run('UPDATE characters SET ' + prop + ' = ' + (maxhp['MAX_HP']) + ' WHERE char_name = "' + char + '"')
                            } else {
                                db.run('UPDATE characters SET ' + prop + ' = ' + (curhp[0][prop] + parseInt(req.body[char][prop])) + ' WHERE char_name = "' + char + '"')
                            }
                            if((curhp[0][prop] + parseInt(req.body[char][prop]))<0){
                                db.run('UPDATE characters SET ' + prop + ' = ' + 0 + ' WHERE char_name = "' + char + '"')
                            }
                        })
                    })
                } else {
                    db.all('\nSELECT ' + prop + ' FROM characters WHERE char_name = "' + char + '"',function(err, curprop) {
                        db.run('UPDATE characters SET ' + prop + ' = ' + (curprop[0][prop] + parseInt(req.body[char][prop])) + ' WHERE char_name = "' + char + '"')
                    })
                }
                
            }
        }
    }
    res.send({status:'ok',changedCharacter:characterToChange})
})

app.get('/api/test',cors(),async (req,res) =>{
    res.send('ok')
})

app.listen(PORT, () => {
    console.log(`Server listening on ${PORT}`);
});