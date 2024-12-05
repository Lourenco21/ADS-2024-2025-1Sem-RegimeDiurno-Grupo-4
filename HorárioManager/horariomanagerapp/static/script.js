// Initialize Tabulator
var scheduleTable = new Tabulator("#schedule-table", {
    layout: "fitDataFill",
    height: 600,
    pagination: "local",
    paginationSize: 20,
    paginationSizeSelector: [5, 10, 20, 30, 50, 100],
    movableColumns: true,
    paginationCounter: "rows",
    placeholder: "Awaiting Data, Please Load File",
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
    placeholder: "Awaiting Data, Please Load File",
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
document.getElementById("scheduleFileInput").addEventListener("change", function (event) {
    const file = event.target.files[0];

    if (file) {
        document.getElementById("scheduleFileName").textContent = `Schedule file loaded: ${file.name}`;

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: function (results) {
                if (results.data.length === 0) {
                    alert("The CSV file is empty or has invalid content.");
                    return;
                }

                // Save the original data to the global variable
                originalScheduleData = results.data;

                const columns = generateColumns(results.data);
                scheduleTable.setColumns(columns);
                scheduleTable.setData(results.data);

                initialOvercrowdMetrics = calculateOvercrowdedMetrics();
                initialOverlapMetrics = calculateOverlapMetrics();
                initialNoRoomMetrics = calculateNoRoomMetrics();
                initialTimeRegulationMetrics = calculateTimeRegulationMetrics();
                initialWrongCharacteristicsMetrics = calculateMatchingCharacteristicsMetrics();
            },
            error: function (error) {
                alert("There was an error parsing the schedule CSV file.");
            },
        });
    } else {
        alert("No file selected!");
    }
    checkIfFilesLoaded();
});


document.getElementById("characteristicsFileInput").addEventListener("change", function (event) {
    const file = event.target.files[0];

    if (file) {
        document.getElementById("characteristicsFileName").textContent = `Characteristics file loaded: ${file.name}`;

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: function (results) {

                if (results.data.length === 0) {
                    alert("The CSV file is empty or has invalid content.");
                    return;
                }

                const columns = generateColumns(results.data);
                characteristicsTable.setColumns(columns);
                characteristicsTable.setData(results.data);
            },
            error: function (error) {
                alert("There was an error parsing the characteristics CSV file.");
            },
        });
    } else {
        alert("No file selected!");
    }
    checkIfFilesLoaded();
});

function checkIfFilesLoaded() {
    // Check if both files are selected
    const scheduleFileLoaded = document.getElementById("scheduleFileInput").files.length > 0;
    const characteristicsFileLoaded = document.getElementById("characteristicsFileInput").files.length > 0;

    // Show or hide the "Files Selected" heading based on whether both files are loaded
    if (scheduleFileLoaded || characteristicsFileLoaded) {
        document.getElementById("filesSelectedHeading").style.display = 'block';
    } else {
        document.getElementById("filesSelectedHeading").style.display = 'none';
    }
}


