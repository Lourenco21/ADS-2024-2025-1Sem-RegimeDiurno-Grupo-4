const toggleButton = document.getElementById('toggleButton');
const characteristicsTableHide = document.getElementById('characteristics-table');
const characteristicsH2Hide = document.getElementById('characteristics-h2');

toggleButton.addEventListener('click', () => {
    if(characteristicsTable.getData().length === 0){
        alert("Nenhum ficheiro de características selecionado.")
    }else {
        if (characteristicsTableHide.style.display === 'none' || characteristicsTableHide.style.display === '') {
            characteristicsTableHide.style.display = 'block'; // Show the table
            toggleButton.textContent = 'Esconder tabela de características';
            characteristicsH2Hide.style.display = 'block';
        } else {
            characteristicsTableHide.style.display = 'none'; // Hide the table
            toggleButton.textContent = 'Mostrar tabela de características';
            characteristicsH2Hide.style.display = 'none';
        }
    }

});

function getMatchingRooms(rowData) {
    if(characteristicsTable.getData().length === 0)
        alert("Selecione um ficheiro de Características de Salas de Aula")
    else {
    const requestedFeatures = rowData["Características da sala pedida para a aula"]
        ? rowData["Características da sala pedida para a aula"]
              .toLowerCase()
              .trim()
              .split(",")
        : [];
    const requiredCapacity = parseInt(rowData["Inscritos no turno"], 10) || 0;

    if (!requestedFeatures.length || requestedFeatures[0] === "não necessita de sala") {
        return []; // No rooms needed
    }

    if (requestedFeatures.includes("sala/anfiteatro aulas")) {
        requestedFeatures.push("sala de aulas normal", "anfiteatro aulas");
    }
    if (requestedFeatures.includes("lab ista")) {
        requestedFeatures.push("laboratório de arquitectura de computadores i", "laboratório de arquitectura de computadores ii",
            "laboratório de bases de engenharia", "laboratório de eletrónica", "laboratório de telecomunicações", "laboratório de informática",
            "laboratório de redes de computadores i", "laboratório de redes de computadores ii");
    }


    const roomData = characteristicsTable.getData();

    // Extract date and time information
    const classDate = rowData["Dia"];
    const classStart = rowData["Início"];
    const classEnd = rowData["Fim"];

    // Preprocess schedule data to group by room and day
    const scheduleData = scheduleTable.getData();
    const groupedSchedule = scheduleData.reduce((acc, scheduleRow) => {
        const key = `${scheduleRow["Sala da aula"].trim()}_${scheduleRow["Dia"].trim()}`;
        if (!acc[key]) acc[key] = [];
        acc[key].push({
            start: scheduleRow["Início"],
            end: scheduleRow["Fim"]
        });
        return acc;
    }, {});

    // Filter rooms based on features, capacity, and availability
    const matchingRooms = roomData.filter(room => {
        const actualFeatures = Object.keys(room)
            .filter(col => col !== "Horário sala visível portal público" && room[col] === "X")
            .map(col => col.replace("Características reais da sala", "").trim().toLowerCase());

        const roomCapacity = parseInt(room["Capacidade Normal"], 10) || 0;
        const roomName = room["Nome sala"];

        // Check if the room meets feature and capacity requirements
        const hasMatchingFeature = requestedFeatures.some(requestedFeature =>
            actualFeatures.some(actualFeature =>
                actualFeature.includes(requestedFeature.trim().toLowerCase())
            )
        );
        const meetsCapacity = roomCapacity >= requiredCapacity;

        // Check room availability using the grouped schedule
        const roomKey = `${roomName.trim()}_${classDate.trim()}`;
        const scheduledTimes = groupedSchedule[roomKey] || [];

        // Check if the room is available during the class times
        const isRoomAvailable = !scheduledTimes.some(({ start, end }) => {
            // Check for overlapping times
            return (
                (classStart >= start && classStart < end) || // Overlaps start
                (classEnd > start && classEnd <= end) || // Overlaps end
                (classStart <= start && classEnd >= end) // Encloses
            );
        });

        // Room is valid if it meets all conditions
        return hasMatchingFeature && meetsCapacity && isRoomAvailable;
    });

    return matchingRooms.map(room => room["Nome sala"]); // Adjust column name as necessary
    }
}


// Initialize Tabulator
window.scheduleTable = new Tabulator("#schedule-table", {
    layout: "fitDataFill",
    height: 600,
    pagination: "local",
    paginationSize: 20,
    paginationSizeSelector: [5, 10, 20, 30, 50, 100],
    movableColumns: true,
    paginationCounter: "rows",
    placeholder: "À espera de dados, por favor carregue um ficheiro",
    tooltips: true,
    cellEdited: function(cell) {
        // Recalculate metrics after any cell edit
        const updatedOvercrowdedMetrics = calculateOvercrowdedMetrics();
        const updatedOverlapMetrics = calculateOverlapMetrics();
        const updatedNoRoomMetrics = calculateNoRoomMetrics();
        const updatedTimeRegulationMetrics = calculateTimeRegulationMetrics();
        const updatedWrongCharacteristicsMetrics = calculateMatchingCharacteristicsMetrics();

        // Show the updated balance if metrics were initialized
        if (initialOvercrowdMetrics !== undefined && initialOverlapMetrics !== undefined && initialNoRoomMetrics !== undefined && initialTimeRegulationMetrics !== undefined && initialWrongCharacteristicsMetrics !== undefined) {
            showMetricBalance(initialOvercrowdMetrics, updatedOvercrowdedMetrics, initialOverlapMetrics, updatedOverlapMetrics, initialNoRoomMetrics, updatedNoRoomMetrics, initialTimeRegulationMetrics, updatedTimeRegulationMetrics, initialWrongCharacteristicsMetrics, updatedWrongCharacteristicsMetrics);
        } else {
            console.error("Initial metrics not set.");
        }
    }
});

// Initialize second table for room characteristics
var characteristicsTable = new Tabulator("#characteristics-table", {
    layout: "fitDataFill",
    height: 600,
    pagination: "local",
    paginationSize: 20,
    paginationSizeSelector: [5, 10, 20, 30, 50, 100],
    movableColumns: true,
    paginationCounter: "rows",
    placeholder: "À espera de dados, por favor carregue um ficheiro",
    tooltips: true,
});

let initialOvercrowdMetrics = null;
let initialOverlapMetrics = null;
let initialNoRoomMetrics = null;
let initialTimeRegulationMetrics = null;
let initialWrongCharacteristicsMetrics = null;

// Declare a global variable to store the original schedule data
let originalScheduleData = [];

