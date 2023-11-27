// create leaflet map
var map = L.map('map').setView([40, -90], 6.4);  // centered on IL

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

var geojsonLayer; // Declare geojsonLayer outside the Promise.all block

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
            layer.on('click', function (event) {
                // Remove highlight from the last clicked layer
                if (lastClickedLayer) {
                    resetHighlight(lastClickedLayer);
                }

                // Highlight the current clicked layer
                highlightFeature(event.target);

                // Update the last clicked layer
                lastClickedLayer = event.target;
            });

            // Add hover event listener
            layer.on('mouseover', function (event) {
                showLabel(event.latlng, feature.properties.GEOID);
            });

            // Remove label on mouseout
            layer.on('mouseout', function () {
                hideLabel();
            });
        }
    }).addTo(map);
}).catch(function(error) {
    // errors
    console.error('Error loading data:', error);
});

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

// ...


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