// Dynamically generate columns from data
function generateColumns(data) {
    return Object.keys(data[0] || {}).map((field, index) => {
        const nonEditableColumns = [
            "Curso",
            "Unidade de execução",
            "Turno",
            "Turma",
            "Lotação",
            "Características reais da sala"
        ];
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

    let totalClasses = 0;
    let overcrowdedClasses = 0;

    // Verificar se as colunas "Inscritos" e "Vagas" existem
    const scheduleData = scheduleTable.getData();
    if (!scheduleData.length) {
        alert("Por favor, faça upload de um CSV antes de aplicar o filtro.");
        return;
    }

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

    // Filter the data manually
    const filteredData = originalScheduleData.filter(row => {
        const inscritos = parseFloat(row["Inscritos no turno"]) || 0; // Convert to number or default to 0
        const vagas = parseFloat(row["Lotação"]) || 0; // Convert to number or default to 0
        const contexto = row["Características da sala pedida para a aula"] ? row["Características da sala pedida para a aula"].toLowerCase().trim() : ""; // Trim and lowercase
        const sala = row["Sala da aula"] ? row["Sala da aula"].trim() : ""; // Trim

        const textoExcluido = "Não necessita de sala".toLowerCase(); // Text to exclude

        totalClasses++;
        if (inscritos > vagas && contexto !== textoExcluido && sala !== "") {
            overcrowdedClasses++;
            return true; // Include in the filtered data
        }

        return false; // Exclude from the filtered data
    });

    // Update the table with filtered data
    scheduleTable.setData(filteredData);


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

        initialOvercrowdMetrics = calculateOvercrowdedMetrics();
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

                // Stop checking if no more overlaps are possible
                if (startB >= endA) break;

                const endB = rowB._end;

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

    // Update the table to display only overlapping rows
    scheduleTable.setData(overlaps);

    const overlapPercentage = totalClasses > 0 ? ((overlapClasses / totalClasses) * 100).toFixed(2) : 0;

    let metricDisplay = document.getElementById("overlapMetrics");
        if (!metricDisplay) {
            // Create the metric display element if it doesn't exist
            metricDisplay = document.createElement("div");
            metricDisplay.id = "overcrowdedMetrics";
            metricDisplay.style.marginTop = "10px"; // Add some spacing
            metricDisplay.style.fontWeight = "bold"; // Make the text bold
            document.getElementById("overcrowdedFilterButton").insertAdjacentElement("afterend", metricDisplay);
        }

        // Update the metric display content
        metricDisplay.innerHTML = `
            <p>Total de aulas: ${totalClasses}</p>
            <p>Aulas sobrepostas: ${overlapClasses}</p>
            <p>Percentagem de sobreposição: ${overlapPercentage}%</p>
        `;

        metricDisplay.style.display = "block";

        initialOvercrowdMetrics = calculateOvercrowdedMetrics();
        initialOverlapMetrics = calculateOverlapMetrics();
        initialNoRoomMetrics = calculateNoRoomMetrics();
        initialTimeRegulationMetrics = calculateTimeRegulationMetrics();
        initialWrongCharacteristicsMetrics = calculateMatchingCharacteristicsMetrics();

});

function calculateOvercrowdedMetrics() {
    let totalClasses = 0;
    let overcrowdedClasses = 0;

    // Get the table data
    const scheduleData = scheduleTable.getData();
    if (!scheduleData.length) {
        throw new Error("No data available. Please upload a CSV first.");
    }

    // Check for required columns
    const hasRequiredColumns = scheduleData.some(row =>
        "Inscritos no turno" in row &&
        "Lotação" in row &&
        "Características da sala pedida para a aula" in row &&
        "Sala da aula" in row
    );
    if (!hasRequiredColumns) {
        throw new Error("Missing required columns ('Inscritos no turno' and 'Lotação').");
    }

    // Process the data to calculate metrics
    scheduleData.forEach(row => {
        const inscritos = parseFloat(row["Inscritos no turno"]) || 0; // Convert to number or default to 0
        const vagas = parseFloat(row["Lotação"]) || 0; // Convert to number or default to 0
        const contexto = row["Características da sala pedida para a aula"] ? row["Características da sala pedida para a aula"].toLowerCase().trim() : ""; // Trim and lowercase
        const sala = row["Sala da aula"] ? row["Sala da aula"].trim() : ""; // Trim

        const textoExcluido = "Não necessita de sala".toLowerCase(); // Text to exclude

        totalClasses++;
        if (inscritos > vagas && contexto !== textoExcluido && sala !== "") {
            overcrowdedClasses++;
        }
    });

    const overcrowdedPercentage = totalClasses > 0 ? ((overcrowdedClasses / totalClasses) * 100) : 0;

    // Return the metrics as an object
    return overcrowdedPercentage
}

function calculateOverlapMetrics() {
    let totalClasses = 0;
    let overlapClasses = 0;

    // Get the data from the schedule table
    const scheduleData = scheduleTable.getData();
    if (!scheduleData.length) {
        throw new Error("No data available. Please upload a CSV first.");
    }

    // Check for required columns
    const hasRequiredColumns = scheduleData.some(row =>
        "Início" in row &&
        "Fim" in row &&
        "Sala da aula" in row &&
        "Dia" in row
    );
    if (!hasRequiredColumns) {
        throw new Error("Missing required columns ('Início', 'Fim', 'Sala da aula', 'Dia').");
    }

    // Filter out rows with empty "Sala da aula"
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

    totalClasses = scheduleData.length;
    const overlapPercentage = totalClasses > 0 ? ((overlapClasses / totalClasses) * 100) : 0;

    // Return the metrics as an object
    return overlapPercentage
}


function showMetricBalance(initialOvercrowd, updatedOvercrowd, initialOverlap, updatedOverlap, initialNoRoom, updatedNoRoom, initialFailRegulation, updatedFailRegulation, initialWrongCharacteristics, updatedWrongCharacteristics) {
    let balanceDisplay = document.getElementById("metricBalance");

    if (!balanceDisplay) {
        balanceDisplay = document.createElement("div");
        balanceDisplay.id = "metricBalance";
        balanceDisplay.style.marginTop = "10px";  // Add some spacing
        balanceDisplay.style.fontWeight = "bold"; // Make the text bold
        document.body.appendChild(balanceDisplay);  // Append it to the body or any other parent element
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
    `;

    balanceDisplay.style.display = "block";
}

function resetFiltersAndMetrics() {
    if (!originalScheduleData.length) {
        alert("Nenhum dado original encontrado para restaurar.");
        return;
    }

    // Reset the table to the original unfiltered data
    scheduleTable.setData(originalScheduleData);

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

// Recalculate metrics on cell edit
scheduleTable.on("cellEdited", function (cell) {
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


// Save modified data to a new file with a user-specified name
document.getElementById("saveChangesButton").addEventListener("click", function () {
    const modifiedData = scheduleTable.getData(); // Get the current table data

    if (modifiedData.length === 0) {
        alert("No data available to save!");
        return;
    }

    const fileName = prompt("Enter a name for the file (without extension):", "schedule_data");

    if (!fileName) {
        alert("File name is required!");
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

document.getElementById("classWithoutRoomButton").addEventListener("click", function () {

    resetFiltersAndMetrics();

    let totalClasses = 0;
    let classesWithoutRoom = 0;

    // Obter os dados da tabela de horários
    const scheduleData = scheduleTable.getData();

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
        totalClasses++; // Incrementar o total de aulas

        const textoExcluido = "Não necessita de sala".toLowerCase();
        if ((!row["Sala da aula"] || row["Sala da aula"].trim() === "") && contexto !== textoExcluido) {
            classesWithoutRoom++; // Incrementar o contador de aulas sem sala
            return true; // Incluir no filtro
        }
        return false; // Excluir do filtro
    });

    if (!filteredData.length) {
        alert("Nenhuma aula encontrada com 'Sala da aula' vazia.");
        return;
    }


    scheduleTable.setData(filteredData);

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
            <p>Percentagem de superlotação: ${classesWithoutRoomPercentage}%</p>
        `;

        metricDisplay.style.display = "block";



    initialOvercrowdMetrics = calculateOvercrowdedMetrics();
    initialOverlapMetrics = calculateOverlapMetrics();
    initialNoRoomMetrics = calculateNoRoomMetrics();
    initialTimeRegulationMetrics = calculateTimeRegulationMetrics();
    initialWrongCharacteristicsMetrics = calculateMatchingCharacteristicsMetrics();

});

document.getElementById("timeRegulationsButton").addEventListener("click", function () {
    resetFiltersAndMetrics();

    let totalClasses = 0;
    let filteredClasses = 0;

    // Obter os dados da tabela de horários
    const scheduleData = scheduleTable.getData();

    if (!scheduleData.length) {
        alert("Por favor, faça upload de um CSV antes de aplicar o filtro.");
        return;
    }

    const hasRequiredColumns = scheduleData.some(row => "Início" in row && "Fim" in row);
    if (!hasRequiredColumns) {
        alert("O ficheiro CSV não contém as colunas necessárias ('Início' e 'Fim').");
        return;
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
        const contexto = row["Características da sala pedida para a aula"] ? row["Características da sala pedida para a aula"].toLowerCase().trim() : "";
        const start = parseTime(row["Início"]);
        const end = parseTime(row["Fim"]);

        totalClasses++; // Incrementa o total de aulas
        const textoExcluido = "Não necessita de sala".toLowerCase();
        // Verificar se a aula não está dentro do horário permitido e tem mais de 3 horas de duração
        const isBeforeStartLimit = start < startLimit; // Aula começa antes das 8:00
        const isAfterEndLimit = start > endLimit; // Aula começa depois das 21:00
        const hasInvalidDuration = (end - start) > maxDuration; // Duração maior que 3 horas

        if ((isBeforeStartLimit || isAfterEndLimit || hasInvalidDuration) && contexto !== textoExcluido) {
            filteredClasses++; // Incrementa o contador de aulas filtradas
            return true; // Incluir no filtro se não cumpre as restrições
        }
        return false; // Excluir do filtro se cumpre as restrições
    });

    if (!filteredData.length) {
        alert("Nenhuma aula encontrada que não cumpra as restrições.");
        return;
    }

    // Atualizar a tabela com os dados filtrados
    scheduleTable.setData(filteredData);

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
    initialTimeRegulationMetrics = calculateOverlapMetrics();
    initialWrongCharacteristicsMetrics = calculateMatchingCharacteristicsMetrics();
});