// Upload file function
document.addEventListener("DOMContentLoaded", function () {
    const scriptTag = document.querySelector('script[file-url]');
    const fileUrl = scriptTag.getAttribute('file-url');

    // Fetch the CSV file and initialize the Tabulator table
    fetch(fileUrl)
        .then(response => response.text())
        .then(csvData => {
            // Parse the CSV data
            Papa.parse(csvData, {
                header: true,
                skipEmptyLines: true,
                complete: function (results) {
                    if (results.data.length === 0) {
                        alert("Ficheiro CSV inválido.");
                        return;
                    }

                    originalScheduleData = results.data;

                    // Initialize the schedule table
                    const columns = generateColumns(results.data);
                    scheduleTable.setColumns(columns);
                    scheduleTable.setData(results.data); // Directly set the data

                    // Calculate metrics
                    initialOvercrowdMetrics = calculateOvercrowdedMetrics();
                    initialOverlapMetrics = calculateOverlapMetrics();
                    initialNoRoomMetrics = calculateNoRoomMetrics();
                    initialTimeRegulationMetrics = calculateTimeRegulationMetrics();
                    initialWrongCharacteristicsMetrics = calculateMatchingCharacteristicsMetrics();
                },
                error: function (error) {
                    alert("Houve um erro a ler o ficheiro.");
                }
            });
        })
        .catch(error => console.error("Erro a carregar ficheiro: ", error));
});


document.addEventListener("DOMContentLoaded", function () {
    const scriptTag = document.querySelector('script[characteristics-url]');
    const fileUrl = scriptTag.getAttribute('characteristics-url');
    fetch (fileUrl)
        .then(response => response.text())
        .then(csvData => {

        Papa.parse(csvData, {
            header: true,
            skipEmptyLines: true,
            complete: function (results) {

                if (results.data.length === 0) {
                    alert("Ficheiro CSV inválido.");
                    return;
                }

                const columns = generateColumns(results.data);
                characteristicsTable.setColumns(columns);
                characteristicsTable.setData(results.data);
            },
            error: function (error) {
                alert("Houve um erro a ler o ficheiro.");
            },
        });

    })
        .catch(error => console.error("Erro a carregar ficheiro: ", error));
});

function getCharacteristics() {
    const characteristicsColumns = characteristicsTable.getColumns();
    return characteristicsColumns
        .slice(5)
        .map(column => column.getField())
        .filter(field => field !== "Horário sala visível portal público");
}

function generateColumns(data) {
    return Object.keys(data[0] || {}).map((field, index) => {
        const nonEditableColumns = [
            "Curso",
            "Unidade de execução",
            "Turno",
            "Turma",
            "Lotação",
            "Características reais da sala",
            "Dia da Semana"
        ];
                if (field === "Sala da aula") {
                return {
                        title: field.charAt(0).toUpperCase() + field.slice(1),
                        field: field,
                        headerMenu: headerMenu,
                        headerFilter: "input",
                        headerFilterPlaceholder: "Search...",
                        headerWordWrap: true,
                        editor: "list",
                        editorParams: function (cell) {
                            const rowData = cell.getRow().getData(); // Get data of the current row
                            const matchingRooms = getMatchingRooms(rowData); // Get the matching rooms based on row data
                            const roomOptions = matchingRooms.length > 0 ? matchingRooms : ["Não há salas disponiveis"];
                            roomOptions.unshift("Sem sala");  // Add an empty string option to the beginning
                            return {
                                values: roomOptions
                            };
                        }
                    };
                }
                if (field === "Características da sala pedida para a aula") {
                return {
                    title: field.charAt(0).toUpperCase() + field.slice(1),
                    field: field,
                    headerMenu: headerMenu,
                    headerFilter: "input",
                    headerFilterPlaceholder: "Search...",
                    headerWordWrap: true,
                    editor: characteristicsTable.getData().length === 0 ? false : "list", // Disable editor if no data
                    editorParams: function () {
                        const characteristics = getCharacteristics();
                        return {
                            values: characteristics.length > 0
                                ? ["Nenhuma característica", ...characteristics]
                                : ["Sem características disponíveis"] // Fallback value if no characteristics
                        };
                    }
                };
            }
        return {
            title: field.charAt(0).toUpperCase() + field.slice(1),
            field: field,
            headerMenu: headerMenu, // Add header menu to each column
            headerFilter: "input",  // Enable input filter for each column
            headerFilterPlaceholder: "Search...",
            headerWordWrap: true,
            editor: !nonEditableColumns.includes(field)
        };
    });
}

// Update the schedule table when characteristicsTable data is ready
characteristicsTable.on("dataProcessed", function () {
    console.log("A");
    onCharacteristicsTableLoaded(); // Update the schedule table
});

function onCharacteristicsTableLoaded() {
    const scheduleColumns = scheduleTable.getColumns();
    scheduleColumns.forEach(column => {
        if (column.getField() === "Características da sala pedida para a aula") {
            column.updateDefinition({
                editor: characteristicsTable.getData().length === 0 ? false : "list",
                editorParams: function () {
                    const characteristics = getCharacteristics(); // Function to fetch the characteristics
                    return {
                        values: characteristics.length > 0
                            ? ["Nenhuma característica", ...characteristics] // Add "No characteristic" option
                            : ["Sem características disponíveis"] // Fallback if no characteristics are available
                    };
                }
            });
        }
    });

    scheduleTable.redraw(); // Apply column updates
}
// Define header menu for column visibility toggle with checkboxes
var headerMenu = function () {
    var menu = [];
    var columns = this.getColumns();

    for (let column of columns) {
        // Create checkbox element
        let checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.checked = column.isVisible();
        checkbox.style.marginRight = "10px";

        // Create label
        let label = document.createElement("span");
        let title = document.createElement("span");
        title.textContent = column.getDefinition().title;

        label.appendChild(checkbox);
        label.appendChild(title);

        // Create menu item
        menu.push({
            label: label,
            action: function (e) {
                // Prevent menu closing
                e.stopPropagation();

                // Toggle current column visibility
                column.toggle();

                // Update checkbox state
                checkbox.checked = column.isVisible();
            },
        });
    }


    return menu;
};

