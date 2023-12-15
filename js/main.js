// declare global variables for use in script
var dropdown;
var lastSelectedVariable;
var csvData;

// create leaflet map
var map = L.map('map').setView([40, -90], 6.4);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

// add geocoder control
L.Control.geocoder({
    geocoder: L.Control.Geocoder.nominatim(),
    defaultMarkGeocode: false,
    placeholder: "Search for a location...",
    collapsed: false,
}).on('markgeocode', function (e) {
    var latlng = e.geocode.center;
    var zoom = 12;

    // add a marker at selected location
    L.marker(latlng).addTo(map);
    
    map.setView(latlng, zoom);
}).addTo(map);

var geojsonLayer;
var selectedFeatures = new Set();
var chartData = {
    labels: ['2010', '2015', '2020'],
    datasets: [{
        // label: 'Change Over Time',
        backgroundColor: ['rgba(255, 99, 132, 0.7)', 'rgba(54, 162, 235, 0.7)', 'rgba(255, 206, 86, 0.7)'],
        borderColor: ['rgba(255, 99, 132, 1)', 'rgba(54, 162, 235, 1)', 'rgba(255, 206, 86, 1)'],
        borderWidth: 1,
        data: [0, 0, 0]
    }]
};

var barChartCanvas = document.getElementById('barChart').getContext('2d');
var barChart = new Chart(barChartCanvas, {
    type: 'bar',
    data: chartData,
    options: {
        scales: {
            y: {
                beginAtZero: true
            }
        },
        // set display to false so chart doesn't duplicate title
        plugins: {
            legend: {
                display: false
            }
        }
    }
});

// function to populate dropdown menu with variables from csv
function populateDropdown(csvData) {
    dropdown = document.getElementById('variableDropdown');
    var uniqueVariables = new Set();

    csvData.forEach(function (csvRecord) {
        Object.keys(csvRecord).forEach(function (key) {
            var parts = key.split('_');
            if (parts.length === 2 && !uniqueVariables.has(parts[0])) {
                uniqueVariables.add(parts[0]);
            }
        });
    });

    // console.log('Unique Variables:', Array.from(uniqueVariables)); // debug statement

    // clear existing options
    dropdown.innerHTML = '';

    // add options based on variables
    uniqueVariables.forEach(function (variable) {
        var option = document.createElement('option');
        option.value = variable;
        option.text = variable;
        dropdown.add(option);
    });

    // set "Population" as the default
    dropdown.value = 'Population';

    // dropdown change event to update chart
    dropdown.addEventListener('change', updateChartVariable);

    // set 'Population' as the default variable for chart
    lastSelectedVariable = 'Population';
    updateChartData();
}


// function to update the chart based on selected variable
function updateChartVariable() {
    lastSelectedVariable = dropdown.value || 'Population';
    document.getElementById('chartTitle').innerText = 'Change Over Time - ' + lastSelectedVariable;

    updateChartData();
    // console.log('Selected Variable:', lastSelectedVariable);  // debug statement
}


Promise.all([
    d3.json('data/il_tracts_2020_wgs84.topojson'),
    d3.csv('data/marketCharacteristics_table.csv')
]).then(function ([topojsonData, loadedCsvData]) {
    csvData = loadedCsvData;
    var geojsonData = topojson.feature(topojsonData, topojsonData.objects.il_tracts_2020_wgs84);

    geojsonData.features.forEach(function (feature) {
        var uniqueID = feature.properties.GEOID;
        var csvRecord = csvData.find(function (csvRecord) {
            return csvRecord.geog === uniqueID;
        });
        if (csvRecord) {
            feature.properties.Population_2010 = parseInt(csvRecord.Population_2010, 10);
            feature.properties.Population_2015 = parseInt(csvRecord.Population_2015, 10);
            feature.properties.Population_2020 = parseInt(csvRecord.Population_2020, 10);
        }
    });

    geojsonLayer = L.geoJson(geojsonData, {
        style: function (feature) {
            return { fillColor: 'green', weight: 0.25, opacity: 1, color: 'white', fillOpacity: 0.7 };
        },
        onEachFeature: function (feature, layer) {
            layer.on('click', function () {
                if (selectedFeatures.has(feature)) {
                    selectedFeatures.delete(feature);
                } else {
                    selectedFeatures.add(feature);
                }
                updateHighlight();
                updateChartData();
            });

            layer.on('mouseover', function (event) {
                showLabel(event.latlng, '<p><b> Census tract: ' + '</b>' + feature.properties.GEOID + '</p>');
            });

            layer.on('mouseout', function () {
                hideLabel();
            });
        }
    }).addTo(map);

    // populate dropdown menu
    populateDropdown(csvData);
});

function updateHighlight() {
    geojsonLayer.eachLayer(function (layer) {
        if (selectedFeatures.has(layer.feature)) {
            layer.setStyle({ fillColor: 'blue', color: 'black' });
        } else {
            layer.setStyle({ fillColor: 'green', weight: 0.25, opacity: 1, color: 'white', fillOpacity: 0.7 });
        }
    });
}

function updateChartData() {
    var selectedVariableTotal = [0, 0, 0];

    selectedFeatures.forEach(function (feature) {
        var selectedVariable = lastSelectedVariable;

        // find the csvRecord that matches GEOID of the selected feature
        var csvRecord = csvData.find(function (csvRecord) {
            return csvRecord.geog === feature.properties.GEOID;
        });

        if (csvRecord) {
            // selected variable values for each year
            var selectedVariableValue_2010 = parseInt(csvRecord[selectedVariable + '_2010'], 10) || 0;
            var selectedVariableValue_2015 = parseInt(csvRecord[selectedVariable + '_2015'], 10) || 0;
            var selectedVariableValue_2020 = parseInt(csvRecord[selectedVariable + '_2020'], 10) || 0;

            // update array with the values for each year
            selectedVariableTotal[0] += selectedVariableValue_2010;
            selectedVariableTotal[1] += selectedVariableValue_2015;
            selectedVariableTotal[2] += selectedVariableValue_2020;
        }
    });

    // set data for the chart's dataset
    barChart.data.datasets[0].data = selectedVariableTotal;

    // update chart
    barChart.update();
}


function showLabel(latlng, label) {
    if (!label) return;
    tooltip = L.tooltip({
        permanent: true,
        direction: 'top',
        className: 'custom-tooltip'
    })
        .setLatLng(latlng)
        .setContent(label)
        .addTo(map);
}

function hideLabel() {
    if (tooltip) {
        tooltip.removeFrom(map);
        tooltip = undefined;
    }
}

var clearSelectionButton = L.control({ position: 'bottomleft' });

clearSelectionButton.onAdd = function (map) {
    var buttonDiv = L.DomUtil.create('div', 'clear-selection-button');
    buttonDiv.innerHTML = '<button onclick="clearSelection()">Clear Selection</button>';
    return buttonDiv;
};

clearSelectionButton.addTo(map);

function clearSelection() {
    selectedFeatures.clear();
    updateHighlight();
    updateChartData();
}