document.getElementById("matchingCharacteristicsButton").addEventListener("click", function () {
    resetFiltersAndMetrics(); // Reset any previous filters or metrics (if needed)

    // Get the schedule data

    const scheduleData = scheduleTable.getData();
    let totalClasses = scheduleData.length;

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
            return false;
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

        // If no match is found, include the row
        return !matches;
    });

    if (!filteredData.length) {
        alert("Nenhuma sala com características divergentes encontrada.");
        return;
    }

    // Update the table with the filtered data (rows with non-matching features)
    scheduleTable.setData(filteredData);

    const wrongCharacteristicsPercentage = totalClasses > 0 ? ((filteredData.length / totalClasses) * 100).toFixed(2) : 0;

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

        // Update the metric display content
        metricDisplay.innerHTML = `
            <p>Total de aulas: ${totalClasses}</p>
            <p>Aulas que não cumprem regulamentos: ${filteredData.length}</p>
            <p>Percentagem de superlotação: ${wrongCharacteristicsPercentage}%</p>
        `;

        metricDisplay.style.display = "block";

        initialOvercrowdMetrics = calculateOvercrowdedMetrics();
        initialOverlapMetrics = calculateOverlapMetrics();
        initialNoRoomMetrics = calculateNoRoomMetrics();
        initialTimeRegulationMetrics = calculateTimeRegulationMetrics();
        initialWrongCharacteristicsMetrics = calculateMatchingCharacteristicsMetrics();

});

