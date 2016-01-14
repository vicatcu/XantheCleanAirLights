var expressPromiseRouter = require("express-promise-router");
var router = expressPromiseRouter();
var Promise = require("bluebird");
var bhttp = Promise.promisifyAll(require("bhttp"));
var aqe = require('../airqualityegg')();


function urlParams(params){
  var ret = "";
  if(Object.keys(params).length > 0){ // if there are any optional params
    ret += '?';

    var encodeParams = Object.keys(params).map(function(key){
      if(key != "status") { // special case, not an OpenSensors parameter
        return key + '=' + params[key];
      }
    });

    ret += encodeParams.join('&');
  }
  return ret;
}

router.get('/', function(req, res){
  res.render('index', { title: 'Air Quality Dashboard' });
});

/* GET home page. */
router.post('/eggdata', function(req, res) {

  var API_BASE_URL = "https://api.opensensors.io";
  var API_MESSAGES_BY_DEVICE_PATH = "/v1/messages/device";
  var url = API_BASE_URL + API_MESSAGES_BY_DEVICE_PATH;
  var serialNumbers = req.body.serialNumbers; // an array of serial numbers
  var params = {
    "serial-numbers": serialNumbers
  };

  Promise.try(function () {
    return aqe(params);
  }).map(function (result) { // map for the data from each serial number
    // results look like: {
    //    serialNumber:xxx, messages: {
    //       topic1: [...]
    //       topic2: [...]
    //       topic3: [...]
    //    }
    var minlength = 1e10;
    var maxlength = 0;
    Object.keys(result.messages).forEach(function (key) {
      if (result.messages[key].length < minlength) {
        minlength = result.messages[key].length;
      }
      if (result.messages[key].length > maxlength) {
        maxlength = result.messages[key].length;
      }
    });

    if (minlength == 1e10 || maxlength == 0) {
      return null;
    }

    var temperature = 0.0, temperature_count = 0;
    var humidity = 0.0, humidity_count = 0;
    var no2_volts = 0.0, no2_count = 0;
    var no2_ppb = 0.0;
    var co_volts = 0.0, co_count = 0;
    var co_ppm = 0.0
    var o3_volts = 0.0, o3_count = 0;
    var o3_ppb = 0.0;
    var so2_volts = 0.0, so2_count = 0;
    var so2_ppb = 0.0;
    var pm_volts = 0.0, pm_count = 0;
    var pm_ugpm3 = 0.0;

    for (var ii = 0; ii < maxlength; ii++) {
      // everything reports temperature and humidity
      // use the temperature timestamp as the timestamp for the row
      if(ii < result.messages["/orgs/wd/aqe/temperature"].length) {
        if(!isNaN(result.messages["/orgs/wd/aqe/temperature"][ii]['converted-value'])) {
          temperature_count++;
          temperature += result.messages["/orgs/wd/aqe/temperature"][ii]['converted-value'];
        }
      }
      if(ii < result.messages["/orgs/wd/aqe/humidity"].length) {
        if(!isNaN(result.messages["/orgs/wd/aqe/humidity"][ii]['converted-value'])) {
          humidity_count++;
          humidity += result.messages["/orgs/wd/aqe/humidity"][ii]['converted-value'];
        }
      }

      if (result.messages["/orgs/wd/aqe/no2"]) {
        if(ii < result.messages["/orgs/wd/aqe/no2"].length) {
          if(!isNaN(result.messages["/orgs/wd/aqe/no2"][ii]['compensated-value'])){
            no2_count++;
            no2_ppb += result.messages["/orgs/wd/aqe/no2"][ii]['compensated-value'];
            no2_volts += result.messages["/orgs/wd/aqe/no2"][ii]['raw-value'];
          }
        }

        if(ii < result.messages["/orgs/wd/aqe/co"].length) {
          if(!isNaN(result.messages["/orgs/wd/aqe/co"][ii])) {
            co_count++;
            co_ppm += result.messages["/orgs/wd/aqe/co"][ii]['compensated-value'];
            co_volts += result.messages["/orgs/wd/aqe/co"][ii]['raw-value'];
          }
        }
      }

      if (result.messages["/orgs/wd/aqe/so2"]) {
        if(ii < result.messages["/orgs/wd/aqe/so2"].length) {
          if(!isNaN(result.messages["/orgs/wd/aqe/so2"][ii]['compensated-value'])) {
            so2_count++;
            so2_ppb += result.messages["/orgs/wd/aqe/so2"][ii]['compensated-value'];
            so2_volts += result.messages["/orgs/wd/aqe/so2"][ii]['raw-value'];
          }
        }

        if(ii < result.messages["/orgs/wd/aqe/o3"].length) {
          if(!isNaN(result.messages["/orgs/wd/aqe/o3"][ii]['compensated-value'])) {
            o3_count++;
            o3_ppb += result.messages["/orgs/wd/aqe/o3"][ii]['compensated-value'];
            o3_volts += result.messages["/orgs/wd/aqe/o3"][ii]['raw-value'];
          }
        }
      }

      if (result.messages["/orgs/wd/aqe/particulate"]) {
        if(ii < result.messages["/orgs/wd/aqe/particulate"].length) {
          if(!isNaN(result.messages["/orgs/wd/aqe/particulate"][ii]['compensated-value'])) {
            pm_count++;
            pm_ugpm3 += result.messages["/orgs/wd/aqe/particulate"][ii]['compensated-value'];
            pm_volts += result.messages["/orgs/wd/aqe/particulate"][ii]['raw-value'];
          }
        }
      }
    }

    var ret =  {
      serialNumber: result.serialNumber,
    };

    if(temperature_count > 0){
      ret.temperature_avg = temperature / temperature_count;
    }

    if(humidity_count > 0){
      ret.humidity_avg = humidity / humidity_count;
    }

    if(no2_count > 0){
      ret.no2_avg_ppb = no2_ppb / no2_count;
      ret.no2_avg_volts = no2_volts / no2_count;
    }

    if(co_count > 0){
      ret.co_avg_ppb = co_ppm / co_count;
      ret.co_avg_volts = co_volts / co_count;
    }

    if(o3_count > 0){
      ret.o3_avg_ppb = o3_ppb / o3_count;
      ret.o3_avg_volts = o3_volts / o3_count;
    }

    if(so2_count > 0){
      ret.so2_avg_ppb = so2_ppb / so2_count;
      ret.so2_avg_volts = so2_volts / so2_count;
    }

    if(pm_count > 0){
      ret.pm_avg_ugpm3= pm_ugpm3 / pm_count;
      ret.pm_avg_volts = pm_volts / pm_count;
    }

    return ret;
    // the above is a (too long) map function
  }).then(function(result){
    // result is an array of objects each containing a serialNumber attributre
    // and then a field for each computed average value associated with it
    var obj = {};
    for(var ii = 0; ii < result.length; ii++){
      if(result[ii]) {
        obj[result[ii].serialNumber] = result[ii];
      }
    }
    res.send(obj);
  });

});


module.exports = router;