document.getElementById("overcrowdedFilterButton").addEventListener("click", function () {

    resetFiltersAndMetrics();

    // Check if the table has data

    const scheduleData = scheduleTable.getData();

    let totalClasses = scheduleData.length;
    let overcrowdedClasses = 0;

    if (!scheduleData.length) {
        alert("Por favor, faça upload de um CSV antes de aplicar o filtro.");
        return;
    }

    // Check if required columns exist
    const hasRequiredColumns = scheduleData.some(row =>
        "Inscritos no turno" in row &&
        "Lotação" in row &&
        "Características da sala pedida para a aula" in row &&
        "Sala da aula" in row
    );
    if (!hasRequiredColumns) {
        alert("O ficheiro CSV não contém as colunas necessárias ('Inscritos no turno' e 'Lotação').");
        return;
    }

    // Apply a filter to hide rows that don't meet the criteria
    scheduleTable.setFilter(row => {
        const inscritos = parseFloat(row["Inscritos no turno"]) || 0;
        const vagas = parseFloat(row["Lotação"]) || 0;
        const contexto = row["Características da sala pedida para a aula"] ? row["Características da sala pedida para a aula"].toLowerCase().trim() : "";
        const sala = row["Sala da aula"] ? row["Sala da aula"].trim() : "";
        const textoExcluido = "Não necessita de sala".toLowerCase();

        if (inscritos > vagas && contexto !== textoExcluido && sala !== "") {
            overcrowdedClasses++;
            return true; // Show this row
        }
        return false; // Hide this row
    });



    const overcrowdedPercentage = totalClasses > 0 ? ((overcrowdedClasses / totalClasses) * 100).toFixed(2) : 0;

    let metricDisplay = document.getElementById("overcrowdedMetrics");
        if (!metricDisplay) {
            // Create the metric display element if it doesn't exist
            metricDisplay = document.createElement("div");
            metricDisplay.id = "overcrowdedMetrics";
            metricDisplay.style.marginTop = "10px"; // Add some spacing
            metricDisplay.style.fontWeight = "bold"; // Make the text bold
            metricDisplay.style.display = "block";
            document.getElementById("overcrowdedFilterButton").insertAdjacentElement("afterend", metricDisplay);
        }

        // Update the metric display content
        metricDisplay.innerHTML = `
            <p>Total de aulas: ${totalClasses}</p>
            <p>Aulas sobrelotadas: ${overcrowdedClasses}</p>
            <p>Percentagem de superlotação: ${overcrowdedPercentage}%</p>
        `;

        metricDisplay.style.display = "block";

        initialOvercrowdMetrics = totalClasses > 0 ? ((overcrowdedClasses / totalClasses) * 100) : 0;
        initialOverlapMetrics = calculateOverlapMetrics();
        initialNoRoomMetrics = calculateNoRoomMetrics();
        initialTimeRegulationMetrics = calculateTimeRegulationMetrics();
        initialWrongCharacteristicsMetrics = calculateMatchingCharacteristicsMetrics();

});

document.getElementById("overlapFilterButton").addEventListener("click", function () {

    resetFiltersAndMetrics();

    // Get the data from the schedule table
    const scheduleData = scheduleTable.getData();

    let totalClasses = scheduleData.length;
    let overlapClasses = 0;

    if (!scheduleData.length) {
        alert("Por favor, faça upload de um CSV antes de aplicar o filtro.");
        return;
    }

    // Ensure required columns exist
    const hasRequiredColumns = scheduleData.some(row =>
        "Início" in row &&
        "Fim" in row &&
        "Sala da aula" in row &&
        "Dia" in row
    );

    if (!hasRequiredColumns) {
        alert("O ficheiro CSV não contém as colunas necessárias ('Início', 'Fim', 'Sala da aula', 'Dia').");
        return;
    }

    // Filter out rows with empty "Sala da aula"
    const validData = scheduleData.filter(row => row["Sala da aula"] && row["Sala da aula"].trim() !== "");

    if (!validData.length) {
        alert("Todas as aulas possuem 'Sala da aula' vazia. Nenhuma sobreposição será calculada.");
        return;
    }

    // Convert time to minutes
    const parseTime = (timeStr) => {
        const [hours, minutes] = timeStr.split(":").map(Number);
        return hours * 60 + minutes;
    };

    // Preprocess data to add parsed times and a group key
    validData.forEach(row => {
        row._start = parseTime(row["Início"]);
        row._end = parseTime(row["Fim"]);
        row._key = `${row["Sala da aula"].trim()}_${row["Dia"].trim()}`;
    });

    // Group rows by "Sala da aula" and "Dia"
    const groupBy = (data, keyFn) => {
        return data.reduce((acc, row) => {
            const key = keyFn(row);
            if (!acc[key]) acc[key] = [];
            acc[key].push(row);
            return acc;
        }, {});
    };

    const groupedData = groupBy(validData, row => row._key);

    const overlaps = [];
    const addedRows = new Set(); // Ensure no duplicate rows are added

    // Check for overlaps within each group
    Object.values(groupedData).forEach(group => {
        // Sort by start time for efficient comparison
        group.sort((a, b) => a._start - b._start);

        for (let i = 0; i < group.length; i++) {
            const rowA = group[i];
            const startA = rowA._start;
            const endA = rowA._end;

            for (let j = i + 1; j < group.length; j++) {
                const rowB = group[j];
                const startB = rowB._start;
                const endB = rowB._end;

                // Stop checking if no more overlaps are possible
                if (startB >= endA) break;

                // Check if rows overlap
                if ((startA < endB && startA >= startB) || (startB < endA && startB >= startA)) {
                    if (!addedRows.has(rowA)) {
                        overlaps.push(rowA);
                        addedRows.add(rowA);
                        overlapClasses++;
                    }
                    if (!addedRows.has(rowB)) {
                        overlaps.push(rowB);
                        addedRows.add(rowB);
                        overlapClasses++;
                    }
                }
            }
        }
});

// Now apply the filter correctly using setFilter
scheduleTable.setFilter((row) => {
    // Ensure _start and _end are part of the row for comparison
    const rowStart = parseTime(row["Início"]);
    const rowEnd = parseTime(row["Fim"]);
    const rowKey = `${row["Sala da aula"].trim()}_${row["Dia"].trim()}`;

    return overlaps.some(overlapRow => {
        // Only check for overlaps for rows in the same room and day
        if (overlapRow._key === rowKey) {
            return (
                // Check if time overlaps
                (rowStart < overlapRow._end && rowStart >= overlapRow._start) ||
                (overlapRow._start < rowEnd && overlapRow._start >= rowStart)
            );
        }
        return false;
    });
});


    const overlapPercentage = totalClasses > 0 ? ((overlapClasses / totalClasses) * 100).toFixed(2) : 0;

    let metricDisplay = document.getElementById("overlapMetrics");
        if (!metricDisplay) {
            // Create the metric display element if it doesn't exist
            metricDisplay = document.createElement("div");
            metricDisplay.id = "overcrowdedMetrics";
            metricDisplay.style.marginTop = "10px";
            metricDisplay.style.fontWeight = "bold";
            document.getElementById("overcrowdedFilterButton").insertAdjacentElement("afterend", metricDisplay);
        }

        metricDisplay.innerHTML = `
            <p>Total de aulas: ${totalClasses}</p>
            <p>Aulas sobrepostas: ${overlapClasses}</p>
            <p>Percentagem de sobreposição: ${overlapPercentage}%</p>
        `;

        metricDisplay.style.display = "block";

        initialOvercrowdMetrics = calculateOvercrowdedMetrics();
        initialOverlapMetrics = totalClasses > 0 ? ((overlapClasses / totalClasses) * 100) : 0;
        initialNoRoomMetrics = calculateNoRoomMetrics();
        initialTimeRegulationMetrics = calculateTimeRegulationMetrics();
        initialWrongCharacteristicsMetrics = calculateMatchingCharacteristicsMetrics();

});