function calculateMatchingCharacteristicsMetrics(){

    let totalClasses = 0;
    let classesWithoutMatchingCharacteristics = 0;

    // Get the schedule data
    const scheduleData = scheduleTable.getData();

    if (!scheduleData.length) {
        alert("Por favor, faça upload de um CSV antes de aplicar o filtro.");
        return;
    }

    // Function to compare features and return rows with non-matching features
    const filteredData = scheduleData.filter(row => {
        totalClasses++;
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
            classesWithoutMatchingCharacteristics++;
        }

        const actualFeatures = row["Características reais da sala"]
            ? row["Características reais da sala"].toLowerCase().trim().split(",")
            : [];

        // Check if at least one requested feature matches any actual feature
        const matches = requestedFeatures.some(requestedFeature =>
            actualFeatures.some(actualFeature => actualFeature.toLowerCase().includes(requestedFeature.trim()))
        );

        // If no match is found, include the row
        return !matches;
    });

    const wrongCharacteristicsPercentage = totalClasses > 0 ? ((classesWithoutMatchingCharacteristics / totalClasses) * 100).toFixed(2) : 0;

    return wrongCharacteristicsPercentage;
}

function calculateNoRoomMetrics(){

    let totalClasses = 0;
    let classesWithoutRoom = 0;

    // Obter os dados da tabela de horários
    const scheduleData = scheduleTable.getData();

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
        totalClasses++; // Incrementar o total de aulas

        const textoExcluido = "Não necessita de sala".toLowerCase();
        if ((!row["Sala da aula"] || row["Sala da aula"].trim() === "") && contexto !== textoExcluido) {
            classesWithoutRoom++; // Incrementar o contador de aulas sem sala
        }
    });

    const overcrowdedPercentage = totalClasses > 0 ? ((classesWithoutRoom / totalClasses) * 100).toFixed(2) : 0;

    return overcrowdedPercentage;

}

