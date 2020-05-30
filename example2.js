/* eslint-disable linebreak-style */
var express = require('express');
var app = express();
var server = require('http').Server(app);
var request = require('request');
var io = require('socket.io')(server);
var moment = require('moment');
var qrw = null;
var tokenHoy = null;

var utmObj = require('utm-latlng');
var UTM=new utmObj(); //Default Ellipsoid is 'WGS 84'

app.use(express.static('public'));

app.get('/demo',(req,res)=>{
    res.status('200').send('ok, listo');
});


const fs = require('fs');
const { Client, Location } = require('./index');


const SESSION_FILE_PATH = './sessionnnxx.json';
let sessionCfg;
if (fs.existsSync(SESSION_FILE_PATH)) {
    sessionCfg = require(SESSION_FILE_PATH);
}


const client = new Client({ puppeteer: { headless: true },session:sessionCfg});
// You can use an existing session and avoid scanning a QR code by adding a "session" object to the client options.
// This object must include WABrowserId, WASecretBundle, WAToken1 and WAToken2.

//client.initialize();

client.on('qr', (qr) => {
    // NOTE: This event will not be fired if a session is specified.
    qrw = qr;
    console.log('QR RECEIVED', qr);
    //console.log("nuevo qr",qrw);
});

client.on('authenticated', (session) => {
    console.log('AUTHENTICATED', session);
    //sessionCfg=session;
    fs.writeFile(SESSION_FILE_PATH, JSON.stringify(session), function (err) {
        if (err) {
            console.error(err);
        }
    });
});

client.on('auth_failure', msg => {
    // Fired if session restore was unsuccessfull
    client.pupBrowser==null;
    client.pupBrowser==null;
    client.options.session=false;    
    if (fs.existsSync(SESSION_FILE_PATH)) {
        fs.unlink(SESSION_FILE_PATH, (err) => {
            if (err) {
                console.error(err);
            }
        });
    }
    console.error('AUTHENTICATION FAILURE', msg);
});

client.on('ready', () => {
    console.log('READY');
});