function calculateOvercrowdedMetrics() {

    const scheduleData = scheduleTable.getData();

    let totalClasses = scheduleData.length;
    let overcrowdedClasses = 0;

    if (!scheduleData.length) {
        throw new Error("No data available. Please upload a CSV first.");
    }

    const hasRequiredColumns = scheduleData.some(row =>
        "Inscritos no turno" in row &&
        "Lotação" in row &&
        "Características da sala pedida para a aula" in row &&
        "Sala da aula" in row
    );
    if (!hasRequiredColumns) {
        throw new Error("Missing required columns ('Inscritos no turno' and 'Lotação').");
    }

    scheduleData.forEach(row => {
        const inscritos = parseFloat(row["Inscritos no turno"]) || 0;
        const vagas = parseFloat(row["Lotação"]) || 0;
        const contexto = row["Características da sala pedida para a aula"] ? row["Características da sala pedida para a aula"].toLowerCase().trim() : "";
        const sala = row["Sala da aula"] ? row["Sala da aula"].trim() : "";

        const textoExcluido = "Não necessita de sala".toLowerCase();

        if (inscritos > vagas && contexto !== textoExcluido && sala !== "") {
            overcrowdedClasses++;
        }
    });

    const overcrowdedPercentage = totalClasses > 0 ? ((overcrowdedClasses / totalClasses) * 100) : 0;

    return overcrowdedPercentage
}

function calculateOverlapMetrics() {

    const scheduleData = scheduleTable.getData();

    let totalClasses = scheduleData.length;
    let overlapClasses = 0;

    if (!scheduleData.length) {
        throw new Error("No data available. Please upload a CSV first.");
    }

    const hasRequiredColumns = scheduleData.some(row =>
        "Início" in row &&
        "Fim" in row &&
        "Sala da aula" in row &&
        "Dia" in row
    );
    if (!hasRequiredColumns) {
        throw new Error("Missing required columns ('Início', 'Fim', 'Sala da aula', 'Dia').");
    }

    const validData = scheduleData.filter(row => row["Sala da aula"] && row["Sala da aula"].trim() !== "");

    if (!validData.length) {
        throw new Error("All classes have an empty 'Sala da aula'. No overlaps can be calculated.");
    }

    // Convert time to minutes
    const parseTime = (timeStr) => {
        const [hours, minutes] = timeStr.split(":").map(Number);
        return hours * 60 + minutes;
    };

    // Preprocess data to add parsed times and a group key
    validData.forEach(row => {
        row._start = parseTime(row["Início"]);
        row._end = parseTime(row["Fim"]);
        row._key = `${row["Sala da aula"].trim()}_${row["Dia"].trim()}`;
    });

    // Group rows by "Sala da aula" and "Dia"
    const groupBy = (data, keyFn) => {
        return data.reduce((acc, row) => {
            const key = keyFn(row);
            if (!acc[key]) acc[key] = [];
            acc[key].push(row);
            return acc;
        }, {});
    };

    const groupedData = groupBy(validData, row => row._key);

    const addedRows = new Set(); // Ensure no duplicate rows are added

    // Check for overlaps within each group
    Object.values(groupedData).forEach(group => {
        // Sort by start time for efficient comparison
        group.sort((a, b) => a._start - b._start);

        for (let i = 0; i < group.length; i++) {
            const rowA = group[i];
            const startA = rowA._start;
            const endA = rowA._end;

            for (let j = i + 1; j < group.length; j++) {
                const rowB = group[j];
                const startB = rowB._start;

                // Stop checking if no more overlaps are possible
                if (startB >= endA) break;

                const endB = rowB._end;

                // Check if rows overlap
                if ((startA < endB && startA >= startB) || (startB < endA && startB >= startA)) {
                    if (!addedRows.has(rowA)) {
                        addedRows.add(rowA);
                        overlapClasses++;
                    }
                    if (!addedRows.has(rowB)) {
                        addedRows.add(rowB);
                        overlapClasses++;
                    }
                }
            }
        }
    });

    const overlapPercentage = totalClasses > 0 ? ((overlapClasses / totalClasses) * 100) : 0;

    // Return the metrics as an object
    return overlapPercentage
}

function showMetricsPopup() {
    const popup = document.getElementById('metricBalancePopup');
    if (!popup) return; // Ensure popup exists

    // Add the "show" class to make it visible
    popup.classList.add('show');

}

function closePopup() {
    const popup = document.getElementById('metricBalancePopup');
    if (popup) {
        popup.classList.remove('show'); // Hide the popup
    }
}


