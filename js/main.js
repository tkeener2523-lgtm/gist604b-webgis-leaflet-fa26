// Richmond, VA – Parcels, Schools & Streams
// Loaded as a module (see index.html) so top-level await works.

var statusBox = document.getElementById("status");

// Initialize the map, centered on Richmond, VA
//    (preferCanvas keeps ~77,000 parcel polygons fast)
var map = L.map("map", {
  center: [37.5407, -77.436],
  zoom: 12,
  zoomControl: false,
  preferCanvas: true
});

// Basemap
var osm = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: "&copy; <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a> contributors"
});
osm.addTo(map);

// Zoom controls and scale bar
L.control.zoom({ position: "topleft" }).addTo(map);
L.control.scale({ position: "bottomleft", metric: true, imperial: true }).addTo(map);

// Panes control draw order: parcels (bottom) < streams < schools (top)
map.createPane("parcelsPane").style.zIndex = 410;
map.createPane("streamsPane").style.zIndex = 420;
map.createPane("schoolsPane").style.zIndex = 430;

// Layer groups (one per dataset)
var parcelsGroup = L.layerGroup();
var streamsGroup = L.layerGroup();
var schoolsGroup = L.layerGroup();

// Styling
var parcelStyle = {
  pane: "parcelsPane",
  color: "#8d6e63",
  weight: 0.5,
  fillColor: "#d7ccc8",
  fillOpacity: 0.5
};
var streamStyle = {
  pane: "streamsPane",
  color: "#1e88e5",
  weight: 2,
  opacity: 0.9
};
var schoolColors = {
  "Elementary": "#43a047",
  "Middle": "#fb8c00",
  "High": "#e53935",
  "Specialty": "#8e24aa"
};

// Popup text helpers
function money(v) {
  if (v === null || v === undefined) { return "–"; }
  return "$" + Number(v).toLocaleString();
}
function text(v) {
  if (v === null || v === undefined || v === "") { return "–"; }
  return v;
}

// Load each GeoJSON, style it, and bind a popup from its attributes
try {
  // Streams
  var streamsResponse = await fetch("data/streams.geojson");
  var streamsData = await streamsResponse.json();
  L.geoJSON(streamsData, {
    style: streamStyle,
    onEachFeature: function (feature, layer) {
      var p = feature.properties;
      layer.bindPopup(
        "<div class='popup-title'>" + text(p.StreamName) + "</div>" +
        "<table class='popup-table'>" +
        "<tr><td>Length</td><td>" + Math.round(p.Shape__Length).toLocaleString() + " ft</td></tr>" +
        "</table>"
      );
    }
  }).addTo(streamsGroup);

  // Schools
  var schoolsResponse = await fetch("data/schools.geojson");
  var schoolsData = await schoolsResponse.json();
  L.geoJSON(schoolsData, {
    pointToLayer: function (feature, latlng) {
      var color = schoolColors[feature.properties.Type] || "#607d8b";
      return L.circleMarker(latlng, {
        pane: "schoolsPane",
        radius: 7,
        color: "#ffffff",
        weight: 1.5,
        fillColor: color,
        fillOpacity: 1
      });
    },
    onEachFeature: function (feature, layer) {
      var p = feature.properties;
      layer.bindPopup(
        "<div class='popup-title'>" + text(p.Name) + "</div>" +
        "<table class='popup-table'>" +
        "<tr><td>Type</td><td>" + text(p.Type) + "</td></tr>" +
        "<tr><td>Address</td><td>" + text(p.Address) + "</td></tr>" +
        "</table>"
      );
    }
  }).addTo(schoolsGroup);

  // Parcels (largest file, loaded last)
  statusBox.textContent = "Loading parcels (this can take a few seconds)…";
  var parcelsResponse = await fetch("data/parcels.geojson");
  var parcelsData = await parcelsResponse.json();
  L.geoJSON(parcelsData, {
    style: parcelStyle,
    onEachFeature: function (feature, layer) {
      // Popup content is built only when a parcel is clicked
      layer.bindPopup(function () {
        var p = feature.properties;
        return (
          "<div class='popup-title'>Parcel " + text(p.PIN) + "</div>" +
          "<table class='popup-table'>" +
          "<tr><td>Bldg No.</td><td>" + text(p.AsrLocationBldgNo) + "</td></tr>" +
          "<tr><td>Class</td><td>" + text(p.PropertyClass) + "</td></tr>" +
          "<tr><td>Land use</td><td>" + text(p.LandUse) + "</td></tr>" +
          "<tr><td>Land value</td><td>" + money(p.LandValue) + "</td></tr>" +
          "<tr><td>Dwelling value</td><td>" + money(p.DwellingValue) + "</td></tr>" +
          "<tr><td>Total value</td><td>" + money(p.TotalValue) + "</td></tr>" +
          "<tr><td>Lot size</td><td>" + (p.LandSqFt ? Math.round(p.LandSqFt).toLocaleString() + " sq ft" : "–") + "</td></tr>" +
          "</table>"
        );
      });
    }
  }).addTo(parcelsGroup);

  statusBox.remove();
} catch (err) {
  statusBox.textContent = "Could not load data: " + err.message + " (serve this folder over http, don't open the file directly)";
  console.error(err);
}

// Show all groups by default and add the layer control
parcelsGroup.addTo(map);
streamsGroup.addTo(map);
schoolsGroup.addTo(map);

L.control.layers(
  {},
  {
    "Parcels": parcelsGroup,
    "Streams": streamsGroup,
    "RPS Schools": schoolsGroup
  },
  { collapsed: false }
).addTo(map);
