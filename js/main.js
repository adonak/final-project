// Declare dropdown globally
var dropdown;

// create leaflet map
var map = L.map('map').setView([40, -90], 6.4);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

var geojsonLayer;
var selectedFeatures = new Set();
var chartData = {
    labels: ['2010', '2015', '2020'],
    datasets: [{
        label: 'Change Over Time',
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
        }
    }
});

// Function to populate the dropdown menu with variables from the CSV
function populateDropdown(csvData) {
    dropdown = document.getElementById('variableDropdown');
    var uniqueVariables = new Set();

    // Assuming that the CSV variable names follow a pattern like "{variable}_{year}"
    csvData.forEach(function (csvRecord) {
        Object.keys(csvRecord).forEach(function (key) {
            var parts = key.split('_');
            if (parts.length === 2 && !uniqueVariables.has(parts[0])) {
                uniqueVariables.add(parts[0]);
            }
        });
    });

    console.log('Unique Variables:', Array.from(uniqueVariables)); // Debug statement

    // Clear existing options
    dropdown.innerHTML = '';

    // Add a default option
    var defaultOption = document.createElement('option');
    defaultOption.text = 'Select Variable';
    defaultOption.disabled = true;
    defaultOption.selected = true;
    dropdown.add(defaultOption);

    // Add options based on unique variables
    uniqueVariables.forEach(function (variable) {
        var option = document.createElement('option');
        option.value = variable;
        option.text = variable;
        dropdown.add(option);
    });

    // Dropdown change event to update the chart
    dropdown.addEventListener('change', updateChartVariable);
}

// Function to update the chart based on the selected variable
function updateChartVariable() {
    // Use 'pop' as the default variable
    var selectedVariable = dropdown.value || 'pop';
    
    // Call the chart update function here
    updateChartData(selectedVariable);
    console.log('Selected Variable:', selectedVariable);
}


Promise.all([
    d3.json('data/il_tracts_2020_wgs84.topojson'),
    d3.csv('data/marketCharacteristics_table.csv')
]).then(function ([topojsonData, csvData]) {
    var geojsonData = topojson.feature(topojsonData, topojsonData.objects.il_tracts_2020_wgs84);

    geojsonData.features.forEach(function (feature) {
        var uniqueID = feature.properties.GEOID;
        var csvRecord = csvData.find(function (csvRecord) {
            return csvRecord.geog === uniqueID;
        });
        if (csvRecord) {
            feature.properties.pop_2010 = parseInt(csvRecord.pop_2010, 10);
            feature.properties.pop_2015 = parseInt(csvRecord.pop_2015, 10);
            feature.properties.pop_2020 = parseInt(csvRecord.pop_2020, 10);
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

    // Populate the dropdown menu
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
    var selectedPop_2010 = 0;
    var selectedPop_2015 = 0;
    var selectedPop_2020 = 0;

    selectedFeatures.forEach(function (feature) {
        selectedPop_2010 += feature.properties.pop_2010 || 0;
        selectedPop_2015 += feature.properties.pop_2015 || 0;
        selectedPop_2020 += feature.properties.pop_2020 || 0;
    });

    chartData.datasets[0].data = [selectedPop_2010, selectedPop_2015, selectedPop_2020];
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