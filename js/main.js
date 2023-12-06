// create leaflet map
var map = L.map('map').setView([40, -90], 6.4);  // centered on IL

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

var geojsonLayer; // declare geojsonLayer outside the Promise.all block
var selectedFeatures = new Set(); // Set to store selected features

// load topojson and csv data
Promise.all([
    d3.json('data/il_tracts_2020_wgs84.topojson'),
    d3.csv('data/marketCharacteristics_table.csv')
]).then(function([topojsonData, csvData]) {
    // convert topojson to geojson
    var geojsonData = topojson.feature(topojsonData, topojsonData.objects.il_tracts_2020_wgs84);

    // join csv data with geojson based on id fields
    geojsonData.features.forEach(function(feature) {
        var uniqueID = feature.properties.GEOID;
        var csvRecord = csvData.find(function(csvRecord) {
            return csvRecord.geog === uniqueID;
        });
        if (csvRecord) {
            feature.properties.pop_2010 = parseInt(csvRecord.pop_2010, 10);
            feature.properties.pop_2015 = parseInt(csvRecord.pop_2015, 10);
            feature.properties.pop_2020 = parseInt(csvRecord.pop_2020, 10);
        }
    });

    // create geojson layer with combined data and add it to map
    geojsonLayer = L.geoJson(geojsonData, {
        style: function (feature) {
            return { fillColor: 'green', weight: 0.25, opacity: 1, color: 'white', fillOpacity: 0.7 };
        },
        onEachFeature: function (feature, layer) {
            // Add click event listener
            layer.on('click', function () {
                // Toggle the selected state of the feature
                if (selectedFeatures.has(feature)) {
                    selectedFeatures.delete(feature);
                } else {
                    selectedFeatures.add(feature);
                }

                // Update the highlight
                updateHighlight();
            });

            // add hover event listener
            layer.on('mouseover', function (event) {
                showLabel(event.latlng, '<p><b> Census tract: ' + '</b>' +feature.properties.GEOID + '</p>');
            });

            // remove label on mouseout
            layer.on('mouseout', function () {
                hideLabel();
            });
        }
    }).addTo(map);
});

// Function to update the highlight
function updateHighlight() {
    geojsonLayer.eachLayer(function (layer) {
        if (selectedFeatures.has(layer.feature)) {
            // Highlight selected features
            layer.setStyle({ fillColor: 'blue', color: 'black' });
        } else {
            // Reset the style for non-selected features
            layer.setStyle({ fillColor: 'green', weight: 0.25, opacity: 1, color: 'white', fillOpacity: 0.7 });
        }
    });

    // Update the selected features list
    updateSelectedList();
}


var tooltip; // Declare tooltip variable
var lastClickedLayer; // Variable to store the last clicked layer

// Function to highlight a feature
function highlightFeature(layer) {
    layer.setStyle({
        weight: 5,
        color: '#666',
        dashArray: '',
        fillOpacity: 0.7
    });
}

// Function to reset the highlight on a layer
function resetHighlight(layer) {
    geojsonLayer.resetStyle(layer);
}

// Function to show label
function showLabel(latlng, label) {
    if (!label) return;

    // Create a custom tooltip
    tooltip = L.tooltip({
        permanent: true,
        direction: 'top',
        className: 'custom-tooltip'
    })
        .setLatLng(latlng)
        .setContent(label)
        .addTo(map);
}

// Function to hide label
function hideLabel() {
    // Check if tooltip is defined before attempting to close it
    if (tooltip) {
        tooltip.removeFrom(map);
        tooltip = undefined; // Set it to undefined after removal
    }
}


// Create a button to clear selections
var clearSelectionButton = L.control({ position: 'bottomleft' });

clearSelectionButton.onAdd = function (map) {
    var buttonDiv = L.DomUtil.create('div', 'clear-selection-button');
    buttonDiv.innerHTML = '<button onclick="clearSelection()">Clear Selection</button>';
    return buttonDiv;
};

clearSelectionButton.addTo(map);

// Function to clear selections
function clearSelection() {
    selectedFeatures.clear();
    updateHighlight();
}

// Function to update the list of selected features
function updateSelectedList() {
    const selectedList = document.getElementById('selected-list');
    selectedList.innerHTML = ''; // Clear the existing list

    selectedFeatures.forEach(feature => {
        const listItem = document.createElement('li');
        listItem.textContent = feature.properties.GEOID;
        selectedList.appendChild(listItem);
    });
}

// Function to clear selections
function clearSelection() {
    selectedFeatures.clear();
    updateHighlight();
    updateSelectedList(); // Update the list when selections are cleared
}