client.on('message', async msg => {
    console.log('mensaje recibido de:',msg.from+' y dice: '+msg.body);
    console.log('MESSAGE RECEIVED', msg);

    if (msg.body == '!ping reply') {
        // Send a new message as a reply to the current one
        msg.reply('pong');

    } else if (msg.body == '!ping') {
        // Send a new message to the same chat
        console.log('Enviado desde: '+msg.from);
        client.sendMessage(msg.from, 'pong');

    } else if (msg.body.startsWith('!sendto ')) {
        // Direct send a new message to specific id
        let number = msg.body.split(' ')[1];
        let messageIndex = msg.body.indexOf(number) + number.length;
        let message = msg.body.slice(messageIndex, msg.body.length);
        number = number.includes('@c.us') ? number : `${number}@c.us`;
        let chat = await msg.getChat();
        chat.sendSeen();
        console.log(number);
        client.sendMessage(number, message);

    } else if (msg.body.startsWith('!subject ')) {
        // Change the group subject
        let chat = await msg.getChat();
        if (chat.isGroup) {
            let newSubject = msg.body.slice(9);
            chat.setSubject(newSubject);
        } else {
            msg.reply('This command can only be used in a group!');
        }
    } else if (msg.body.startsWith('!echo ')) {
        // Replies with the same message
        msg.reply(msg.body.slice(6));
    } else if (msg.body.startsWith('!desc ')) {
        // Change the group description
        let chat = await msg.getChat();
        if (chat.isGroup) {
            let newDescription = msg.body.slice(6);
            chat.setDescription(newDescription);
        } else {
            msg.reply('This command can only be used in a group!');
        }
    } else if (msg.body == '!leave') {
        // Leave the group
        let chat = await msg.getChat();
        if (chat.isGroup) {
            chat.leave();
        } else {
            msg.reply('This command can only be used in a group!');
        }
    } else if (msg.body.startsWith('!join ')) {
        const inviteCode = msg.body.split(' ')[1];
        try {
            await client.acceptInvite(inviteCode);
            msg.reply('Joined the group!');
        } catch (e) {
            msg.reply('That invite code seems to be invalid.');
        }
    } else if (msg.body == '!groupinfo') {
        let chat = await msg.getChat();
        if (chat.isGroup) {
            msg.reply(`
                *Group Details*
                Name: ${chat.name}
                Description: ${chat.description}
                Created At: ${chat.createdAt.toString()}
                Created By: ${chat.owner.user}
                Participant count: ${chat.participants.length}
            `);
        } else {
            msg.reply('This command can only be used in a group!');
        }
    } else if (msg.body == '!chats') {
        const chats = await client.getChats();
        client.sendMessage(msg.from, `The bot has ${chats.length} chats open.`);
    } else if (msg.body == '!info') {
        let info = client.info;
        client.sendMessage(msg.from, `
            *Connection info*
            User name: ${info.pushname}
            My number: ${info.me.user}
            Platform: ${info.platform}
            WhatsApp version: ${info.phone.wa_version}
        `);
    } else if (msg.body == '!mediainfo' && msg.hasMedia) {
        const attachmentData = await msg.downloadMedia();
        msg.reply(`
            *Media info*            
            MimeType: ${attachmentData.mimetype}
            Filename: ${attachmentData.filename}
            Data (length): ${attachmentData.data.length}
        `);
    } else if (msg.body == '!quoteinfo' && msg.hasQuotedMsg) {
        const quotedMsg = await msg.getQuotedMessage();

        quotedMsg.reply(`
            ID: ${quotedMsg.id._serialized}
            Type: ${quotedMsg.type}
            Author: ${quotedMsg.author || quotedMsg.from}
            Timestamp: ${quotedMsg.timestamp}
            Has Media? ${quotedMsg.hasMedia}
        `);
    } else if (msg.body == '!resendmedia' && msg.hasQuotedMsg) {
        const quotedMsg = await msg.getQuotedMessage();
        if (quotedMsg.hasMedia) {
            const attachmentData = await quotedMsg.downloadMedia();
            client.sendMessage(msg.from, attachmentData, { caption: 'Here\'s your requested media.' });
        }
    } else if (msg.body == '!location') {
        msg.reply(new Location(37.422, -122.084, 'Googleplex\nGoogle Headquarters'));
    } else if (msg.location) {
        msg.reply(msg.location);
    } else if (msg.body.startsWith('!status ')) {
        const newStatus = msg.body.split(' ')[1];
        await client.setStatus(newStatus);
        msg.reply(`Status was updated to *${newStatus}*`);
    } else if (msg.body == '!mention') {
        const contact = await msg.getContact();
        const chat = await msg.getChat();
        chat.sendMessage(`Hi @${contact.number}!`, {
            mentions: [contact]
        });
    } else if (msg.body == '!delete' && msg.hasQuotedMsg) {
        const quotedMsg = await msg.getQuotedMessage();
        if (quotedMsg.fromMe) {
            quotedMsg.delete(true);
        } else {
            msg.reply('I can only delete my own messages');
        }
    } else if (msg.body === '!archive') {
        const chat = await msg.getChat();
        chat.archive();
    } else if (msg.body === '!typing') {
        const chat = await msg.getChat();
        // simulates typing in the chat
        chat.sendStateTyping();        
    } else if (msg.body === '!recording') {
        const chat = await msg.getChat();
        // simulates recording audio in the chat
        chat.sendStateRecording();        
    } else if (msg.body === '!clearstate') {
        const chat = await msg.getChat();
        // stops typing or recording in the chat
        chat.clearState();        
    }
});

client.on('message_create', (msg) => {
    // Fired on all message creations, including your own
    if (msg.fromMe) {
        // do stuff here
        console.log(msg);
    }
});

client.on('message_revoke_everyone', async (after, before) => {
    // Fired whenever a message is deleted by anyone (including you)
    console.log(after); // message after it was deleted.
    if (before) {
        console.log(before); // message before it was deleted.
    }
});

client.on('message_revoke_me', async (msg) => {
    // Fired whenever a message is only deleted in your own view.
    console.log(msg.body); // message before it was deleted.
});

