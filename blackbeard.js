/**
  Copyright 2012 Mike McCall

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

      http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.

  --------------------------------

  blackbeard.js - RUM for scalawags
  v0.1
*/

// If BB_start wasn't defined in the calling page, grab a timestamp early
if (typeof(BB_start) === "undefined") {
  BB_start = new Date().getTime();
}

var BB = function() {
  var w = window;
  var d = w.document;
  var _marks = {};
  var _measures = {};

  var config = {
    // If the autorun status isn't already set, set it to true
    autorun: true,
    beaconurl: document.location.protocol + "//" + document.location.hostname + "/beacon.gif"
  };

  // Gather some default client attributes
  // Some of these are poorly-supported, particularly the connection-based attribs
  var connection = w.navigator.connection || w.navigator.mozConnection || w.navigator.webkitConnection;
  var pageviz = d.visibilityState || d.webkitVisibilityState || d.mozVisibilityState || d.msVisibilityState;
  var performance = w.performance || w.mozPerformance || w.msPerformance || w.webkitPerformance;

  var _attribs = {
    plat: escape(w.navigator.platform),
    ua: escape(w.navigator.userAgent),
    uri: escape(d.location.href.split("?")[0]),
    conn_type: (connection && "undefined" !== typeof(connection.type) ? connection.type : ""),
    conn_bw: (connection ? connection.bandwidth : "" ),
    page_vis: ("undefined" !== pageviz ? pageviz : ""),
    spdy: ("undefined" !== typeof(w.chrome) && "undefined" !== typeof(w.chrome.loadTimes().wasFetchedViaSpdy) ? w.chrome.loadTimes().wasFetchedViaSpdy : false),
    nt_supported: (performance && performance.timing ? true : false),
    touch_supported: ("ontouchstart" in w || "createTouch" in d || "ontouchend" in d || "undefined" !== typeof(w.Touch) ? true : false )
  };

  // Public method to add new attributes.
  // For example, one might add the client's IP address or whether 
  // or not a client came in on an IPv6 address
  function setAttrib(key, value) {
    if (!value) {
      return;
    }
    _attribs[key] = value;
  };

  // Public method to get all attributes
  function getAttribs() {
    return _attribs;
  };

  // Initialize!
  function init() {
    // Set event listeners for both the onload and DOMContentLoaded events so we can measure them
    _addListener(w, "load", function() {
      measure("js_onloadEvent");
      if (config.autorun) {
        done();
      }
    });
    _addListener(d, "DOMContentLoaded", function() {
      measure("js_domContentLoadedEvent");
    });

    // Get the start timestamp. If Navigation Timing is supported, 
    // use navigationStart except older FF, where we use unloadeventstart/fetchStart.
    // Otherwise, use the start timestamp we captured at the top of the script
    if (_attribs.nt_supported) {
      if (w.navigator.userAgent.match(/Firefox\/[78]\./i)) {
        _marks["BB_start"]  = performance.timing.unloadEventStart || performance.timing.fetchStart;
      } else {
        _marks["BB_start"] = performance.timing.navigationStart;
      }
    } else {
      _marks["BB_start"] = BB_start;
    }
  }

  //
  // Public Mark/Measure Interfaces, based on the W3C User Timing Spec
  // http://www.w3.org/TR/user-timing/
  //

  // Create a Mark
  // markName is required, startTime is optional
  function mark(markName, startTime) {
    if (!markName) {
      return;
    }

    if (!startTime) {
      _marks[markName] = new Date().getTime();
    } else {
      _marks[markName] = startTime;
    }
  }

  // Remove a Mark.
  // markName is optional; calling it without arguments causes all marks to be removed.
  function clearMarks(markName) {
    if (Object.keys(_marks).length === 0) {
      return;
    }

    if (!markName) {
      _marks = {};
    } else {
      delete _marks[markName];
    }
  }

  // Get all Marks
  function getMarks () {
    return _marks;
  }

  // Create a Measure
  // measureName is required, endMark and startMark are not.
  function measure(measureName, endMark, startMark) {
    if (!measureName) {
      return;
    }

    // If not specified, set the endMark to the current timestamp
    var endTime;
    if (!endMark) {
      endTime = new Date().getTime();
    } else {
      endTime = _marks[endMark];
    }

    // If not specified, set the startMark to the existing 'start'
    var startTime;
    if (!startMark) {
      startTime = _marks["BB_start"];
    } else {
      startTime = _marks[startMark];
    }

    // Return the delta between the endMark and the startMark
    if ("number" !== typeof(startTime) || "number" !== typeof(endTime)) {
      return;
    } else {
      _measures[measureName] = endTime - startTime;
    }
  }

  // Remove a Measure.
  // measureName is optional; calling it without arguments causes all measures to be removed.
  function clearMeasures(measureName) {
    if (Object.keys(_measures).length === 0) {
      return;
    }

    if (!measureName) {
      _measures = {};
    } else {
      delete _measures[measureName];
    }
  }

  // Get all Measures
  function getMeasures() {
    return _measures;
  }

  function done() {
    var finalize = function() {
      if (config.autorun) {
        sendBeacon();
      }
    };

    // Get Navigation Timing data
    if (_attribs.nt_supported) {
      var getNavTiming = function() {
        // Create a mark for each metric in the Navigation Timing object
        for (var measurement in performance.timing) {
          mark(measurement, performance.timing[measurement]);
        }

        // Measure some important times
        measure("nt_DNS", "domainLookupEnd", "domainLookupStart");
        measure("nt_TCPconn", "connectEnd", "connectStart");
        measure("nt_firstByte", "responseStart", "requestStart");
        measure("nt_domProcessing", "domComplete", "domLoading");
        measure("nt_domInteractive", "domInteractive");
        if (performance.timing.msFirstPaint) {
          measure("nt_firstPaint", "msFirstPaint");
        }
        else if ("undefined" !== typeof(window.chrome) && "undefined" !== typeof(window.chrome.loadTimes().firstPaintTime)) {
          mark("chrome_firstPaint", Math.round(window.chrome.loadTimes().firstPaintTime * 1000));
          measure("nt_firstPaint", "chrome_firstPaint");
        }
        measure("nt_domContentLoadedEvent", "domContentLoadedEventEnd");
        measure("nt_onloadEvent", "loadEventEnd");
        finalize();
      };

      // Make sure that we have a valid navigation type (reload, navigate), and that 
      // the onload event has fired.  If the load event hasn't fired, sleep 100ms and try again
      // until it does.
      var checkNavTiming = function() {
        if (performance.navigation.type === 0 || performance.navigation.type === 1 && performance.timing.loadEventEnd > 0) {
          getNavTiming();
        } else if (performance.timing.loadEventEnd <= 0) {
          setTimeout(checkNavTiming, 100);
        }
      }

      checkNavTiming();

    } else {
      finalize();
    }
  }

  // Send the Beacon.  You can also override whatever's set in the config object here
  function sendBeacon(beaconUrl) {
    var beaconUrl = beaconUrl || config.beaconurl;
    var beaconString = "";

    for (var k in _measures) {
      if (_measures.hasOwnProperty(k)) {
        beaconString += "&" + escape(k) + "=" + ("undefined" == typeof(_measures[k]) ? "" : _measures[k]); 
      }
    }

    for (var k in _attribs) {
      if (_attribs.hasOwnProperty(k)) {
        beaconString += "&" + escape(k) + "=" + ("undefined" == typeof(_attribs[k]) ? "" : _attribs[k]); 
      }
    }

    if (beaconString) {
      beaconString = beaconString.substring(1);
      var image = new Image();
      image.src = beaconUrl + "?" + beaconString;
      return image;
    }

    return;
  }

  // Private eventListener method
  function _addListener(obj, eventName, listener) {
    if(obj.addEventListener) {
      obj.addEventListener(eventName, listener, false);
    } else {
      obj.attachEvent("on" + eventName, listener);
    }
  }

  // Public Methods
  return {
    config: config,
    setAttrib: setAttrib,
    getAttribs: getAttribs,
    init: init,
    mark: mark,
    clearMarks: clearMarks,
    getMarks: getMarks,
    measure: measure,
    clearMeasures: clearMeasures,
    getMeasures: getMeasures,
    done: done,
    sendBeacon: sendBeacon
  };

}();