function calculateTimeRegulationMetrics(){

    let totalClasses = 0;
    let filteredClasses = 0;

    // Obter os dados da tabela de horários
    const scheduleData = scheduleTable.getData();

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
        totalClasses++; // Incrementar o total de aulas

        const textoExcluido = "Não necessita de sala".toLowerCase();
        // Verificar se a aula não está dentro do horário permitido e tem mais de 3 horas de duração
        const isBeforeStartLimit = start < startLimit; // Aula começa antes das 8:00
        const isAfterEndLimit = start > endLimit; // Aula começa depois das 21:00
        const hasInvalidDuration = (end - start) > maxDuration; // Duração maior que 3 horas

        if ((isBeforeStartLimit || isAfterEndLimit || hasInvalidDuration) && contexto !== textoExcluido) {
            filteredClasses++; // Incrementa o contador de aulas filtradas
        }
    });

    const overcrowdedPercentage = totalClasses > 0 ? ((filteredClasses / totalClasses) * 100).toFixed(2) : 0;

    return overcrowdedPercentage;

}

function getRoomCharacteristics(roomName) {
    // Assuming characteristicsTable is the Tabulator instance for the room characteristics table
    const characteristicsData = characteristicsTable.getData(); // Get all room characteristics data
    const columns = characteristicsTable.getColumns();
    // Find the room that matches the name
    const room = characteristicsData.find(row => row["Nome sala"] === roomName); // Replace "Room Name" with the actual column name in your characteristics table

    if (room) {
        // Collect all characteristics marked with "X" (excluding "Horário sala visível portal público")
        const features = Object.keys(room)
            .filter(col => col !== "Horário sala visível portal público" && room[col] === "X")
            .join(", "); // Join features with commas
        return {
            capacity: room["Capacidade Normal"], // Replace with the correct column name for capacity
            features: features // Features will now be a comma-separated string
        };
    } else {
        return null;
    }
}

/*function getMatchingRooms(requestedFeature) {
    const matchingRooms = [];

    // If the requested feature is "Não necessita de sala", return no rooms
    if (requestedFeature && requestedFeature.trim().toLowerCase() === "não necessita de sala") {
        return matchingRooms; // Return an empty array, meaning no rooms are recommended
    }

    // If no feature is requested, return all rooms
    if (!requestedFeature || requestedFeature.trim() === "") {
        const allRooms = characteristicsTable.getData(); // Get all room data
        allRooms.forEach(room => {
            if (room["Sala"] && room["Sala"].trim() !== "") {
                matchingRooms.push(room["Sala"]); // Add the room to matching rooms
            }
        });
        return matchingRooms;
    }

    // Otherwise, find rooms that match the requested feature
    const requestedFeatureLower = requestedFeature.toLowerCase().trim();
    const allRooms = characteristicsTable.getData();

    allRooms.forEach(room => {
        const roomFeatures = Object.keys(room).filter(key => key !== "Sala" && room[key] === "X");


        if (requestedFeatureLower === "sala/anfiteatro aulas") {
            const hasNormalClassroom = requestedFeatureLower.includes("Sala de Aulas normal");
            const hasAuditorium = requestedFeatureLower.includes("Anfiteatro aulas");

        }
        if (roomFeatures.some(feature => feature.toLowerCase() === requestedFeatureLower)) {
            matchingRooms.push(room["Sala"]);
        }


    });
    return matchingRooms;
}*/

scheduleTable.on("cellEdited", function (cell) {
   // Ensure the edited column is "Sala da aula"
    if (cell.getColumn().getField() === "Sala da aula") {
        const originalValue = cell.getOldValue(); // Get the original value of the cell (before the edit)
        const roomName = cell.getValue(); // Get the new value of the cell (the room name entered by the user)
        const row = cell.getRow();
        if (!roomName) {
            // Clear the "Lotação" and "Características reais da sala" columns
            row.update({
                "Lotação": "", // Clear Lotação
                "Características reais da sala": "" // Clear Características reais da sala
            });
        }
        if (roomName) {
            // Get the room characteristics based on the selected room
            const roomCharacteristics = getRoomCharacteristics(roomName);

            if (roomCharacteristics) {
                // If the room is found, update the corresponding row with capacity and features

                row.update({
                    "Lotação": roomCharacteristics.capacity, // Update the "Lotação" column with the capacity
                    "Características reais da sala": roomCharacteristics.features // Update the "Características reais da sala" column with the features
                });
            } else {
                // If the room is not found, revert the "Sala da aula" column to its original value
                alert("Room not found in the characteristics table. Changes will not be saved.");
                cell.setValue(originalValue); // Revert the value to the original value before the edit
            }
        }
    }
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
}

document.getElementById("updateScheduleCharacteristicsButton").addEventListener("click", function () {
    updateScheduleWithRoomCharacteristics();
});
