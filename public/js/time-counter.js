function httpGetAsync(theUrl, callback, variables){
  var xmlHttp = new XMLHttpRequest();
  xmlHttp.onreadystatechange = function() { 
    if (xmlHttp.readyState == 4 && xmlHttp.status == 200)
      callback(xmlHttp.responseText, variables);
  }
  xmlHttp.open("GET", theUrl, true); // true for asynchronous 
  xmlHttp.send(null);
}

var daysPlayed = new Array();
var charactersChecked = new Array();
var dayMax = 0;

var daysPlayedCallback = function(days, max) {
  var width = 960,
      height = 136,
      cellSize = 17; // cell size

  var format = d3.time.format("%Y-%m-%d");

  var color = d3.scale.quantize()
      .domain([0, max])
      .range(d3.range(11).map(function(d) { return "q" + d + "-11"; }));

  var svg = d3.select(".calendar").selectAll("svg")
      .data(d3.range(2014, 2017))
    .enter().append("svg")
      .attr("width", width)
      .attr("height", height)
      .attr("class", "RdYlGn")
    .append("g")
      .attr("transform", "translate(" + ((width - cellSize * 53) / 2) + "," + (height - cellSize * 7 - 1) + ")");

  svg.append("text")
      .attr("transform", "translate(-6," + cellSize * 3.5 + ")rotate(-90)")
      .style("text-anchor", "middle")
      .text(function(d) { return d; });

  var rect = svg.selectAll(".day")
      .data(function(d) { return d3.time.days(new Date(d, 0, 1), new Date(d + 1, 0, 1)); })
    .enter().append("rect")
      .attr("class", "day")
      .attr("width", cellSize)
      .attr("height", cellSize)
      .attr("x", function(d) { return d3.time.weekOfYear(d) * cellSize; })
      .attr("y", function(d) { return d.getDay() * cellSize; })
      .datum(format);

  rect.append("title")
      .text(function(d) { return d; });

  svg.selectAll(".month")
      .data(function(d) { return d3.time.months(new Date(d, 0, 1), new Date(d + 1, 0, 1)); })
    .enter().append("path")
      .attr("class", "month")
      .attr("d", monthPath);

  rect.filter(function(d) { return d in days; })
      .attr("class", function(d) { return "day " + color(days[d]); })
    .select("title")
      .text(function(d) {
        var hours = parseInt(days[d]/3600) % 24;
        var minutes = parseInt(days[d]/60) % 60;
        return d + ": " + hours + " hours " + minutes + " minutes";
      });
      
  var destinyDays = new Array();
  destinyDays['2014-09-09'] = 'Destiny release date';
  destinyDays['2014-12-09'] = 'The Dark Below release date';
  destinyDays['2015-05-19'] = 'House of Wolves release date';
  destinyDays['2015-09-15'] = 'The Taken King release date';
      
  rect.filter(function(d) { return d in destinyDays; })
      .attr("class", function(d) { return "day " + color(days[d]) + " destiny-day"})
    .select("title")
      .text(function(d) {
        if (days[d]) {
          var hours = parseInt(days[d]/3600) % 24;
          var minutes = parseInt(days[d]/60) % 60;
          return d + ": " + destinyDays[d] + " - " + hours + " hours " + minutes + " minutes";
        }
        else {
          return d + ": " + destinyDays[d];
        }
      });

  function monthPath(t0) {
    var t1 = new Date(t0.getFullYear(), t0.getMonth() + 1, 0),
        d0 = t0.getDay(), w0 = d3.time.weekOfYear(t0),
        d1 = t1.getDay(), w1 = d3.time.weekOfYear(t1);
    return "M" + (w0 + 1) * cellSize + "," + d0 * cellSize
        + "H" + w0 * cellSize + "V" + 7 * cellSize
        + "H" + w1 * cellSize + "V" + (d1 + 1) * cellSize
        + "H" + (w1 + 1) * cellSize + "V" + 0
        + "H" + (w0 + 1) * cellSize + "Z";
  }
}

var characterCallback = function(results, variables) {
  console.log('character callback started')
  var json;
  try {
    json = JSON.parse(results);
  } catch(e) {
    console.log(e);
  }
  if (json && json.Response && json.Response.data && json.Response.data.activities && json.Response.data.activities.length) {
    console.log('json exists')
    json.Response.data.activities.forEach(function(activity) {
      console.log('activity loop')
      if (activity && activity.period && activity.values.activityDurationSeconds && activity.values.activityDurationSeconds.basic && activity.values.activityDurationSeconds.basic.value) {
        var date = new Date(activity.period).toISOString().slice(0, 10);
      //  console.log(date)
        var duration = activity.values.activityDurationSeconds.basic.value;
        if (activity.values.leaveRemainingSeconds && activity.values.leaveRemainingSeconds.basic && activity.values.leaveRemainingSeconds.basic.value) {
          duration -= activity.values.leaveRemainingSeconds.basic.value;
        }
        if (!daysPlayed[date]) daysPlayed[date] = 0;
        daysPlayed[date] += duration;
        if (daysPlayed[date] > dayMax) dayMax = daysPlayed[date];
        // console.log(daysPlayed)
      }
    });
    variables.page++;
    var path = variables.basePath + '&page=' + variables.page;
    httpGetAsync(path, characterCallback, variables);
  }
  else {
    charactersChecked[variables.characterId] = true;
    var allTrue = true;
    for (var key in charactersChecked) {
      if (!charactersChecked[key]) allTrue = false;
    }
    if (allTrue) {
      console.log(daysPlayed);
      console.log(dayMax);
      daysPlayedCallback(daysPlayed, dayMax);
    }
  }
}

var accountCallback = function(results) {
  console.log('account callback started')
  var json;
  try {
    json = JSON.parse(results);
  } catch(e) {
    console.log(e);
  }
  if (json && json.Response && json.Response.data && json.Response.data.membershipType && json.Response.data.membershipId && json.Response.data.characters && json.Response.data.characters.length) {
    json.Response.data.characters.forEach(function(character) {
      charactersChecked[character.characterBase.characterId] = false;
    });
    json.Response.data.characters.forEach(function(character) {
      if (character && character.characterBase && character.characterBase.characterId) {
        var characterPath = '/Platform/Destiny/Stats/ActivityHistory/' + json.Response.data.membershipType + '/' + json.Response.data.membershipId + '/' + character.characterBase.characterId + '/?mode=None&count=250';
        var variables = {
          'basePath': characterPath,
          'page': 0,
          'characterId': character.characterBase.characterId
        };
        httpGetAsync(characterPath, characterCallback, variables);
      }
    });
  }
}

var searchCallback = function(results) {
  console.log('search callback started')
  var json;
  try {
    json = JSON.parse(results);
  } catch(e) {
    console.log(e);
  }
  if (json && json.Response && json.Response[0] && json.Response[0].displayName) {
  //  document.getElementById('guardian-name').innerHTML = json.Response[0].displayName;
  }
  if (json && json.Response && json.Response[0] && json.Response[0].membershipId) {
    var membershipId = json.Response[0].membershipId;
    var accountPath = '/Platform/Destiny/' + pathArray[0] + '/Account/' + membershipId + '/Summary/';
    httpGetAsync(accountPath, accountCallback);
  }
}

var path = window.location.pathname;
path = path.slice(1);
var pathArray = path.split( '/' );
var searchPath = '/Platform/Destiny/SearchDestinyPlayer/' + pathArray[0] + '/' + pathArray[1] + '/';
if (pathArray[0] == 2) {
  document.getElementById('platformSwitch').checked = true;
}
  
httpGetAsync(searchPath, searchCallback);