function showMetricBalance(initialOvercrowd, updatedOvercrowd, initialOverlap, updatedOverlap, initialNoRoom, updatedNoRoom, initialFailRegulation, updatedFailRegulation, initialWrongCharacteristics, updatedWrongCharacteristics) {
    let balanceDisplay = document.getElementById("metricBalance");

    if (!balanceDisplay) {
        balanceDisplay = document.createElement("div");
        balanceDisplay.id = "metricBalancePopup";
        balanceDisplay.className = "popup-metrics";
        document.body.appendChild(balanceDisplay);

    }

    let overcrowdedResult = "No Quality change";
    let overlapResult = "No Quality change";
    let noRoomResult = "No Quality change";
    let failRegulationResult = "No Quality change";
    let wrongCharacteristicsResult = "No Quality change";

    // Calculate the differences
    const overcrowdedPercentageDiff = (updatedOvercrowd - initialOvercrowd);
    const overlapPercentageDiff = (updatedOverlap - initialOverlap);
    const noRoomPercentageDiff = (updatedNoRoom - initialNoRoom);
    const failRegulationPercentageDiff = (updatedFailRegulation - initialFailRegulation);
    const wrongCharacteristicsPercentageDiff = (updatedWrongCharacteristics - initialWrongCharacteristics);

    if(overcrowdedPercentageDiff < 0)
        overcrowdedResult = "Improved Quality"
    else if(overcrowdedPercentageDiff > 0)
        overcrowdedResult = "Decreased Quality"

    if(overlapPercentageDiff < 0)
        overlapResult = "Improved Quality"
    else if(overlapPercentageDiff > 0)
        overlapResult = "Decreased Quality"

    if(noRoomPercentageDiff < 0)
        noRoomResult = "Improved Quality"
    else if(noRoomPercentageDiff > 0)
        noRoomResult = "Decreased Quality"

    if(failRegulationPercentageDiff < 0)
        failRegulationResult = "Improved Quality"
    else if(failRegulationPercentageDiff > 0)
        failRegulationResult = "Decreased Quality"

    if(wrongCharacteristicsPercentageDiff < 0)
        wrongCharacteristicsResult = "Improved Quality"
    else if(wrongCharacteristicsPercentageDiff > 0)
        wrongCharacteristicsResult = "Decreased Quality"

    balanceDisplay.innerHTML = `
        <h4 style="text-align: center; margin: 0;">Metrics Update Balance</h4>
        <p>Overcrowd Result: ${overcrowdedResult}</p>
        <p>Overlap Result: ${overlapResult}</p>
        <p>Without room Result: ${noRoomResult}</p>
        <p>Time Regulation Fail Result: ${failRegulationResult}</p>
        <p>Wrong Characteristics Result: ${wrongCharacteristicsResult}</p>
        <button onclick="closePopup()">&times;</button>
    `;
    showMetricsPopup();

}

function resetFiltersAndMetrics() {
    scheduleTable.clearFilter();
    if (!originalScheduleData.length) {
        alert("Nenhum dado original encontrado para restaurar.");
        return;
    }

    const allMetricDisplays = document.querySelectorAll("[id$='Metrics']"); // Selects all elements with an ID ending in 'Metrics'
    allMetricDisplays.forEach(metric => {
        metric.style.display = "none"; // Hide each metric element
    });

    initialOvercrowdMetrics = calculateOvercrowdedMetrics();
    initialOverlapMetrics = calculateOverlapMetrics();
    initialNoRoomMetrics = calculateNoRoomMetrics();
    initialTimeRegulationMetrics = calculateTimeRegulationMetrics();
    initialWrongCharacteristicsMetrics = calculateMatchingCharacteristicsMetrics();

}
document.getElementById("resetFilterButton").addEventListener("click", function () {
    resetFiltersAndMetrics();
});

scheduleTable.on("cellDblClick", function(e, cell) {
       cell.edit(); // Allow editing if not in the non-editable list
});





document.getElementById("classWithoutRoomButton").addEventListener("click", function () {

    resetFiltersAndMetrics();

    const scheduleData = scheduleTable.getData();

    let totalClasses = scheduleData.length;
    let classesWithoutRoom = 0;

    if (!scheduleData.length) {
        alert("Por favor, faça upload de um CSV antes de aplicar o filtro.");
        return;
    }

    const hasRequiredColumn = scheduleData.some(row => "Sala da aula" in row);

    if (!hasRequiredColumn) {
        alert("O ficheiro CSV não contém a coluna necessária ('Sala da aula').");
        return;
    }

    // Define the exclusion text and filter logic
    const textoExcluido = "Não necessita de sala".toLowerCase();

    scheduleTable.setFilter(row => {

        const contexto = row["Características da sala pedida para a aula"]
            ? row["Características da sala pedida para a aula"].toLowerCase().trim()
            : "";

        // Check if the row meets the criteria for "without room"
        if ((!row["Sala da aula"] || row["Sala da aula"].trim() === "") && contexto !== textoExcluido) {
            classesWithoutRoom++; // Increment the "without room" counter
            return true; // Include this row in the filter
        }
        return false; // Exclude this row from the filter
    });

    const classesWithoutRoomPercentage = totalClasses > 0 ? ((classesWithoutRoom / totalClasses) * 100).toFixed(2) : 0;

    let metricDisplay = document.getElementById("withoutRoomMetrics");
        if (!metricDisplay) {
            // Create the metric display element if it doesn't exist
            metricDisplay = document.createElement("div");
            metricDisplay.id = "overcrowdedMetrics";
            metricDisplay.style.marginTop = "10px"; // Add some spacing
            metricDisplay.style.fontWeight = "bold"; // Make the text bold
            metricDisplay.style.display = "block";
            document.getElementById("overcrowdedFilterButton").insertAdjacentElement("afterend", metricDisplay);
        }

        // Update the metric display content
        metricDisplay.innerHTML = `
            <p>Total de aulas: ${totalClasses}</p>
            <p>Aulas sem sala: ${classesWithoutRoom}</p>
            <p>Percentagem de aulas sem sala: ${classesWithoutRoomPercentage}%</p>
        `;

        metricDisplay.style.display = "block";



    initialOvercrowdMetrics = calculateOvercrowdedMetrics();
    initialOverlapMetrics = calculateOverlapMetrics();
    initialNoRoomMetrics = totalClasses > 0 ? ((classesWithoutRoom / totalClasses) * 100) : 0;
    initialTimeRegulationMetrics = calculateTimeRegulationMetrics();
    initialWrongCharacteristicsMetrics = calculateMatchingCharacteristicsMetrics();

});

