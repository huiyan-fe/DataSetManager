(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory(require('fetch-jsonp'), require('papaparse'), require('xlsx')) :
  typeof define === 'function' && define.amd ? define(['fetch-jsonp', 'papaparse', 'xlsx'], factory) :
  (global.DataSetManager = factory(global.fetchJsonp,global.Papa,global.XLSX));
}(this, (function (fetchJsonp,Papa,XLSX) { 'use strict';

  fetchJsonp = fetchJsonp && fetchJsonp.hasOwnProperty('default') ? fetchJsonp['default'] : fetchJsonp;
  Papa = Papa && Papa.hasOwnProperty('default') ? Papa['default'] : Papa;
  XLSX = XLSX && XLSX.hasOwnProperty('default') ? XLSX['default'] : XLSX;

  var classCallCheck = function (instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  };

  var createClass = function () {
    function defineProperties(target, props) {
      for (var i = 0; i < props.length; i++) {
        var descriptor = props[i];
        descriptor.enumerable = descriptor.enumerable || false;
        descriptor.configurable = true;
        if ("value" in descriptor) descriptor.writable = true;
        Object.defineProperty(target, descriptor.key, descriptor);
      }
    }

    return function (Constructor, protoProps, staticProps) {
      if (protoProps) defineProperties(Constructor.prototype, protoProps);
      if (staticProps) defineProperties(Constructor, staticProps);
      return Constructor;
    };
  }();

  var objectWithoutProperties = function (obj, keys) {
    var target = {};

    for (var i in obj) {
      if (keys.indexOf(i) >= 0) continue;
      if (!Object.prototype.hasOwnProperty.call(obj, i)) continue;
      target[i] = obj[i];
    }

    return target;
  };

  var fetch = fetchJsonp;

  function getPoint(name, callback) {
      var ak = "49tGfOjwBKkG9zG76wgcpIbce4VZdbv6";
      var address = encodeURIComponent(name);
      // 不支持跨域，需要使用JSONP
      var geoCodingUrl = "//api.map.baidu.com/geocoder/v2/?address=" + address + "&output=json&ak=" + ak;

      if (window.fetchJsonpTest) {
          fetch = window.fetchJsonpTest;
      }

      fetch(geoCodingUrl, {

          credentials: "include",
          // timeout: 3000,
          // jsonpCallback: null,
          // jsonCallbackFunction: null,
          method: "GET",
          headers: {
              Accept: "application/json"
          }
      }).then(function (res) {
          if (res.ok) {
              return res.json();
          } else {
              throw new Error('response not ok');
          }
      }).then(function (res) {
          if (res && res.status == 0 && res.result) {
              var ret = res.result;
              ret['name'] = name;
              callback && callback(ret);
          } else {
              console.log(res);
              throw new Error(res);
          }
          return res;
      }).catch(function (error) {
          console.log("failed", error);
          // console.log(name, "failed", error);
          callback && callback(null);
          // throw (error);
      });
  }

  function getPoints(names, callback) {
      var ak = "49tGfOjwBKkG9zG76wgcpIbce4VZdbv6";
      var address = names.map(function (name) {
          return encodeURIComponent(name);
      });
      // 不支持跨域，需要使用JSONP
      var geoCodingUrls = address.map(function (addr) {
          return "//api.map.baidu.com/geocoder/v2/?address=" + addr + "&output=json&ak=" + ak;
      });

      if (window.fetchJsonpTest) {
          fetch = window.fetchJsonpTest;
      }

      Promise.all(geoCodingUrls.map(function (url, index) {
          return fetch(url, {
              credentials: "include",
              // timeout: 3000,
              // jsonpCallback: null,
              // jsonCallbackFunction: null,
              method: "GET",
              headers: {
                  Accept: "application/json"
              }
          }).then(function (res) {
              if (res.ok) {
                  return res.json();
              } else {
                  throw new Error('response not ok');
              }
          }).then(function (res) {
              if (res && res.status == 0 && res.result) {
                  var ret = res.result;
                  ret['name'] = names[index];
              } else {
                  console.log(res);
                  throw new Error(res);
              }
              return res.result;
          }).catch(function (error) {
              console.log("failed", error);
              // console.log(name, "failed", error);
              callback && callback(null);
              // throw (error);
          });
      })).then(function (res) {
          callback && callback(res);
      });
  }

  function batchGeoCoding(list, callback) {
      var poiList = [];
      poiList.length = list.length;
      var cnts = 0;
      var cnte = 0;
      list.map(function (item, index) {
          cnts++;
          var name = item.name,
              rest = objectWithoutProperties(item, ["name"]);

          getPoint(name, function (poiInfo) {
              cnte++;
              if (poiInfo) {
                  poiInfo.params = rest;
                  poiList[index] = poiInfo;
              }
              if (cnte == cnts) {
                  callback && callback(poiList);
              }
          });
      });
  }

  function batchGeoOdCoding(list, callback) {
      var poiList = [];
      poiList.length = list.length;
      var cnts = 0;
      var cnte = 0;
      list.map(function (item, index) {
          cnts++;
          var start = item.start,
              end = item.end,
              rest = objectWithoutProperties(item, ["start", "end"]);

          var names = [start, end];
          getPoints(names, function (poiInfo) {
              cnte++;
              if (poiInfo) {
                  var newInfo = {
                      from: poiInfo[0],
                      to: poiInfo[1],
                      params: rest
                  };
                  poiList[index] = newInfo;
              }
              if (cnte == cnts) {
                  callback && callback(poiList);
              }
          });
      });
  }

  function formatLineStringCoordinates(geostring) {
      var coordinates = [];
      if (typeof geostring == 'string') {
          // 去除空格
          geostring = geostring.replace(/\s+/g, '');
          var list = geostring.split(/,|;/);
          for (var i = 0; i < list.length; i += 2) {
              coordinates.push([+list[i], +list[i + 1]]);
          }
      } else {
          console.error('LineString geostring type error.');
      }
      return coordinates;
  }

  function formatMultiLineStringCoordinates(geostring) {
      var coordinates = [];
      if (typeof geostring == 'string') {
          // 去除空格
          geostring = geostring.replace(/\s+/g, '');
          // support multi linestring when there is seprated line in one geostring
          // multi linestring was concated with '|' 
          // like '113.22,44.33,112.22,44.22,112.22,44.22|112.22,44.22 ...'
          var lines = geostring.split('|');
          for (var i = 0; i < lines.length; i++) {
              var line = lines[i];
              var coord = formatLineStringCoordinates(line);
              coordinates.push(coord);
          }
      } else {
          console.error('MultiLineString geostring type error.');
      }
      return coordinates;
  }

  function formatPolygonCoordinates(geostring) {
      var coordinates = [];
      if (typeof geostring == 'string') {
          // 去除空格
          geostring = geostring.replace(/\s+/g, '');
          // support multi polygon when there is seprated land in one geostring
          // multi polygon was concated with '|' 
          // like '113.22,44.33,112.22,44.22,112.22,44.22|112.22,44.22 ...'
          var borders = geostring.split('|');
          for (var i = 0; i < borders.length; i++) {
              var border = borders[i];
              var coord = formatLineStringCoordinates(border);
              coordinates.push(coord);
          }
      } else {
          console.error('Polygon geostring type error.');
      }
      return coordinates;
  }

  var utils = {
      formatLineStringCoordinates: formatLineStringCoordinates,
      formatMultiLineStringCoordinates: formatMultiLineStringCoordinates,
      formatPolygonCoordinates: formatPolygonCoordinates
  };

  var DataSetManager = function () {
      function DataSetManager(options) {
          classCallCheck(this, DataSetManager);

          this.options = options || {};
          this.data = {};
      }

      createClass(DataSetManager, [{
          key: 'importCSV',
          value: function importCSV(csvString) {
              var csv = Papa.parse(csvString, {
                  skipEmptyLines: true,
                  header: true
              });
              this.data = csv;
              return this;
          }
      }, {
          key: 'importXLSX',
          value: function importXLSX(binary) {
              var workbook = XLSX.read(binary, {
                  type: 'binary'
              });
              var csv = XLSX.utils.sheet_to_csv(workbook.Sheets[workbook.SheetNames[0]]);
              this.importCSV(csv);
              return this;
          }

          /**
           * 解析点坐标数据
           * @param {string} lngColumnName 点坐标经度列名
           * @param {string} latColumnName 点坐标纬度列名
           * @param {string} countColumnName 权重列名
           */

      }, {
          key: 'geoPoint',
          value: function geoPoint(lngColumnName, latColumnName, countColumnName) {
              var data = this.data.data;
              for (var i = 0; i < data.length; i++) {
                  data[i].geometry = {
                      type: 'Point',
                      coordinates: [data[i][lngColumnName], data[i][latColumnName]]
                  };
                  data[i].count = parseFloat(data[i][countColumnName]) || 1;
              }
              return this;
          }

          /**
           * 解析点位置数据
           * @param {string} addrColumnName 地址列名
           * @param {string} countColumnName 权重列名
           */

      }, {
          key: 'geoAddress',
          value: function geoAddress(addrColumnName, countColumnName, callback) {
              var data = this.data.data;
              batchGeoCoding(data.map(function (item) {
                  return {
                      name: item[addrColumnName],
                      count: item[countColumnName]
                  };
              }), function (rs) {
                  for (var i = 0; i < data.length; i++) {
                      data[i].geocoding = rs[i];
                      if (data[i].geocoding && data[i].geocoding.location && data[i].geocoding.params) {
                          var _data$i$geocoding = data[i].geocoding,
                              location = _data$i$geocoding.location,
                              params = _data$i$geocoding.params;

                          data[i].geometry = {
                              type: 'Point',
                              coordinates: [location.lng, location.lat]
                          };
                          data[i].count = parseFloat(params.count) || 1;
                      }
                  }
                  callback && callback(data);
              });
          }

          /**
           * 解析线坐标数据
           * @param {string} lngStartColumnName 起点坐标经度列名
           * @param {string} latStartColumnName 起点坐标纬度列名
           * @param {string} lngEndColumnName 终点坐标经度列名
           * @param {string} latEndColumnName 终点坐标纬度列名
           * @param {string} countColumnName 权重列名
           */

      }, {
          key: 'geoLine',
          value: function geoLine(lngStartColumnName, latStartColumnName, lngEndColumnName, latEndColumnName, countColumnName) {
              var data = this.data.data;
              for (var i = 0; i < data.length; i++) {
                  data[i].geometry = {
                      type: 'LineString',
                      coordinates: [[data[i][lngStartColumnName], data[i][latStartColumnName]], [data[i][lngEndColumnName], data[i][latEndColumnName]]]
                  };
                  data[i].count = parseFloat(data[i][countColumnName]) || 1;
              }
              return this;
          }

          /**
           * 解析线坐标串数据
           * @param {string} positionColumnName 坐标字符串列名
           * @param {string} countColumnName 权重列名
           */

      }, {
          key: 'geoLineString',
          value: function geoLineString(positionColumnName, countColumnName) {
              var data = this.data.data;
              for (var i = 0; i < data.length; i++) {
                  data[i].geometry = {
                      type: 'LineString',
                      coordinates: utils.formatLineStringCoordinates(data[i][positionColumnName])
                  };
                  data[i].count = parseFloat(data[i][countColumnName]) || 1;
              }
              return this;
          }

          /**
           * 解析线坐标串数据
           * @param {string} positionColumnName 坐标字符串列名
           * @param {string} countColumnName 权重列名
           */

      }, {
          key: 'geoMultiLineString',
          value: function geoMultiLineString(positionColumnName, countColumnName) {
              var data = this.data.data;
              for (var i = 0; i < data.length; i++) {
                  data[i].geometry = {
                      type: 'MultiLineString',
                      coordinates: utils.formatMultiLineStringCoordinates(data[i][positionColumnName])
                  };
                  data[i].count = parseFloat(data[i][countColumnName]) || 1;
              }
              return this;
          }

          /**
           * 解析线地址数据
           * @param {string} fromColumnName 起点列名
           * @param {string} fromColumnName 终点列名
           * @param {string} countColumnName 权重列名
           */

      }, {
          key: 'geoOd',
          value: function geoOd(fromColumnName, toColumnName, countColumnName, callback) {
              var data = this.data.data;
              batchGeoOdCoding(data.map(function (item) {
                  return {
                      start: item[fromColumnName],
                      end: item[toColumnName],
                      count: item[countColumnName]
                  };
              }), function (rs) {
                  for (var i = 0; i < data.length; i++) {
                      data[i].geocoding = rs[i];
                      if (data[i].geocoding && data[i].geocoding.from && data[i].geocoding.from.location && data[i].geocoding.to && data[i].geocoding.to.location && data[i].geocoding.params) {
                          var _data$i$geocoding2 = data[i].geocoding,
                              from = _data$i$geocoding2.from,
                              to = _data$i$geocoding2.to,
                              params = _data$i$geocoding2.params;

                          data[i].geometry = {
                              type: 'LineString',
                              coordinates: [[from.location.lng, from.location.lat], [to.location.lng, to.location.lat]]
                          };
                          data[i].count = parseFloat(params.count) || 1;
                      }
                  }
                  callback && callback(data);
              });
          }

          /**
           * 解析面坐标串数据
           * @param {string} positionColumnName 坐标字符串列名
           * @param {string} countColumnName 权重列名
           */

      }, {
          key: 'geoPolygon',
          value: function geoPolygon(positionColumnName, countColumnName) {
              var data = this.data.data;
              for (var i = 0; i < data.length; i++) {
                  data[i].geometry = {
                      type: 'Polygon',
                      coordinates: utils.formatPolygonCoordinates(data[i][positionColumnName])
                  };
                  data[i].count = parseFloat(data[i][countColumnName]) || 1;
              }
              return this;
          }

          /**
           * 解析面行政区名数据
           * @param {string} boundaryColumnName 行政区列名
           * @param {string} countColumnName 权重列名
           */

      }, {
          key: 'geoBoundary',
          value: function geoBoundary(boundaryColumnName, countColumnName, callback) {}
          // let data = this.data.data;
          // batchGeoBoundaryCoding(data.map((item) => {
          //     return {
          //         name: item[boundaryColumnName],
          //         count: item[countColumnName]
          //     };
          // }), (rs) => {
          //     for (let i = 0; i < data.length; i++) {
          //         data[i].geocoding = rs[i];
          //         if (data[i].geocoding && data[i].geocoding.location && data[i].geocoding.params) {
          //             let {location, params} = data[i].geocoding;
          //             data[i].geometry = {
          //                 type: 'Polygon',
          //                 coordinates: [location.lng, location.lat]
          //             };
          //             data[i].count = parseFloat(params.count) || 1;
          //         }
          //     }
          //     callback && callback(data);
          // });


          /**
           * 拷贝数据列
           * @param {string} fromColumn 源列字段
           * @param {string} toColumn 目标列字段
           */

      }, {
          key: 'copyColumn',
          value: function copyColumn(fromColumn, toColumn) {
              if (this.data.data) {
                  this.data.data.forEach(function (item) {
                      item[toColumn] = item[fromColumn];
                  });
              }
              return this;
          }

          /**
           * 返回所有数据集对象
           * @return {array} 数据集数组
           */

      }, {
          key: 'getData',
          value: function getData() {
              return this.data.data;
          }

          /**
           * @return {array} 返回带地理位置的数据
           */

      }, {
          key: 'getGeoData',
          value: function getGeoData() {
              return this.data.data.filter(function (item) {
                  if (item.geometry) {
                      return true;
                  }
              });
          }
      }, {
          key: 'getFields',
          value: function getFields() {
              return this.data.meta.fields;
          }
      }]);
      return DataSetManager;
  }();

  return DataSetManager;

})));
