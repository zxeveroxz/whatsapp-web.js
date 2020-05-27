const puppeteer = require('puppeteer');
let now2 = moment = require('moment');
var request = require('request');
const devices = require('puppeteer/DeviceDescriptors');
const path = require('path');
const config = require('./config.js');

const tmpPath = path.resolve(__dirname, config.data_dir);
const networkIdleTimeout = 30000;
const stdin = process.stdin;
const headless = !config.window;

try{
//const chromeOptions = {   headless:false,   defaultViewport: null};
const chromeOptions = {
  headless: headless,
  //executablePath: executablePath,
  userDataDir: tmpPath,
  ignoreHTTPSErrors: true,
  args: [
    '--log-level=3', // fatal only
    //'--start-maximized',
    '--no-default-browser-check',
    '--disable-infobars',
    '--disable-web-security',
    '--disable-site-isolation-trials',
    '--no-experiments',
    '--ignore-gpu-blacklist',
    '--ignore-certificate-errors',
    '--ignore-certificate-errors-spki-list',
    '--disable-gpu',
    '--disable-extensions',
    '--disable-default-apps',
    '--enable-features=NetworkService',
    '--disable-setuid-sandbox',
    '--no-sandbox'
  ]
}

  var i = 0;   var browser;   var page;

 async function inicio(){

  var current_time = new now2().format("HH:mm DD/MM/YYYY");
   console.log(current_time);

    global.browser = await puppeteer.launch(chromeOptions);    
    global.page = await global.browser.newPage();
    
    await global.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/69.0.3497.100 Safari/537.36 OPR/56.0.3051.52');
    await global.page.setViewport({ width: 800, height: 600 });
    //await global.page.setRequestInterception(true);
    //await page.emulate(devices['iPhone 6']);
    await global.page.goto('https://web.whatsapp.com/', {waitUntil: 'networkidle2', timeout: 0});    
    await buscar();
 }; 

 async function enviar_sms(mensaje) {
  await global.page.waitFor(500);
  await global.page.waitForSelector('.copyable-text[data-tab="1"]');
  await global.page.click('.copyable-text[data-tab="1"]');
  await global.page.type('.copyable-text[data-tab="1"]',mensaje+String.fromCharCode(13),{delay: 1});
  }

 function buscar_data(nis,obj,i,tipo){

    //http://gisprd.sedapal.com.pe/arcgis/tokens/generateToken
    //'username' => "gisweb",
    //'password' => "AbCd123.",
 request.get("http://gisprd.sedapal.com.pe/arcgis/rest/services/ConexDomSGC/MapServer/0/query?where=SUPPLYID+%3D%27"+nis+"%27&relationParam=&outFields=NOM_MUNIC%2CNOM_CALLE%2CNUM_PUERTA%2CDUPLICADOR%2CNUM_APA%2CDIAMETRO_CONEXION%2CDESC_EST_SUM&returnGeometry=false&returnTrueCurves=false&returnIdsOnly=false&returnCountOnly=false&returnZ=false&returnM=false&returnDistinctValues=false&resultRecordCount=1&f=pjson&token=BzSwYEZ9FNshy0C5ICQFhbwql8PKZFkAWco6_XY_Qp_gPDafaSiuUpFHK-BGaqWk",{}, async (error,res,body)=>{
    var current_time = new now2().format("HH:mm DD/MM/YYYY");
    if (error) {  console.log(error); Console.log(" "+current_time);  return ;   }

    var data2  = JSON.parse(body);    
    setTimeout(async function() {
        //console.log(data2["features"]);
      var obj2 = data2["features"][0].attributes

        var respuesta =  respuesta="*TIPO*: "+obj.VDSC_INCIDENCIA+"\n"+
                            "*DISTRITO:* "+obj2.NOM_MUNIC.trim()+"\n"+
                            "*TIEMPO:* "+obj.TIEMPO+" HORA(S)\n"+
                            "*DETALLES:* "+obj.VOBSERVACION.trim()+"; NIS:"+obj.NIS_RAD+ "\n"+
                            //"*DIRECCION:* "+obj2.NOM_CALLE.trim()+" "+obj2.NUM_PUERTA+"-"+obj2.DUPLICADOR.trim()+
                            "\t";
        

      await enviar_sms(respuesta);
    },1000 +(i*2500));

  });
}


  async function   buscar(){

    await global.page.waitFor(20000);
    var current_time = new now2().format("HH:mm DD/MM/YYYY");
    console.log("\nBUSCANDO CONTACTO "+current_time);
    //await page.mouse.click(140, 103, { button: 'left' });
    await global.page.waitForSelector('.copyable-text[data-tab="3"]');
    await global.page.click('.copyable-text[data-tab="3"]');
    await global.page.type('.copyable-text[data-tab="3"]',"Gerencia Sur");
    await global.page.waitFor(1500);
    await global.page.type('.copyable-text[data-tab="3"]',String.fromCharCode(13));
    await global.page.waitFor(500);

    let now= new Date();
    //await global.page.keyboard.type("INICIANDO BOOT "+ now +String.fromCharCode(13));
    var current_time = new now2().format("HH:mm DD/MM/YYYY");
    console.log("BUSCANDO INCIDENCIAS "+current_time);
    await global.page.waitFor(2500);
    var respuesta="...";

    //echo urlencode("NCOD_CENTRO IN(7,8) AND NTIP_RED=1 AND ESTADO IN('TRABAJANDO') AND NCOD_INCIDENCIA > 475500");

    request.get('http://gisprd.sedapal.com.pe/arcgis/rest/services/SGIONEWINCI/MapServer/16/query?where=NCOD_CENTRO+%IN287%2C8%29+AND+NTIP_RED%3D1+AND+ESTADO+IN%28%27TRABAJANDO%27%29+AND+NCOD_INCIDENCIA+%3E+475500&text=&objectIds=&time=&geometry=&geometryType=esriGeometryEnvelope&inSR=&spatialRel=esriSpatialRelIntersects&relationParam=&outFields=*&returnGeometry=true&returnTrueCurves=false&maxAllowableOffset=&geometryPrecision=&outSR=&having=&returnIdsOnly=false&returnCountOnly=false&orderByFields=&groupByFieldsForStatistics=&outStatistics=&returnZ=false&returnM=false&gdbVersion=&historicMoment=&returnDistinctValues=false&resultOffset=&resultRecordCount=&queryByDistance=&returnExtentOnly=false&datumTransformation=&parameterValues=&rangeValues=&quantizationParameters=&f=pjson', {},
    async (error, res, body) => {
    
        if (error) {  console.error(error);  return ;   }

        var data  = JSON.parse(body);
        let now= new now2().format("HH:mm DD/MM/YYYY");
        if(data["features"].length > 0 ){
            await enviar_sms("*LISTADO DE INCIDENCIAS: "+now+"*\n");

                for(var i=0;i<data["features"].length; i++){
                var obj = data["features"][i].attributes;
                
                    await global.page.waitFor(15000);
                    await enviar_sms("*********     INCIDENCIA # "+(i+1)+"   *********\n");
                    
                    var obj2 =  await buscar_data(obj.NIS_RAD, obj,i,"A") ;  
                    var current_time = new now2().format("HH:mm DD/MM/YYYY");
                    console.log("Enviando: "+obj.NIS_RAD+" "+current_time)    ;
                    await global.page.waitFor(500);
                }
            }
        
            setTimeout(async function (){ await buscar();  },3240000);//<= aumentar tiempo cada 60000 es 2 minuto    
    
    });

    


}



inicio();

  setTimeout(async function (){
    //await buscar();
  },800000);

}catch(error){
  buscar();
}