document.getElementById("timeRegulationsButton").addEventListener("click", function () {
    resetFiltersAndMetrics();

    // Get the schedule table data

    const scheduleData = scheduleTable.getData();

    let totalClasses = scheduleData.length;
    let filteredClasses = 0;

    if (!scheduleData.length) {
        alert("Por favor, faça upload de um CSV antes de aplicar o filtro.");
        return;
    }

    const hasRequiredColumns = scheduleData.some(row => "Início" in row && "Fim" in row);
    if (!hasRequiredColumns) {
        alert("O ficheiro CSV não contém as colunas necessárias ('Início' e 'Fim').");
        return;
    }

    // Function to convert time in HH:MM:SS format to minutes
    const parseTime = (timeStr) => {
        const [hours, minutes] = timeStr.split(":").map(Number);
        return hours * 60 + minutes; // Return total minutes
    };

    // Define time limits
    const startLimit = parseTime("08:00:00"); // 8:00 AM
    const endLimit = parseTime("21:00:00"); // 9:00 PM
    const maxDuration = 180; // 3 hours (180 minutes)

    // Apply filter to display only rows that don't meet time regulations
    scheduleTable.setFilter(row => {

        const contexto = row["Características da sala pedida para a aula"]
            ? row["Características da sala pedida para a aula"].toLowerCase().trim()
            : "";
        const start = parseTime(row["Início"]);
        const end = parseTime(row["Fim"]);

        const textoExcluido = "Não necessita de sala".toLowerCase();

        // Check if class violates time regulations
        const isBeforeStartLimit = start < startLimit; // Class starts before 8:00 AM
        const isAfterEndLimit = start > endLimit; // Class starts after 9:00 PM
        const hasInvalidDuration = (end - start) > maxDuration; // Duration exceeds 3 hours

        if ((isBeforeStartLimit || isAfterEndLimit || hasInvalidDuration) && contexto !== textoExcluido) {
            filteredClasses++; // Increment filtered class count
            return true; // Include row in filter
        }
        return false; // Exclude row from filter
    });
    const regulationFailPercentage = totalClasses > 0 ? ((filteredClasses / totalClasses) * 100).toFixed(2) : 0;

    let metricDisplay = document.getElementById("timeRegulationsMetrics");
        if (!metricDisplay) {
            // Create the metric display element if it doesn't exist
            metricDisplay = document.createElement("div");
            metricDisplay.id = "overcrowdedMetrics";
            metricDisplay.style.marginTop = "10px"; // Add some spacing
            metricDisplay.style.fontWeight = "bold"; // Make the text bold
            metricDisplay.style.display = "block";
            document.getElementById("overcrowdedFilterButton").insertAdjacentElement("afterend", metricDisplay);
        }

        // Update the metric display content
        metricDisplay.innerHTML = `
            <p>Total de aulas: ${totalClasses}</p>
            <p>Aulas que não cumprem regulamentos: ${filteredClasses}</p>
            <p>Percentagem de superlotação: ${regulationFailPercentage}%</p>
        `;

        metricDisplay.style.display = "block";

    initialOvercrowdMetrics = calculateOvercrowdedMetrics();
    initialOverlapMetrics = calculateOverlapMetrics();
    initialNoRoomMetrics = calculateNoRoomMetrics();
    initialTimeRegulationMetrics = totalClasses > 0 ? ((filteredClasses / totalClasses) * 100) : 0;
    initialWrongCharacteristicsMetrics = calculateMatchingCharacteristicsMetrics();
});


document.getElementById("matchingCharacteristicsButton").addEventListener("click", function () {
    resetFiltersAndMetrics(); // Reset any previous filters or metrics (if needed)

    // Get the schedule data
    const scheduleData = scheduleTable.getData();
    let totalClasses = scheduleData.length;
    let filteredClasses = 0;

    if (!scheduleData.length) {
        alert("Por favor, faça upload de um CSV antes de aplicar o filtro.");
        return;
    }

    scheduleTable.setFilter(row => {
        let requestedFeatures = row["Características da sala pedida para a aula"]
            ? row["Características da sala pedida para a aula"].toLowerCase().trim().split(",")
            : [];


        if (!requestedFeatures.length || requestedFeatures[0] === "não necessita de sala") {
            return false;
        }

        if (row["Características da sala pedida para a aula"].toLowerCase().trim() === "sala/anfiteatro aulas") {
            requestedFeatures.push("sala de aulas normal", "anfiteatro aulas");
        }

        const actualFeatures = row["Características reais da sala"]
            ? row["Características reais da sala"].toLowerCase().trim().split(",")
            : [];

        const matches = requestedFeatures.some(requestedFeature =>
            actualFeatures.some(actualFeature => actualFeature.toLowerCase().includes(requestedFeature.trim()))
        );
        if(!matches)
            filteredClasses++;

        return !matches;
    });

    const wrongCharacteristicsPercentage = totalClasses > 0 ? ((filteredClasses / totalClasses) * 100).toFixed(2) : 0;

    let metricDisplay = document.getElementById("characteristicsMetrics");
        if (!metricDisplay) {
            // Create the metric display element if it doesn't exist
            metricDisplay = document.createElement("div");
            metricDisplay.id = "overcrowdedMetrics";
            metricDisplay.style.marginTop = "10px"; // Add some spacing
            metricDisplay.style.fontWeight = "bold"; // Make the text bold
            metricDisplay.style.display = "block";
            document.getElementById("overcrowdedFilterButton").insertAdjacentElement("afterend", metricDisplay);
        }

        metricDisplay.innerHTML = `
            <p>Total de aulas: ${totalClasses}</p>
            <p>Aulas que não cumprem regulamentos: ${filteredClasses}</p>
            <p>Percentagem de superlotação: ${wrongCharacteristicsPercentage}%</p>
        `;

        metricDisplay.style.display = "block";

        initialOvercrowdMetrics = calculateOvercrowdedMetrics();
        initialOverlapMetrics = calculateOverlapMetrics();
        initialNoRoomMetrics = calculateNoRoomMetrics();
        initialTimeRegulationMetrics = calculateTimeRegulationMetrics();
        initialWrongCharacteristicsMetrics = totalClasses > 0 ? ((filteredClasses / totalClasses) * 100) : 0;

});

function calculateMatchingCharacteristicsMetrics(){

    // Get the schedule data

    const scheduleData = scheduleTable.getData();

    let totalClasses = scheduleData.length;
    let classesWithoutMatchingCharacteristics = 0;

    if (!scheduleData.length) {
        alert("Por favor, faça upload de um CSV antes de aplicar o filtro.");
        return;
    }

    // Function to compare features and return rows with non-matching features
    const filteredData = scheduleData.filter(row => {
        let requestedFeatures = row["Características da sala pedida para a aula"]
            ? row["Características da sala pedida para a aula"].toLowerCase().trim().split(",")
            : [];

        // If the requested features are empty or say "Não necessita de sala", skip filtering
        if (!requestedFeatures.length || requestedFeatures[0] === "não necessita de sala") {
            return;
        }

        // Special case for "Sala/anfiteatro aulas"
        if (row["Características da sala pedida para a aula"].toLowerCase().trim() === "sala/anfiteatro aulas") {
            requestedFeatures.push("sala de aulas normal", "anfiteatro aulas");
        }

        const actualFeatures = row["Características reais da sala"]
            ? row["Características reais da sala"].toLowerCase().trim().split(",")
            : [];

        // Check if at least one requested feature matches any actual feature
        const matches = requestedFeatures.some(requestedFeature =>
            actualFeatures.some(actualFeature => actualFeature.toLowerCase().includes(requestedFeature.trim()))
        );

        if(!matches)
            classesWithoutMatchingCharacteristics++;
        
        return !matches;
    });

    const wrongCharacteristicsPercentage = totalClasses > 0 ? ((classesWithoutMatchingCharacteristics / totalClasses) * 100) : 0;

    return wrongCharacteristicsPercentage;
}