client.on('message_ack', (msg, ack) => {
    /*
        == ACK VALUES ==
        ACK_ERROR: -1
        ACK_PENDING: 0
        ACK_SERVER: 1
        ACK_DEVICE: 2
        ACK_READ: 3
        ACK_PLAYED: 4
    */

    if(ack == 3) {
        // The message was read
    }
});

client.on('group_join', (notification) => {
    // User has joined or been added to the group.
    console.log('join', notification);
    notification.reply('User joined.');
});

client.on('group_leave', (notification) => {
    // User has left or been kicked from the group.
    console.log('leave', notification);
    notification.reply('User left.');
});

client.on('group_update', (notification) => {
    // Group picture, subject or description has been updated.
    console.log('update', notification);
});

client.on('change_battery', (batteryInfo) => {
    // Battery percentage for attached device has changed
    const { battery, plugged } = batteryInfo;
    console.log(`Battery: ${battery}% - Charging? ${plugged}`);
});

client.on('disconnected', (reason) => {
    console.log('Client was logged out', reason);
    client.pupBrowser==null;
    client.options.session=false;

    if (fs.existsSync(SESSION_FILE_PATH)) {
        fs.unlink(SESSION_FILE_PATH, (err) => {
            if (err) {
                console.error(err);
            }else{               
                console.log('SE CERRO TODO');
            }
        });
    }

});


io.on('connection',(socket)=>{
    console.log('Nueva conexion');

    socket.on('iniciar',(data) =>{
        
        if(client.pupBrowser==null){
            client.initialize();
            socket.emit('iniciar','se inicio el cliente ');
        }else{
            socket.emit('iniciar','El cliente ya estaba iniciado');
        }
        
    });

    function new_qr(qr){

    }
    client.on('NEW_QR', (qr) => {
        // NOTE: This event will not be fired if a session is specified.
       
        //console.log('QR RECEIVED', qr);
        console.log('Enviando el nuevo qr');
        socket.emit('mesaje1',qr);
    });


    socket.on('msg',(data)=>{
        socket.emit('mesaje1',qrw);
        qrw=null;
    });

    //socket.emit("mesaje1",qrw);

    //recepcion para el envio del mensaje
    socket.on('envio_msg', (data)=>{
        
        if(client.pupBrowser!=null){      
            buscar_data(data.msg,function(resp){
                var mensa = resp.respuesta.replace(/([\ \t]+(?=[\ \t])|^\s+|\s+$)/g, '');

                if(resp.error!=""){
                    client.sendMessage(data.numero, resp.error);
                }else{
                    client.sendMessage(data.numero, mensa);
                    if(resp.location.length>0){
                        var loca = new Location(resp.location[0],resp.location[1]);
                        client.sendMessage(data.numero, loca);
                    }

                }
                //resp = resp.replace(/([\ \t]+(?=[\ \t])|^\s+|\s+$)/g, '');
                //console.log('ESTO ES LA BUSQUEDA: '+resp);
                //var loca = new Location(-11.925729751586914,-77.05916595458984,resp);
               
            });          
            
            //await client.sendMessage(data.numero, data.msg+": "+resp);
            
            console.log('se esta enviado algun mensaje para el # '+data.numero);
        }else{
            console.log('falta inicializar el cliente wha');
        }
    });

    //cerrar la seccion actual
    socket.on('cerrar_total',()=>{
        
        if (fs.existsSync(SESSION_FILE_PATH)) {
            fs.unlink(SESSION_FILE_PATH, (err) => {
                if (err) {
                    console.error(err);
                }else{
                    if(client.pupBrowser!=null)
                        client.destroy();

                    console.log('SE CERRO TODO');
                }
            });
        }
    });
});

function obtenerToken(){
    var options = {method: 'POST',
        url: 'http://gisprd.sedapal.com.pe/arcgis/tokens/generateToken',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        form: { username: 'gisweb', password: 'AbCd123.',expiration:1400,referer: '',ip: '',client:'requestip', grant_type: ''  } 
    };
    request(options, function (error, response, body) {
        if (error) throw new Error(error);     
        let fecha = new moment().format('DD-MM-YYYY');
        //console.log('hora: '+fecha);
        require('fs').writeFile('token.txt', fecha+'|'+body, {flag: 'w+'}, (err) => {
            if (err) { throw err; }
            tokenHoy=body;
            console.log('Token guardado correctamente: '+body);
        });
    });
}