function calculateNoRoomMetrics(){
    const scheduleData = scheduleTable.getData();

    let totalClasses = scheduleData.length;
    let classesWithoutRoom = 0;

    if (!scheduleData.length) {
        alert("Por favor, faça upload de um CSV antes de aplicar o filtro.");
        return;
    }

    const hasRequiredColumn = scheduleData.some(row => "Sala da aula" in row);

    if (!hasRequiredColumn) {
        alert("O ficheiro CSV não contém a coluna necessária ('Sala da aula').");
        return;
    }

    // Filtrar os dados manualmente
    const filteredData = scheduleData.filter(row => {
        const contexto = row["Características da sala pedida para a aula"] ? row["Características da sala pedida para a aula"].toLowerCase().trim() : "";

        const textoExcluido = "Não necessita de sala".toLowerCase();
        if ((!row["Sala da aula"] || row["Sala da aula"].trim() === "") && contexto !== textoExcluido) {
            classesWithoutRoom++; // Incrementar o contador de aulas sem sala
        }
    });

    const overcrowdedPercentage = totalClasses > 0 ? ((classesWithoutRoom / totalClasses) * 100) : 0;

    return overcrowdedPercentage;

}

function calculateTimeRegulationMetrics(){

    // Obter os dados da tabela de horários

    const scheduleData = scheduleTable.getData();

    let totalClasses = scheduleData.length;
    let filteredClasses = 0;

    if (!scheduleData.length) {
        alert("Por favor, faça upload de um CSV antes de aplicar o filtro.");
        return;
    }

    const hasRequiredColumns = scheduleData.some(row => "Início" in row && "Fim" in row);
    if (!hasRequiredColumns) {
        alert("O ficheiro CSV não contém as colunas necessárias ('Início' e 'Fim').");
    }

    // Função para converter hora no formato HH:MM:SS para minutos
    const parseTime = (timeStr) => {
        const [hours, minutes] = timeStr.split(":").map(Number);
        return hours * 60 + minutes; // Retorna o total de minutos
    };

    // Definindo os limites de horário
    const startLimit = parseTime("08:00:00"); // 8:00 AM
    const endLimit = parseTime("21:00:00"); // 9:00 PM
    const maxDuration = 180; // 3 horas (180 minutos)

    // Filtrar os dados de acordo com as condições **não atendidas**
    const filteredData = scheduleData.filter(row => {
        const start = parseTime(row["Início"]);
        const end = parseTime(row["Fim"]);
        const contexto = row["Características da sala pedida para a aula"] ? row["Características da sala pedida para a aula"].toLowerCase().trim() : "";

        const textoExcluido = "Não necessita de sala".toLowerCase();
        // Verificar se a aula não está dentro do horário permitido e tem mais de 3 horas de duração
        const isBeforeStartLimit = start < startLimit; // Aula começa antes das 8:00
        const isAfterEndLimit = start > endLimit; // Aula começa depois das 21:00
        const hasInvalidDuration = (end - start) > maxDuration; // Duração maior que 3 horas

        if ((isBeforeStartLimit || isAfterEndLimit || hasInvalidDuration) && contexto !== textoExcluido) {
            filteredClasses++; // Incrementa o contador de aulas filtradas
        }
    });
    const overcrowdedPercentage = totalClasses > 0 ? ((filteredClasses / totalClasses) * 100) : 0;
    return overcrowdedPercentage;

}

function getRoomCharacteristics(roomName) {
    const characteristicsData = characteristicsTable.getData();
    const columns = characteristicsTable.getColumns();
    const room = characteristicsData.find(row => row["Nome sala"] === roomName);

    if (room) {
        const features = Object.keys(room)
            .filter(col => col !== "Horário sala visível portal público" && room[col] === "X")
            .join(", ");
        return {
            capacity: room["Capacidade Normal"],
            features: features
        };
    } else {
        return null;
    }
}