require('fs').readFileSync('token.txt', 'utf-8').split(/\r?\n/).forEach( async function(line){
    //console.log('token: ',line.length);

    if(line.length==0){
        await obtenerToken();
        return;
    }

    let fecha = new moment().format('DD-MM-YYYY');
    if(fecha!=line.split('|')[0]){
        require('fs').unlink('token.txt',async (err)=>{
            if(err)console.log('no se pudo eliminar');
            else 
                await obtenerToken();
        });        
    }else{
        tokenHoy=line.split('|')[1];
    }            
});

function buscar_data(nis, callback){
    console.log(tokenHoy);
    //console.log("Se va a buscar esto: "+nis);    
    //http://gisprd.sedapal.com.pe/arcgis/tokens/generateToken    //'username' => "gisweb",  //'password' => "AbCd123.",
    //var url_ruta = 'http://gisprd.sedapal.com.pe/arcgis/rest/services/ConexDomSGC/MapServer/0/query?where=SUPPLYID+%3D%27'+nis+'%27&relationParam=&outFields=NOM_MUNIC%2CNOM_CALLE%2CNUM_PUERTA%2CDUPLICADOR%2CNUM_APA%2CDIAMETRO_CONEXION%2CDESC_EST_SUM&returnGeometry=false&returnTrueCurves=false&returnIdsOnly=false&returnCountOnly=false&returnZ=false&returnM=false&returnDistinctValues=false&resultRecordCount=1&f=pjson&token='+tokenHoy;
    var url_ruta2= `http://gisprd.sedapal.com.pe/arcgis/rest/services/AguaPotable/MapServer/35/query?where=SUPPLYID+IN+(%27${nis}%27)+&relationParam=&outFields=NOM_CALLE,NUM_PUERTA,DUPLICADOR,NOM_LOCAL,NOM_MUNIC,DESC_EST_SUM,NUM_APA,DIAMETRO_CONEXION,COD_SECTOR,IMP_TOT_REC,FRECUENCIA&returnGeometry=true&returnTrueCurves=false&returnIdsOnly=false&returnCountOnly=false&returnZ=false&returnM=false&returnDistinctValues=false&resultRecordCount=&f=pjson`;
    
    console.log(url_ruta2);
    request.get(url_ruta2,{},  (error,res,body)=>{
    
        if (error) {  console.log(error);  return ;   }
        
        var data2  = JSON.parse(body);  
        console.log(data2['features']);
        //console.log('NIS encontrados: '+ data2['features'].length);

       
       
        var respuesta = {'respuesta':'','error':'','location':[]};
        if (typeof data2.error !== 'undefined') {
            //console.log("error cuando se produce un error: "+data2.error);
            respuesta.error = 'Error detectado: '+data2.error.message;
            //return;
        }else{

            if(data2['features'].length > 0){
                var coo = data2['features'][0].geometry;
                //console.log(coo);
                var ress = UTM.convertUtmToLatLng(coo.x, coo.y, 18,'ss');
                console.log('Esto son las coordenadas => ',ress);

                var obj = [];
                obj = data2['features'][0].attributes;
                //console.log(obj.NOM_CALLE);
                respuesta.respuesta = ` *NIS: ${nis}* => *${obj.NUM_APA}*
                            \`\`\`DIR: ${obj.NOM_CALLE} ${obj.NUM_PUERTA==0?'':obj.NUM_PUERTA} ${obj.DUPLICADOR} - ${obj.NOM_MUNIC}\`\`\`
                            \`\`\`DIA: ${obj.DIAMETRO_CONEXION}MM\`\`\`
                            \`\`\`EST: ${obj.DESC_EST_SUM.toUpperCase()}\`\`\``;

                if(ress.lat!="" && ress.lng!=""){
                    respuesta.location=[ress.lat,ress.lng];
                }
                
            }      

        }

         
        
        callback(respuesta);
        //var obj2 = data2['features'][0].attributes;
        //console.log(obj2);
    });
}

//obtenerToken();
server.listen(7070,()=>{
    console.log('servidor corriendo el puerto 7070');
});