scheduleTable.on("cellEdited", function (cell) {

    if (cell.getColumn().getField() === "Inscritos no turno") {
            const value = cell.getValue();
            if (isNaN(value) || value < 0 || !Number.isInteger(Number(value))) {
                alert("Erro: Apenas números inteiros positivos são permitidos.");
                cell.setValue(cell.getOldValue());

            }
        }

    if (cell.getValue() === "Nenhuma característica") {
                        cell.setValue(""); // Clear the cell's value
                    }

    const row = cell.getRow();

    if (cell.getColumn().getField() === "Dia") {
        const newDate = cell.getValue(); // New date value
        const originalDate = cell.getOldValue(); // Old date value
        const room = row.getData()["Sala da aula"]; // Get the room of the class
        const startTime = row.getData()["Início"];
        const endTime = row.getData()["Fim"];

        const parseDate = (dateStr) => {
            const [day, month, year] = dateStr.split("/");
            return new Date(`${year}-${month}-${day}`);
        };

        // Function to parse time in "HH:MM" format
        const parseTime = (timeStr) => {
            const [hours, minutes] = timeStr.split(":").map(Number);
            return hours * 60 + minutes;
        };

        const startMinutes = parseTime(startTime);
        const endMinutes = parseTime(endTime);

        const parsedDate = parseDate(newDate);

        if (isNaN(parsedDate)) {
            alert("Erro: O valor da data não é válido.");
            cell.setValue(originalDate); // Revert to the old value
            return;
        }

        // Check if the new date is a weekend
        const dayOfWeek = parsedDate.getDay();

        if (dayOfWeek === 0 || dayOfWeek === 6) {
            const userChoice = confirm(
                "Aviso: O dia selecionado é um fim de semana. Deseja continuar com esta alteração?"
            );
            if (!userChoice) {
                cell.setValue(originalDate); // Revert to the old value
                return;
            }
        }

        const isRoomAvailable = !scheduleTable.getRows().some((otherRow) => {
            const otherRowData = otherRow.getData(); // Access data of another row
            const otherDate = otherRowData["Dia"]; // Get the other row's date

            // Ensure we check if it's the same room and same date
            if (
                otherRowData["Sala da aula"] === room &&
                otherDate === newDate && // Compare the new date
                otherRow !== row // Exclude the current row by comparing row instances
            ) {
                const otherStart = parseTime(otherRowData["Início"]);
                const otherEnd = parseTime(otherRowData["Fim"]);

                // Check for overlaps
                const isOverlapping = (
                    (startMinutes < otherEnd && startMinutes >= otherStart) || // Overlaps start
                    (endMinutes > otherStart && endMinutes <= otherEnd) || // Overlaps end
                    (startMinutes <= otherStart && endMinutes >= otherEnd) // Encloses
                );
                return isOverlapping;
            }
            return false;
        });

        // If the room is not available, show an alert and revert the date change
        if (!isRoomAvailable) {
            alert("Erro: A sala não está disponível para o novo dia e horário.");
            cell.setValue(originalDate); // Revert to the old value
            return;
        }

        // Map day of week to names
        const dayOfWeekMapping = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];
        const dayOfWeekName = dayOfWeekMapping[dayOfWeek];

        // Update "Dia da Semana" column
        row.update({ "Dia da Semana": dayOfWeekName });
    }



    if (cell.getColumn().getField() === "Sala da aula") {
            const originalValue = cell.getOldValue();
            const roomName = cell.getValue();
            const row = cell.getRow();

            if (roomName === "Sem sala") {

                row.update({
                    "Sala da aula": "",
                    "Lotação": "",
                    "Características reais da sala": ""
                });
                return;
            }
            if (roomName) {
                const roomCharacteristics = getRoomCharacteristics(roomName);

                if (roomCharacteristics) {
                    row.update({
                        "Lotação": roomCharacteristics.capacity,
                        "Características reais da sala": roomCharacteristics.features
                    });
                } else {

                    alert("Não há opções de Sala. Irá ficar com a sala atual.");
                    cell.setValue(originalValue);
                }
            }
            if (!roomName) {
                cell.setValue(originalValue);
                const characteristics = getRoomCharacteristics(originalValue)
                row.update({
                    "Lotação": characteristics.capacity,
                    "Características reais da sala": characteristics.features
                });
            }
    }
    const updatedOvercrowdedMetrics = calculateOvercrowdedMetrics();
    const updatedOverlapMetrics = calculateOverlapMetrics();
    const updatedNoRoomMetrics = calculateNoRoomMetrics();
    const updatedTimeRegulationMetrics = calculateTimeRegulationMetrics();
    const updatedWrongCharacteristicsMetrics = calculateMatchingCharacteristicsMetrics();

    if (initialOvercrowdMetrics !== undefined && initialOverlapMetrics !== undefined && initialNoRoomMetrics !== undefined && initialTimeRegulationMetrics !== undefined && initialWrongCharacteristicsMetrics !== undefined) {
        showMetricBalance(initialOvercrowdMetrics, updatedOvercrowdedMetrics, initialOverlapMetrics, updatedOverlapMetrics, initialNoRoomMetrics, updatedNoRoomMetrics, initialTimeRegulationMetrics, updatedTimeRegulationMetrics, initialWrongCharacteristicsMetrics, updatedWrongCharacteristicsMetrics);
    } else {
        console.error("Initial metrics are not set.");
    }

    initialOvercrowdMetrics = updatedOvercrowdedMetrics;
    initialOverlapMetrics = updatedOverlapMetrics;
    initialNoRoomMetrics = updatedNoRoomMetrics;
    initialTimeRegulationMetrics = updatedTimeRegulationMetrics;
    initialWrongCharacteristicsMetrics = updatedWrongCharacteristicsMetrics;
});

function updateScheduleWithRoomCharacteristics() {
    const rows = scheduleTable.getRows();
    rows.forEach(row => {
        const rowData = row.getData();
        const roomName = rowData["Sala da aula"];

        if (roomName) {

            const roomData = getRoomCharacteristics(roomName);

            if (roomData) {

                row.update({
                    "Lotação": roomData.capacity,
                    "Características reais da sala": roomData.features
                });
            } else {

                row.update({
                    "Lotação": "",
                    "Características reais da sala": ""
                });
            }
        }
    });
    initialOvercrowdMetrics = calculateOvercrowdedMetrics();
    initialOverlapMetrics = calculateOverlapMetrics();
    initialNoRoomMetrics = calculateNoRoomMetrics();
    initialTimeRegulationMetrics = calculateTimeRegulationMetrics();
    initialWrongCharacteristicsMetrics = calculateMatchingCharacteristicsMetrics();
    originalScheduleData = scheduleTable.getData();
    alert("Atualização das características feita com sucesso!");
}

document.getElementById("updateScheduleCharacteristicsButton").addEventListener("click", function () {
    updateScheduleWithRoomCharacteristics();
});


function saveScheduleChanges(scheduleId) {
    const tableData = scheduleTable.getData(); // Get all data from Tabulator

    if (!tableData || tableData.length === 0) {
        alert("No data available to save.");
        return;
    }

    // Convert data back to CSV
    const csvContent = Papa.unparse(tableData);

    // Create a Blob from the CSV content
    const csvBlob = new Blob([csvContent], { type: "text/csv" });
    const fileName = "updated_schedule.csv";

    // Append the Blob to FormData
    const formData = new FormData();
    formData.append("file", csvBlob, fileName);

    // Send the file to Django
    fetch(`/update-schedule/${scheduleId}/`, {
        method: "POST",
        body: formData,
    })
        .then((response) => response.json())
        .then((data) => {
            if (data.success) {
                alert(data.message);
            } else {
                alert("Error: " + data.message);
            }
        })
        .catch((error) => {
            console.error("Error:", error);
            alert("An error occurred while saving the file.");
        });
}

// Add event listener to the button
document.addEventListener("DOMContentLoaded", function () {
    const storeChangesButton = document.getElementById("storeChangesButton");

    if (storeChangesButton) {
        // Pass the schedule ID dynamically, e.g., via a data-attribute
        const scheduleId = storeChangesButton.dataset.scheduleId;

        storeChangesButton.addEventListener("click", function () {
            saveScheduleChanges(scheduleId);
        });
    } else {
        console.error("storeChangesButton not found in the DOM.");
    }
});

document.getElementById("saveChangesButton").addEventListener("click", function () {
    const scriptTag = document.querySelector('script[data-schedule-id]');
    const scheduleId = scriptTag.getAttribute("data-schedule-id");
    saveScheduleChanges(scheduleId);
    const modifiedData = scheduleTable.getData(); // Get the current table data

    if (modifiedData.length === 0) {
        alert("Não há um ficheiro para guardar!");
        return;
    }

    const fileName = prompt("Enter a name for the file (without extension):", "schedule_data");

    if (!fileName) {
        alert("Nome do ficheiro é necessário!");
        return;
    }

    const csvContent = Papa.unparse(modifiedData);

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });

    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = `${fileName}.csv`;

    link.click();
    URL.revokeObjectURL(url);
});
