const toggleButton = document.getElementById('toggleButton');
const characteristicsTableHide = document.getElementById('characteristics-table');
const characteristicsH2Hide = document.getElementById('characteristics-h2');

toggleButton.addEventListener('click', () => {
    if (characteristicsTable.getData().length === 0) {
        alert("Nenhum ficheiro de características selecionado.")
    } else {
        if (characteristicsTableHide.style.display === 'none' || characteristicsTableHide.style.display === '') {
            characteristicsTableHide.style.display = 'block';
            toggleButton.textContent = 'Esconder tabela de características';
            characteristicsH2Hide.style.display = 'block';
        } else {
            characteristicsTableHide.style.display = 'none';
            toggleButton.textContent = 'Mostrar tabela de características';
            characteristicsH2Hide.style.display = 'none';
        }
    }

});

function getMatchingRooms(rowData) {
    if (characteristicsTable.getData().length === 0)
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
            return [];
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
        const classDate = rowData["Dia"];
        const classStart = rowData["Início"];
        const classEnd = rowData["Fim"];
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
        const matchingRooms = roomData.filter(room => {
            const actualFeatures = Object.keys(room)
                .filter(col => col !== "Horário sala visível portal público" && room[col] === "X")
                .map(col => col.replace("Características reais da sala", "").trim().toLowerCase());

            const roomCapacity = parseInt(room["Capacidade Normal"], 10) || 0;
            const roomName = room["Nome sala"];
            const hasMatchingFeature = requestedFeatures.some(requestedFeature =>
                actualFeatures.some(actualFeature =>
                    actualFeature.includes(requestedFeature.trim().toLowerCase())
                )
            );
            const meetsCapacity = roomCapacity >= requiredCapacity;
            const roomKey = `${roomName.trim()}_${classDate.trim()}`;
            const scheduledTimes = groupedSchedule[roomKey] || [];
            const isRoomAvailable = !scheduledTimes.some(({start, end}) => {
                return (
                    (classStart >= start && classStart < end) ||
                    (classEnd > start && classEnd <= end) ||
                    (classStart <= start && classEnd >= end)
                );
            });
            return hasMatchingFeature && meetsCapacity && isRoomAvailable;
        });

        return matchingRooms.map(room => room["Nome sala"]);
    }
}

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
    cellEdited: function (cell) {
        const updatedOvercrowdedMetrics = calculateOvercrowdedMetrics();
        const updatedOverlapMetrics = calculateOverlapMetrics();
        const updatedNoRoomMetrics = calculateNoRoomMetrics();
        const updatedTimeRegulationMetrics = calculateTimeRegulationMetrics();
        const updatedWrongCharacteristicsMetrics = calculateMatchingCharacteristicsMetrics();
        if (initialOvercrowdMetrics !== undefined && initialOverlapMetrics !== undefined && initialNoRoomMetrics !== undefined && initialTimeRegulationMetrics !== undefined && initialWrongCharacteristicsMetrics !== undefined) {
            showMetricBalance(initialOvercrowdMetrics, updatedOvercrowdedMetrics, initialOverlapMetrics, updatedOverlapMetrics, initialNoRoomMetrics, updatedNoRoomMetrics, initialTimeRegulationMetrics, updatedTimeRegulationMetrics, initialWrongCharacteristicsMetrics, updatedWrongCharacteristicsMetrics);
        } else {
            console.error("Initial metrics not set.");
        }
    }
});
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
let originalScheduleData = [];

function addNewRow() {
    const curso = document.getElementById("curso").value;
    const unidade = document.getElementById("unidade").value;
    const turno = document.getElementById("turno").value;
    const turma = document.getElementById("turma").value;
    const inscritos = document.getElementById("inscritos").value;
    const diaHelper = document.getElementById("dia").value.split("-");
    const dia = diaHelper[2] + "/" + diaHelper[1] + "/" + diaHelper[0];
    const inicio = document.getElementById("inicio").value + ":00";
    const fim = document.getElementById("fim").value + ":00";
    const caracteristicas = document.getElementById("caracteristicas").value;
    const sala = document.getElementById("sala").value;
    const parsedDate = new Date(diaHelper[0], diaHelper[1] - 1, diaHelper[2]);
    const dayOfWeek = parsedDate.getDay();
    const dayOfWeekMapping = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];
    const dayOfWeekName = dayOfWeekMapping[dayOfWeek];

    if (!curso || !unidade || !turno || !turma || !inscritos || !dia || !inicio || !fim || !caracteristicas || !sala) {
        alert("Por favor, preencha todos os campos.");
        return;
    }

    const roomCharacteristics = getRoomCharacteristics(sala);

    const capacidade = roomCharacteristics.capacity;
    const caracteristicasReais = roomCharacteristics.features;

    if (window.scheduleTable) {
        const rowData = {
            "Curso": curso,
            "Unidade de execução": unidade,
            "Turno": turno,
            "Turma": turma,
            "Inscritos no turno": inscritos,
            "Dia da Semana": dayOfWeekName,
            "Início": inicio,
            "Fim": fim,
            "Dia": dia,
            "Características da sala pedida para a aula": caracteristicas,
            "Sala da aula": sala,
            "Lotação": capacidade,
            "Características reais da sala": caracteristicasReais
        };

        window.scheduleTable.addRow(rowData, true, "top").then(function (row) {
            isInscritosChanged = false;
            isDiaChanged = false;
            isInicioChanged = false;
            isFimChanged = false;
            isCaracteristicasChanged = false;
            document.getElementById("curso").value = '';
            document.getElementById("unidade").value = '';
            document.getElementById("turno").value = '';
            document.getElementById("turma").value = '';
            document.getElementById("inscritos").value = '';
            document.getElementById("dia").value = '';
            document.getElementById("inicio").value = '';
            document.getElementById("fim").value = '';

            document.getElementById("caracteristicas").selectedIndex = 0;
            document.getElementById("sala").selectedIndex = 0;
            showMetricBalance();
            resetFlags();
            clearSalaDropdown();
        }).catch(function (error) {
            console.error("Error adding row:", error);
        });
    } else {
        console.error("scheduleTable is not initialized.");
    }
}

document.addEventListener("DOMContentLoaded", function () {
    const scriptTag = document.querySelector('script[file-url][data-schedule-id]');
    const fileUrl = scriptTag.getAttribute('file-url');
    const scheduleId = scriptTag.getAttribute('data-schedule-id');

    fetch(fileUrl)
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

                    originalScheduleData = results.data;

                    const columns = generateColumns(results.data);
                    scheduleTable.setColumns(columns);
                    scheduleTable.setData(results.data);

                    initialOvercrowdMetrics = calculateOvercrowdedMetrics();
                    initialOverlapMetrics = calculateOverlapMetrics();
                    initialNoRoomMetrics = calculateNoRoomMetrics();
                    initialTimeRegulationMetrics = calculateTimeRegulationMetrics();
                    initialWrongCharacteristicsMetrics = calculateMatchingCharacteristicsMetrics();

                    const metrics = {
                        overcrowded: initialOvercrowdMetrics,
                        overlap: initialOverlapMetrics,
                        no_room: initialNoRoomMetrics,
                        time_regulation: initialTimeRegulationMetrics,
                        wrong_characteristics: initialWrongCharacteristicsMetrics
                    };

                    updateMetricsOnServer(scheduleId, metrics);

                },
                error: function (error) {
                    alert("Houve um erro a ler o ficheiro.");
                }
            });
        })
        .catch(error => console.error("Erro a carregar ficheiro: ", error));
});

function updateMetricsOnServer(scheduleId, metrics) {
    const updateUrl = `/schedule/${scheduleId}/update-metrics/`;
    fetch(`/schedule/${scheduleId}/update-metrics/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCsrfToken()
        },
        body: JSON.stringify(metrics)
    })
        .then(response => {
            if (response.ok) {
            } else {
                console.error("Failed to update metrics on the server.");
            }
        })
        .catch(error => console.error("Error sending metrics to the server: ", error));
}

function getCsrfToken() {
    const csrfMatch = document.cookie.match(/csrftoken=([^;]+)/);
    return csrfMatch ? csrfMatch[1] : null;
}


document.addEventListener("DOMContentLoaded", function () {
    const scriptTag = document.querySelector('script[characteristics-url]');
    const fileUrl = scriptTag.getAttribute('characteristics-url');
    fetch(fileUrl)
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

                    columns.forEach(column => {
                        column.editable = false;
                    });
                    characteristicsTable.setColumns(columns);
                    characteristicsTable.setData(results.data);
                },
                error: function (error) {
                    alert("Houve um erro a ler o ficheiro.");
                },
            });
            populateCharacteristicsDropdown();
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

function populateCharacteristicsDropdown() {
    const dropdown = document.getElementById("caracteristicas");
    const characteristics = getCharacteristics();

    dropdown.innerHTML = '<option value="" disabled selected>Características pedidas</option>';
    characteristics.forEach(item => {
        const option = document.createElement("option");
        option.value = item;
        option.textContent = item;
        dropdown.appendChild(option);
    });
}

function clearSalaDropdown() {
    const dropdown = document.getElementById("sala");

    // Clear all existing options
    dropdown.innerHTML = "";

    // Add only one specific option
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "Sala"; // The desired text
    option.disabled = true;
    option.selected = true;

    dropdown.appendChild(option);
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
                    const rowData = cell.getRow().getData();
                    const matchingRooms = getMatchingRooms(rowData);
                    const roomOptions = matchingRooms.length > 0 ? matchingRooms : ["Não há salas disponiveis"];
                    roomOptions.unshift("Sem sala");
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
                editor: characteristicsTable.getData().length === 0 ? false : "list",
                editorParams: function () {
                    const characteristics = getCharacteristics();
                    characteristics.unshift("Não necessita de Sala");
                    return {
                        values: characteristics.length > 0
                            ? ["Nenhuma característica", ...characteristics]
                            : ["Sem características disponíveis"]
                    };
                }
            };
        }
        return {
            title: field.charAt(0).toUpperCase() + field.slice(1),
            field: field,
            headerMenu: headerMenu,
            headerFilter: "input",
            headerFilterPlaceholder: "Search...",
            headerWordWrap: true,
            editor: !nonEditableColumns.includes(field)
        };
    });
}

characteristicsTable.on("dataProcessed", function () {
    onCharacteristicsTableLoaded();
});

function onCharacteristicsTableLoaded() {
    const scheduleColumns = scheduleTable.getColumns();
    scheduleColumns.forEach(column => {
        if (column.getField() === "Características da sala pedida para a aula") {
            column.updateDefinition({
                editor: characteristicsTable.getData().length === 0 ? false : "list",
                editorParams: function () {
                    const characteristics = getCharacteristics();
                    characteristics.unshift("Não necessita de Sala");
                    return {
                        values: characteristics.length > 0
                            ? ["Nenhuma característica", ...characteristics]
                            : ["Sem características disponíveis"]
                    };
                }
            });
        }
    });

    scheduleTable.redraw();
}

var headerMenu = function () {
    var menu = [];
    var columns = this.getColumns();

    for (let column of columns) {
        let checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.checked = column.isVisible();
        checkbox.style.marginRight = "10px";
        let label = document.createElement("span");
        let title = document.createElement("span");
        title.textContent = column.getDefinition().title;

        label.appendChild(checkbox);
        label.appendChild(title);
        menu.push({
            label: label,
            action: function (e) {
                e.stopPropagation();
                column.toggle();
                checkbox.checked = column.isVisible();
            },
        });
    }


    return menu;
};

scheduleTable.on("cellEditing", function (cell) {
    row = cell.getRow();
    const caracteristicas = row.getData()["Características da sala pedida para a aula"];
    const sala = row.getData()["Sala da aula"];
    if(cell.getColumn().getField() === "Dia" && cell.getValue() === ""){
        if(caracteristicas === ""){
            alert("Selecione Características para a sala");
            return;
        }
        if(sala === ""){
            alert("Selecione uma Sala");
            return;
        }
        const recommendedDates = recommendAlternativeDates(row.getData());
                if (recommendedDates.length > 0) {
                    displayRecommendationsPopup(recommendedDates, row);
                } else {
                    alert("Não há alternativas disponíveis.");
                }
                return;
    }
});

document.getElementById("overcrowdedFilterButton").addEventListener("click", function () {

    resetFiltersAndMetrics();

    const scheduleData = scheduleTable.getData();

    let totalClasses = scheduleData.length;
    let overcrowdedClasses = 0;

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
    scheduleTable.setFilter(row => {
        const inscritos = parseFloat(row["Inscritos no turno"]) || 0;
        const vagas = parseFloat(row["Lotação"]) || 0;
        const contexto = row["Características da sala pedida para a aula"] ? row["Características da sala pedida para a aula"].toLowerCase().trim() : "";
        const sala = row["Sala da aula"] ? row["Sala da aula"].trim() : "";
        const textoExcluido = "Não necessita de sala".toLowerCase();

        if (inscritos > vagas && contexto !== textoExcluido && sala !== "") {
            overcrowdedClasses++;
            return true;
        }
        return false;
    });


    const overcrowdedPercentage = totalClasses > 0 ? ((overcrowdedClasses / totalClasses) * 100).toFixed(2) : 0;

    let metricDisplay = document.getElementById("overcrowdedMetrics");
    if (!metricDisplay) {
        metricDisplay = document.createElement("div");
        metricDisplay.id = "overcrowdedMetrics";
        metricDisplay.style.marginTop = "10px";
        metricDisplay.style.fontWeight = "bold";
        metricDisplay.style.display = "block";
        document.getElementById("overcrowdedFilterButton").insertAdjacentElement("afterend", metricDisplay);
    }
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
    const scheduleData = scheduleTable.getData();

    let totalClasses = scheduleData.length;
    let overlapClasses = 0;

    if (!scheduleData.length) {
        alert("Por favor, faça upload de um CSV antes de aplicar o filtro.");
        return;
    }
    const hasRequiredColumns = scheduleData.some(row =>
        "Início" in row &&
        "Fim" in row &&
        "Sala da aula" in row &&
        "Dia" in row &&
        "Turma" in row
    );

    if (!hasRequiredColumns) {
        alert("O ficheiro CSV não contém as colunas necessárias ('Início', 'Fim', 'Sala da aula', 'Dia', 'Turma').");
        return;
    }
    const validData = scheduleData.filter(row => row["Sala da aula"]?.trim() && row["Turma"]?.trim());

    if (!validData.length) {
        alert("Os dados não possuem 'Sala da aula' ou 'Turma' válidos. Nenhuma sobreposição será calculada.");
        return;
    }

    const parseTime = (timeStr) => {
        const [hours, minutes] = timeStr.split(":").map(Number);
        return hours * 60 + minutes;
    };
    validData.forEach(row => {
        row._start = parseTime(row["Início"]);
        row._end = parseTime(row["Fim"]);
        row._key_room = `${row["Sala da aula"].trim()}_${row["Dia"].trim()}`;
        row._key_turma = `${row["Turma"].trim()}_${row["Dia"].trim()}`;
    });

    const groupBy = (data, keyFn) => {
        return data.reduce((acc, row) => {
            const key = keyFn(row);
            if (!acc[key]) acc[key] = [];
            acc[key].push(row);
            return acc;
        }, {});
    };
    const groupedByRoom = groupBy(validData, row => row._key_room);
    const groupedByTurma = groupBy(validData, row => row._key_turma);

    const overlaps = new Set();

    const checkOverlaps = (group) => {
        Object.values(group).forEach(groupedRows => {
            groupedRows.sort((a, b) => a._start - b._start);

            for (let i = 0; i < groupedRows.length; i++) {
                const rowA = groupedRows[i];
                const startA = rowA._start;
                const endA = rowA._end;

                for (let j = i + 1; j < groupedRows.length; j++) {
                    const rowB = groupedRows[j];
                    const startB = rowB._start;
                    const endB = rowB._end;

                    if (startB >= endA) break;
                    if ((startA < endB && startB < endA)) {
                        overlaps.add(JSON.stringify(rowA));
                        overlaps.add(JSON.stringify(rowB));
                    }
                }
            }
        });
    };

    checkOverlaps(groupedByRoom);
    checkOverlaps(groupedByTurma);
    const overlapRows = Array.from(overlaps).map(rowStr => JSON.parse(rowStr));
    overlapClasses = overlapRows.length;
    scheduleTable.setFilter((row) => {
        return overlapRows.some(overlapRow =>
            row["Início"] === overlapRow["Início"] &&
            row["Fim"] === overlapRow["Fim"] &&
            row["Sala da aula"] === overlapRow["Sala da aula"] &&
            row["Dia"] === overlapRow["Dia"] &&
            row["Turma"] === overlapRow["Turma"]
        );
    });
    const overlapPercentage = totalClasses > 0 ? ((overlapClasses / totalClasses) * 100).toFixed(2) : 0;

    let metricDisplay = document.getElementById("overlapMetrics");
    if (!metricDisplay) {
        metricDisplay = document.createElement("div");
        metricDisplay.id = "overlapMetrics";
        metricDisplay.style.marginTop = "10px";
        metricDisplay.style.fontWeight = "bold";
        document.getElementById("overlapFilterButton").insertAdjacentElement("afterend", metricDisplay);
    }

    metricDisplay.innerHTML = `
            <p>Total de aulas: ${totalClasses}</p>
            <p>Aulas sobrepostas: ${overlapClasses}</p>
            <p>Percentagem de sobreposição: ${overlapPercentage}%</p>
        `;

    metricDisplay.style.display = "block";
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
        alert("Por favor, faça upload de um CSV antes de aplicar o filtro.");
        return;
    }
    const hasRequiredColumns = scheduleData.some(row =>
        "Início" in row &&
        "Fim" in row &&
        "Sala da aula" in row &&
        "Dia" in row &&
        "Turma" in row
    );

    if (!hasRequiredColumns) {
        alert("O ficheiro CSV não contém as colunas necessárias ('Início', 'Fim', 'Sala da aula', 'Dia', 'Turma').");
        return;
    }
    const validData = scheduleData.filter(row => row["Sala da aula"]?.trim() && row["Turma"]?.trim());

    if (!validData.length) {
        alert("Os dados não possuem 'Sala da aula' ou 'Turma' válidos. Nenhuma sobreposição será calculada.");
        return;
    }

    const parseTime = (timeStr) => {
        const [hours, minutes] = timeStr.split(":").map(Number);
        return hours * 60 + minutes;
    };
    validData.forEach(row => {
        row._start = parseTime(row["Início"]);
        row._end = parseTime(row["Fim"]);
        row._key_room = `${row["Sala da aula"].trim()}_${row["Dia"].trim()}`;
        row._key_turma = `${row["Turma"].trim()}_${row["Dia"].trim()}`;
    });

    const groupBy = (data, keyFn) => {
        return data.reduce((acc, row) => {
            const key = keyFn(row);
            if (!acc[key]) acc[key] = [];
            acc[key].push(row);
            return acc;
        }, {});
    };
    const groupedByRoom = groupBy(validData, row => row._key_room);
    const groupedByTurma = groupBy(validData, row => row._key_turma);

    const overlaps = new Set();

    const checkOverlaps = (group) => {
        Object.values(group).forEach(groupedRows => {
            groupedRows.sort((a, b) => a._start - b._start);

            for (let i = 0; i < groupedRows.length; i++) {
                const rowA = groupedRows[i];
                const startA = rowA._start;
                const endA = rowA._end;

                for (let j = i + 1; j < groupedRows.length; j++) {
                    const rowB = groupedRows[j];
                    const startB = rowB._start;
                    const endB = rowB._end;

                    if (startB >= endA) break;
                    if ((startA < endB && startB < endA)) {
                        overlaps.add(JSON.stringify(rowA));
                        overlaps.add(JSON.stringify(rowB));
                    }
                }
            }
        });
    };

    checkOverlaps(groupedByRoom);
    checkOverlaps(groupedByTurma);
    const overlapRows = Array.from(overlaps).map(rowStr => JSON.parse(rowStr));
    overlapClasses = overlapRows.length;

    const overlapPercentage = totalClasses > 0 ? ((overlapClasses / totalClasses) * 100) : 0;
    return overlapPercentage
}

function showMetricsPopup() {
    const popup = document.getElementById('metricBalancePopup');
    if (!popup) return;
    popup.classList.add('show');

}

function closePopup() {
    const popup = document.getElementById('metricBalancePopup');
    if (popup) {
        popup.classList.remove('show');
    }
}

const popup = document.getElementById("recommendationsPopup");
const recommendationOptions = document.getElementById("recommended-dates-list");
const cancelButton = document.getElementById("popup-close-btn");

function displayRecommendationsPopup(recommendedDates, scheduleRow) {

    recommendationOptions.innerHTML = "";
    recommendedDates.forEach(date => {
        const listItem = document.createElement("li");
        listItem.textContent = `${date.date} - Início: ${date.startTime} - Fim: ${date.endTime}`;

        listItem.onclick = function () {

            const [day, month, year] = date.date.split("/");

            scheduleRow.update({
                "Dia": `${day}/${month}/${year}`,
                "Início": date.startTime,
                "Fim": date.endTime,
                "Dia da Semana": getDayOfWeekName(new Date(year, month - 1, day))
            });
            hideRecommendationsPopup();
        };
        recommendationOptions.appendChild(listItem);
    });
    popup.style.display = "flex";
}

function getDayOfWeekName(date) {
    const dayOfWeekMapping = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];
    return dayOfWeekMapping[date.getDay()];
}

function hideRecommendationsPopup() {
    popup.style.display = "none";
}

cancelButton.onclick = function () {
    hideRecommendationsPopup();
};


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

    const overcrowdedPercentageDiff = (updatedOvercrowd - initialOvercrowd);
    const overlapPercentageDiff = (updatedOverlap - initialOverlap);
    const noRoomPercentageDiff = (updatedNoRoom - initialNoRoom);
    const failRegulationPercentageDiff = (updatedFailRegulation - initialFailRegulation);
    const wrongCharacteristicsPercentageDiff = (updatedWrongCharacteristics - initialWrongCharacteristics);

    if (overcrowdedPercentageDiff < 0)
        overcrowdedResult = "Improved Quality"
    else if (overcrowdedPercentageDiff > 0)
        overcrowdedResult = "Decreased Quality"

    if (overlapPercentageDiff < 0)
        overlapResult = "Improved Quality"
    else if (overlapPercentageDiff > 0)
        overlapResult = "Decreased Quality"

    if (noRoomPercentageDiff < 0)
        noRoomResult = "Improved Quality"
    else if (noRoomPercentageDiff > 0)
        noRoomResult = "Decreased Quality"

    if (failRegulationPercentageDiff < 0)
        failRegulationResult = "Improved Quality"
    else if (failRegulationPercentageDiff > 0)
        failRegulationResult = "Decreased Quality"

    if (wrongCharacteristicsPercentageDiff < 0)
        wrongCharacteristicsResult = "Improved Quality"
    else if (wrongCharacteristicsPercentageDiff > 0)
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

    const allMetricDisplays = document.querySelectorAll("[id$='Metrics']");
    allMetricDisplays.forEach(metric => {
        metric.style.display = "none";
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

scheduleTable.on("cellDblClick", function (e, cell) {
    cell.edit();
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
    const textoExcluido = "Não necessita de sala".toLowerCase();

    scheduleTable.setFilter(row => {

        const contexto = row["Características da sala pedida para a aula"]
            ? row["Características da sala pedida para a aula"].toLowerCase().trim()
            : "";
        if ((!row["Sala da aula"] || row["Sala da aula"].trim() === "") && contexto !== textoExcluido) {
            classesWithoutRoom++;
            return true;
        }
        return false;
    });

    const classesWithoutRoomPercentage = totalClasses > 0 ? ((classesWithoutRoom / totalClasses) * 100).toFixed(2) : 0;

    let metricDisplay = document.getElementById("withoutRoomMetrics");
    if (!metricDisplay) {
        metricDisplay = document.createElement("div");
        metricDisplay.id = "overcrowdedMetrics";
        metricDisplay.style.marginTop = "10px";
        metricDisplay.style.fontWeight = "bold";
        metricDisplay.style.display = "block";
        document.getElementById("overcrowdedFilterButton").insertAdjacentElement("afterend", metricDisplay);
    }
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
    const parseTime = (timeStr) => {
        const [hours, minutes] = timeStr.split(":").map(Number);
        return hours * 60 + minutes;
    };
    const startLimit = parseTime("08:00:00");
    const endLimit = parseTime("21:00:00");
    const maxDuration = 180;
    scheduleTable.setFilter(row => {

        const contexto = row["Características da sala pedida para a aula"]
            ? row["Características da sala pedida para a aula"].toLowerCase().trim()
            : "";
        const start = parseTime(row["Início"]);
        const end = parseTime(row["Fim"]);

        const textoExcluido = "Não necessita de sala".toLowerCase();
        const isBeforeStartLimit = start < startLimit;
        const isAfterEndLimit = start > endLimit;
        const hasInvalidDuration = (end - start) > maxDuration;

        if ((isBeforeStartLimit || isAfterEndLimit || hasInvalidDuration) && contexto !== textoExcluido) {
            filteredClasses++;
            return true;
        }
        return false;
    });
    const regulationFailPercentage = totalClasses > 0 ? ((filteredClasses / totalClasses) * 100).toFixed(2) : 0;

    let metricDisplay = document.getElementById("timeRegulationsMetrics");
    if (!metricDisplay) {
        metricDisplay = document.createElement("div");
        metricDisplay.id = "overcrowdedMetrics";
        metricDisplay.style.marginTop = "10px";
        metricDisplay.style.fontWeight = "bold";
        metricDisplay.style.display = "block";
        document.getElementById("overcrowdedFilterButton").insertAdjacentElement("afterend", metricDisplay);
    }
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
    resetFiltersAndMetrics();
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
        if (!matches)
            filteredClasses++;

        return !matches;
    });

    const wrongCharacteristicsPercentage = totalClasses > 0 ? ((filteredClasses / totalClasses) * 100).toFixed(2) : 0;

    let metricDisplay = document.getElementById("characteristicsMetrics");
    if (!metricDisplay) {
        metricDisplay = document.createElement("div");
        metricDisplay.id = "overcrowdedMetrics";
        metricDisplay.style.marginTop = "10px";
        metricDisplay.style.fontWeight = "bold";
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

function calculateMatchingCharacteristicsMetrics() {


    const scheduleData = scheduleTable.getData();

    let totalClasses = scheduleData.length;
    let classesWithoutMatchingCharacteristics = 0;

    if (!scheduleData.length) {
        alert("Por favor, faça upload de um CSV antes de aplicar o filtro.");
        return;
    }

    const filteredData = scheduleData.filter(row => {
        let requestedFeatures = row["Características da sala pedida para a aula"]
            ? row["Características da sala pedida para a aula"].toLowerCase().trim().split(",")
            : [];
        if (!requestedFeatures.length || requestedFeatures[0] === "não necessita de sala") {
            return;
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

        if (!matches)
            classesWithoutMatchingCharacteristics++;

        return !matches;
    });

    const wrongCharacteristicsPercentage = totalClasses > 0 ? ((classesWithoutMatchingCharacteristics / totalClasses) * 100) : 0;

    return wrongCharacteristicsPercentage;
}

function calculateNoRoomMetrics() {
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

    const filteredData = scheduleData.filter(row => {
        const contexto = row["Características da sala pedida para a aula"] ? row["Características da sala pedida para a aula"].toLowerCase().trim() : "";

        const textoExcluido = "Não necessita de sala".toLowerCase();
        if ((!row["Sala da aula"] || row["Sala da aula"].trim() === "") && contexto !== textoExcluido) {
            classesWithoutRoom++;
        }
    });

    const overcrowdedPercentage = totalClasses > 0 ? ((classesWithoutRoom / totalClasses) * 100) : 0;

    return overcrowdedPercentage;

}

function calculateTimeRegulationMetrics() {

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
    const parseTime = (timeStr) => {
        const [hours, minutes] = timeStr.split(":").map(Number);
        return hours * 60 + minutes;
    };
    const startLimit = parseTime("08:00:00");
    const endLimit = parseTime("21:00:00");
    const maxDuration = 180;
    const filteredData = scheduleData.filter(row => {
        const start = parseTime(row["Início"]);
        const end = parseTime(row["Fim"]);
        const contexto = row["Características da sala pedida para a aula"] ? row["Características da sala pedida para a aula"].toLowerCase().trim() : "";

        const textoExcluido = "Não necessita de sala".toLowerCase();
        const isBeforeStartLimit = start < startLimit;
        const isAfterEndLimit = start > endLimit;
        const hasInvalidDuration = (end - start) > maxDuration;

        if ((isBeforeStartLimit || isAfterEndLimit || hasInvalidDuration) && contexto !== textoExcluido) {
            filteredClasses++;
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

let isProcessing = false;

scheduleTable.on("cellEdited", function (cell) {
    const row = cell.getRow();
    const timeRegex = /^(0[8-9]|1[0-9]|20):([03]0):00$|^21:00:00$/;

const parseTime = (timeStr) => {
    const [hours, minutes] = timeStr.split(":").map(Number);
    return hours * 60 + minutes;
};

    const formatTime = (totalMinutes) => {
        const hours = String(Math.floor(totalMinutes / 60)).padStart(2, "0");
        const minutes = String(totalMinutes % 60).padStart(2, "0");
        return `${hours}:${minutes}:00`;
    };
    const MAXGAP = 180;

    const confirmMaxGapStart = (newGap) => {
        return confirm(`O novo intervalo de ${newGap} minutos é inválido. Selecione OK para adiantar o fim da aula.`);
    };
    const confirmMaxGapEnd = (newGap) => {
        return confirm(`O novo intervalo de ${newGap} minutos é inválido. Selecione OK para atrasar o início da aula.`);
    };
    const confirmGapChange = (newGap, oldGap) => {
        return confirm(`O intervalo mudará de ${oldGap} minutos para ${newGap} minutos. Deseja manter este novo intervalo?`);
    };
    const isOverlapping = (startMinutes, endMinutes, otherStart, otherEnd) => {
        return (
            (startMinutes < otherEnd && startMinutes >= otherStart) ||
            (endMinutes > otherStart && endMinutes <= otherEnd) ||
            (startMinutes <= otherStart && endMinutes >= otherEnd)
        );
    };
    const checkRoomOverlap = (startTime, endTime, room, date) => {
        const overlapFound = scheduleTable.getRows().some((otherRow) => {
            const otherRowData = otherRow.getData();
            const otherStartTime = parseTime(otherRowData["Início"]);
            const otherEndTime = parseTime(otherRowData["Fim"]);
            const otherRoom = otherRowData["Sala da aula"];
            const otherDate = otherRowData["Dia"];
            if (otherRow === row) return false;

            return otherRoom === room && otherDate === date && isOverlapping(startTime, endTime, otherStartTime, otherEndTime);
        });

        return overlapFound;
    };
    const checkTurmaOverlap = (startTime, endTime, turma, date) => {
        const overlapFound = scheduleTable.getRows().some((otherRow) => {
            const otherRowData = otherRow.getData();
            const otherStartTime = parseTime(otherRowData["Início"]);
            const otherEndTime = parseTime(otherRowData["Fim"]);
            const otherTurma = otherRowData["Turma"];
            const otherDate = otherRowData["Dia"];

            if (otherRow === row) return false;

            return otherTurma === turma && otherDate === date && isOverlapping(startTime, endTime, otherStartTime, otherEndTime);
        });

        return overlapFound;
    };
    if (cell.getColumn().getField() === "Início") {
        if (isProcessing) return;
        isProcessing = true;

        const newStartTime = cell.getValue();
        const room = row.getData()["Sala da aula"];
        const date = row.getData()["Dia"];
        const turma = row.getData()["Turma"];
        if (!newStartTime) {
            row.update({
                "Início": "",
                "Fim": ""
            });
            isProcessing = false;
            return;
        }

        if (!timeRegex.test(newStartTime)) {
            alert("Erro: O horário deve ser no formato HH:MM:SS, onde HH está entre 08 e 21 e MM é 00 ou 30.");
            cell.setValue(cell.getOldValue());
            isProcessing = false;
            return;
        }

        const oldStartTime = cell.getOldValue();
        const endTime = row.getData()["Fim"];
        const newStartMinutes = parseTime(newStartTime);
        const currentEndMinutes = parseTime(endTime);

        if (!endTime) {
            row.update({
                "Início": newStartTime,
                "Fim": ""
            });
            return;
        }

        const originalGap = currentEndMinutes - parseTime(oldStartTime);

        if (newStartMinutes >= currentEndMinutes) {
            const endMinutes = newStartMinutes + originalGap;
            if (checkRoomOverlap(newStartMinutes, endMinutes, room, date)) {
                alert("Erro: Existe um conflito de horário na sala de aula.");
                cell.setValue(cell.getOldValue());
                isProcessing = false;
                return;
            }
            if (checkTurmaOverlap(newStartMinutes, endMinutes, turma, date)) {
                alert("Erro: Existe um conflito de horário na turma.");
                cell.setValue(cell.getOldValue());
                isProcessing = false;
                return;
            }
            row.update({
                "Início": newStartTime,
                "Fim": formatTime(newStartMinutes + originalGap)
            });
            isProcessing = false;
            return;
        }
        const newGap = currentEndMinutes - newStartMinutes;

        if (newGap !== originalGap) {
            if (confirmGapChange(newGap, originalGap)) {
                if (newGap > MAXGAP) {
                    if (confirmMaxGapStart(newGap)) {
                        const endMinutes = newStartMinutes + MAXGAP;
                        if (checkRoomOverlap(newStartMinutes, endMinutes, room, date)) {
                            alert("Erro: Existe um conflito de horário na sala de aula.");
                            cell.setValue(cell.getOldValue());
                            isProcessing = false;
                            return;
                        }
                        if (checkTurmaOverlap(newStartMinutes, endMinutes, turma, date)) {
                            alert("Erro: Existe um conflito de horário na turma.");
                            cell.setValue(cell.getOldValue());
                            isProcessing = false;
                            return;
                        }
                        row.update({
                            "Início": newStartTime,
                            "Fim": formatTime(newStartMinutes + MAXGAP),
                        });
                    } else {
                        row.update({
                            "Início": cell.getOldValue(),
                            "Fim": formatTime(currentEndMinutes),
                        });
                    }
                    isProcessing = false;
                    return;
                }
                const endMinutes = newStartMinutes + newGap;
                if (checkRoomOverlap(newStartMinutes, endMinutes, room, date)) {
                    alert("Erro: Existe um conflito de horário na sala de aula.");
                    cell.setValue(cell.getOldValue());
                    isProcessing = false;
                    return;
                }
                if (checkTurmaOverlap(newStartMinutes, endMinutes, turma, date)) {
                    alert("Erro: Existe um conflito de horário na turma.");
                    cell.setValue(cell.getOldValue());
                    isProcessing = false;
                    return;
                }
                row.update({
                    "Início": newStartTime,
                    "Fim": formatTime(currentEndMinutes),
                });
            } else {
                const endMinutes = newStartMinutes + originalGap;
                if (checkRoomOverlap(newStartMinutes, endMinutes, room, date)) {
                    alert("Erro: Existe um conflito de horário na sala de aula.");
                    cell.setValue(cell.getOldValue());
                    isProcessing = false;
                    return;
                }
                if (checkTurmaOverlap(newStartMinutes, endMinutes, turma, date)) {
                    alert("Erro: Existe um conflito de horário na turma.");
                    cell.setValue(cell.getOldValue());
                    isProcessing = false;
                    return;
                }
                const adjustedEndMinutes = newStartMinutes + originalGap;
                row.update({
                    "Início": newStartTime,
                    "Fim": formatTime(adjustedEndMinutes),
                });
            }
        } else {
            const endMinutes = newStartMinutes + originalGap;
            if (checkRoomOverlap(newStartMinutes, endMinutes, room, date)) {
                alert("Erro: Existe um conflito de horário na sala de aula.");
                cell.setValue(cell.getOldValue());
                isProcessing = false;
                return;
            }
            if (checkTurmaOverlap(newStartMinutes, endMinutes, turma, date)) {
                alert("Erro: Existe um conflito de horário na turma.");
                cell.setValue(cell.getOldValue());
                isProcessing = false;
                return;
            }
            row.update({
                "Início": newStartTime,
                "Fim": formatTime(currentEndMinutes),
            });
        }
        isProcessing = false;
    }
    if (cell.getColumn().getField() === "Fim") {
        if (isProcessing) return;
        isProcessing = true;
        const newEndTime = cell.getValue();
        const room = row.getData()["Sala da aula"];
        const date = row.getData()["Dia"];
        const turma = row.getData()["Turma"];

        if (!newEndTime) {
            row.update({
                "Início": "",
                "Fim": ""
            });
            isProcessing = false;
            return;
        }

        if (!timeRegex.test(newEndTime)) {
            alert("Erro: O horário deve ser no formato HH:MM:SS, onde HH está entre 08 e 21 e MM é 00 ou 30.");
            cell.setValue(cell.getOldValue());
            isProcessing = false;
            return;
        }

        const startTime = row.getData()["Início"];
        const oldEndTime = cell.getOldValue();
        const newEndMinutes = parseTime(newEndTime);
        const currentStartMinutes = parseTime(startTime);

        if (!startTime) {
            row.update({
                "Início": "",
                "Fim": newEndTime
            });
            isProcessing = false;
            return;
        }

        const originalGap = parseTime(oldEndTime) - currentStartMinutes

        if (newEndMinutes <= currentStartMinutes) {
            const startMinutes = newEndMinutes - originalGap;
            if (checkRoomOverlap(startMinutes, newEndMinutes, room, date)) {
                alert("Erro: Existe um conflito de horário na sala de aula.");
                cell.setValue(cell.getOldValue());
                isProcessing = false;
                return;
            }
            if (checkTurmaOverlap(startMinutes, newEndMinutes, turma, date)) {
                alert("Erro: Existe um conflito de horário na turma.");
                cell.setValue(cell.getOldValue());
                isProcessing = false;
                return;
            }
            row.update({
                "Início": formatTime(newEndMinutes - originalGap),
                "Fim": newEndTime,
            });
            isProcessing = false;
            return;
        }

        const newGap = newEndMinutes - currentStartMinutes;

        if (newGap !== originalGap) {
            if (confirmGapChange(newGap, originalGap)) {

                if (newGap > MAXGAP) {
                    if (confirmMaxGapEnd(newGap)) {
                        const startMinutes = newEndMinutes - MAXGAP;
                        if (checkRoomOverlap(startMinutes, newEndMinutes, room, date)) {
                            alert("Erro: Existe um conflito de horário na sala de aula.");
                            cell.setValue(cell.getOldValue());
                            isProcessing = false;
                            return;
                        }
                        if (checkTurmaOverlap(startMinutes, newEndMinutes, turma, date)) {
                            alert("Erro: Existe um conflito de horário na turma.");
                            cell.setValue(cell.getOldValue());
                            isProcessing = false;
                            return;
                        }
                        row.update({
                            "Início": formatTime(newEndMinutes - MAXGAP),
                            "Fim": newEndTime,
                        });
                    } else {
                        row.update({
                            "Início": formatTime(currentStartMinutes),
                            "Fim": cell.getOldValue(),
                        });
                    }
                    isProcessing = false;
                    return;
                }
                const startMinutes = newEndMinutes - originalGap;
                if (checkRoomOverlap(startMinutes, newEndMinutes, room, date)) {
                    alert("Erro: Existe um conflito de horário na sala de aula.");
                    cell.setValue(cell.getOldValue());
                    isProcessing = false;
                    return;
                }
                if (checkTurmaOverlap(startMinutes, newEndMinutes, turma, date)) {
                    alert("Erro: Existe um conflito de horário na turma.");
                    cell.setValue(cell.getOldValue());
                    isProcessing = false;
                    return;
                }
                row.update({
                    "Início": startTime,
                    "Fim": newEndTime,
                });
            } else {
                const adjustedStartMinutes = newEndMinutes - originalGap;
                if (adjustedStartMinutes < 480) {
                    alert("Erro: O horário de início ultrapassa o limite das 08:00. Ajuste o intervalo.");
                    cell.setValue(cell.getOldValue());
                    isProcessing = false;
                    return;
                }
                const startMinutes = newEndMinutes - newGap;
                if (checkRoomOverlap(startMinutes, newEndMinutes, room, date)) {
                    alert("Erro: Existe um conflito de horário na sala de aula.");
                    cell.setValue(cell.getOldValue());
                    isProcessing = false;
                    return;
                }
                if (checkTurmaOverlap(startMinutes, newEndMinutes, turma, date)) {
                    alert("Erro: Existe um conflito de horário na turma.");
                    cell.setValue(cell.getOldValue());
                    isProcessing = false;
                    return;
                }
                row.update({
                    "Início": formatTime(adjustedStartMinutes),
                    "Fim": newEndTime,
                });
            }
        } else {
            const startMinutes = newEndMinutes - originalGap;
            if (checkRoomOverlap(startMinutes, newEndMinutes, room, date)) {
                alert("Erro: Existe um conflito de horário na sala de aula.");
                cell.setValue(cell.getOldValue());
                isProcessing = false;
                return;
            }
            if (checkTurmaOverlap(startMinutes, newEndMinutes, turma, date)) {
                alert("Erro: Existe um conflito de horário na turma.");
                cell.setValue(cell.getOldValue());
                isProcessing = false;
                return;
            }
            row.update({
                "Início": startTime,
                "Fim": newEndTime,
            });
        }
        isProcessing = false;
    }
    if (cell.getValue() === "Nenhuma característica") {
        cell.setValue("");
        return;
    }

    if (cell.getColumn().getField() === "Dia") {
        const newDate = cell.getValue();
        const originalDate = cell.getOldValue();
        const room = row.getData()["Sala da aula"];
        const startTime = row.getData()["Início"];
        const endTime = row.getData()["Fim"];
        const dateRegex = /^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[0-2])\/\d{4}$/;
        if (newDate === "") {
            return;
        }

        if (!dateRegex.test(newDate)) {
            alert("Erro: O formato da data deve ser DD/MM/YYYY.");
            cell.setValue(originalDate);
            return;
        }

        const [day, month, year] = newDate.split("/").map(Number);
        const parsedDate = new Date(year, month - 1, day);
        if (parsedDate.getDate() !== day || parsedDate.getMonth() + 1 !== month || parsedDate.getFullYear() !== year) {
            alert("Erro: A data inserida é inválida.");
            cell.setValue(originalDate);
            return;
        }
        const dayOfWeek = parsedDate.getDay();
        if (dayOfWeek === 0 || dayOfWeek === 6) {
            const userChoice = confirm(
                "Aviso: O dia selecionado é um fim de semana. Deseja continuar com esta alteração?"
            );
            if (!userChoice) {
                cell.setValue(originalDate);
                return;
            }
        }
        const parseTime = (timeStr) => {
            const [hours, minutes] = timeStr.split(":").map(Number);
            return hours * 60 + minutes;
        };

        const startMinutes = parseTime(startTime);
        const endMinutes = parseTime(endTime);

        const isRoomAvailable = !scheduleTable.getRows().some((otherRow) => {
            const otherRowData = otherRow.getData();
            const otherDate = otherRowData["Dia"];
            if (
                otherRowData["Sala da aula"] === room &&
                otherDate === newDate &&
                otherRow !== row
            ) {
                const otherStart = parseTime(otherRowData["Início"]);
                const otherEnd = parseTime(otherRowData["Fim"]);
                const isOverlapping = (
                    (startMinutes < otherEnd && startMinutes >= otherStart) ||
                    (endMinutes > otherStart && endMinutes <= otherEnd) ||
                    (startMinutes <= otherStart && endMinutes >= otherEnd)
                );
                return isOverlapping;
            }
            return false;
        });

        if (!isRoomAvailable) {
            const userWantsRecommendation = confirm("A sala não está disponível para o novo dia e horário. Deseja uma recomendação de um dia");
            if (userWantsRecommendation) {
                cell.setValue(originalDate);
                const recommendedDates = recommendAlternativeDates(row.getData());
                if (recommendedDates.length > 0) {
                    displayRecommendationsPopup(recommendedDates, row);
                } else {
                    alert("Não há alternativas disponíveis.");
                }
                return;
            } else {
                cell.setValue(originalDate);
                return;
            }
        }
        const dayOfWeekMapping = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];
        const dayOfWeekName = dayOfWeekMapping[dayOfWeek];
        row.update({"Dia da Semana": dayOfWeekName});
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
            const characteristics = getRoomCharacteristics(originalValue);
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


function recommendAlternativeDates(scheduleRow) {
    const allScheduleData = scheduleTable.getData();
    const room = scheduleRow["Sala da aula"];
    let date = scheduleRow["Dia"];
    const startTime = scheduleRow["Início"];
    const endTime = scheduleRow["Fim"];
    const turma = scheduleRow["Turma"];
    const courseType = turma.includes("PL") ? "Pós-laboral" : "Diurno";
    if(date === ""){
        date = new Date(2022, 8, 12);
    }
    let minStartTime, maxStartTime;
    if (courseType === "Diurno") {
        minStartTime = parseTime("08:00:00");
        maxStartTime = parseTime("16:00:00");
    } else {
        minStartTime = parseTime("16:30:00");
        maxStartTime = parseTime("21:00:00");
    }
    const startDate = parseDate(date);
    const maxDateRange = 40;
    const recommendedDates = [];
    const lastFridayBeforeChristmas = getLastFridayBeforeChristmas(new Date(startDate));
    for (let dayOffset = 1; dayOffset <= maxDateRange; dayOffset++) {
        const [day, month, year] = parseDate(startDate).split("/").map(Number);
        const newDate = new Date(year, month - 1, day);

        newDate.setDate(newDate.getDate() + dayOffset);

        const formattedDate = formatDate(newDate);
        const dayOfWeek = newDate.getDay();
        if (dayOfWeek === 0 || dayOfWeek === 6) continue;
        if (newDate > lastFridayBeforeChristmas) break;
        const roomSchedule = allScheduleData.filter(row => {
            return row["Sala da aula"].trim() === room.trim() && row["Dia"].trim() === formattedDate;
        });
        roomSchedule.sort((a, b) => parseTime(a["Início"]) - parseTime(b["Início"]));
        let previousEndTime = minStartTime;
        for (const classData of roomSchedule) {
            const currentStartTime = parseTime(classData["Início"]);
            if (currentStartTime - previousEndTime >= parseTime(endTime) - parseTime(startTime)) {
                const potentialStartTime = previousEndTime;
                if (potentialStartTime >= minStartTime && potentialStartTime <= maxStartTime) {
                    const potentialEndTime = potentialStartTime + (parseTime(endTime) - parseTime(startTime));
                    const hasOverlap = allScheduleData.some(row => {
                        return row["Turma"] === turma && row["Dia"].trim() === formattedDate &&
                            timesOverlap(potentialStartTime, potentialEndTime, parseTime(row["Início"]), parseTime(row["Fim"]));
                    });

                    if (!hasOverlap) {
                        recommendedDates.push({
                            date: formattedDate,
                            startTime: formatTime(potentialStartTime),
                            endTime: formatTime(potentialEndTime),
                        });
                        if (recommendedDates.length >= 3) return recommendedDates;
                    }
                }
            }
            previousEndTime = parseTime(classData["Fim"]);
        }
        const finalPotentialStartTime = previousEndTime;
        if (
            finalPotentialStartTime >= minStartTime &&
            finalPotentialStartTime <= maxStartTime
        ) {
            const finalPotentialEndTime = finalPotentialStartTime + (parseTime(endTime) - parseTime(startTime));
            const hasOverlap = allScheduleData.some(row => {
                return row["Turma"] === turma && row["Dia"].trim() === formattedDate &&
                    timesOverlap(finalPotentialStartTime, finalPotentialEndTime, parseTime(row["Início"]), parseTime(row["Fim"]));
            });

            if (!hasOverlap) {
                recommendedDates.push({
                    date: formattedDate,
                    startTime: formatTime(finalPotentialStartTime),
                    endTime: formatTime(finalPotentialEndTime),
                });
                if (recommendedDates.length >= 3) return recommendedDates;
            }
        }
    }
    return recommendedDates;
}

function parseTime(time) {
    const [hours, minutes, seconds] = time.split(":").map(Number);
    return hours * 3600 + minutes * 60 + (seconds || 0);
}

function formatTime(seconds) {
    const hours = Math.floor(seconds / 3600).toString().padStart(2, "0");
    const minutes = Math.floor((seconds % 3600) / 60).toString().padStart(2, "0");
    return `${hours}:${minutes}:00`;
}

function timesOverlap(start1, end1, start2, end2) {
    return start1 < end2 && start2 < end1;
}

function formatDate(date) {
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
}

function getLastFridayBeforeChristmas(startDate) {
    const year = startDate.getFullYear();
    const christmasEve = new Date(`${year}-12-24`);
    const dayOfWeek = christmasEve.getDay();
    const offset = dayOfWeek === 0 ? 2 : dayOfWeek === 6 ? 1 : dayOfWeek - 5;
    christmasEve.setDate(christmasEve.getDate() - offset);
    return christmasEve;
}

function parseDate(date) {
    if (typeof date === "string") {
        return date;
    } else if (date instanceof Date) {
        return formatDate(date);
    } else {
        throw new TypeError("Invalid date format");
    }
}


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
    const tableData = scheduleTable.getData();

    if (!tableData || tableData.length === 0) {
        alert("No data available to save.");
        return;
    }
    const csvContent = Papa.unparse(tableData);
    const csvBlob = new Blob([csvContent], {type: "text/csv"});
    const fileName = "updated_schedule.csv";
    const formData = new FormData();
    formData.append("file", csvBlob, fileName);
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
            initialOvercrowdMetrics = calculateOvercrowdedMetrics();
            initialOverlapMetrics = calculateOverlapMetrics();
            initialNoRoomMetrics = calculateNoRoomMetrics();
            initialTimeRegulationMetrics = calculateTimeRegulationMetrics();
            initialWrongCharacteristicsMetrics = calculateMatchingCharacteristicsMetrics();

            const metrics = {
                overcrowded: initialOvercrowdMetrics,
                overlap: initialOverlapMetrics,
                no_room: initialNoRoomMetrics,
                time_regulation: initialTimeRegulationMetrics,
                wrong_characteristics: initialWrongCharacteristicsMetrics
            };

            updateMetricsOnServer(scheduleId, metrics);
        })
        .catch((error) => {
            console.error("Error:", error);
            alert("An error occurred while saving the file.");
        });
}

document.addEventListener("DOMContentLoaded", function () {
    const storeChangesButton = document.getElementById("storeChangesButton");

    if (storeChangesButton) {
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
    const modifiedData = scheduleTable.getData();

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

    const blob = new Blob([csvContent], {type: "text/csv;charset=utf-8;"});

    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = `${fileName}.csv`;

    link.click();
    URL.revokeObjectURL(url);
});


function getMatchingRoomsForDropdown() {

    if (characteristicsTable.getData().length === 0)
        alert("Selecione um ficheiro de Características de Salas de Aula")
    else {
        const requestedFeatures = document.getElementById("caracteristicas").value
            ? document.getElementById("caracteristicas").value.toLowerCase().trim().split(",")
            : [];
        const requiredCapacity = parseInt(document.getElementById("inscritos").value, 10) || 0;

        if (!requestedFeatures.length || requestedFeatures[0] === "não necessita de sala") {
            return [];
        }

        if (requestedFeatures.includes("sala/anfiteatro aulas")) {
            requestedFeatures.push("sala de aulas normal", "anfiteatro aulas");
        }
        if (requestedFeatures.includes("lab ista")) {
            requestedFeatures.push("laboratório de arquitectura de computadores i", "laboratório de arquitectura de computadores ii",
                "laboratório de bases de engenharia", "laboratório de eletrónica", "laboratório de telecomunicações", "laboratório de informática",
                "laboratório de redes de computadores i", "laboratório de redes de computadores ii");
        }


        const Date = document.getElementById("dia").value.trim().split("-");
        const classDate = Date[2] + "/" + Date[1] + "/" + Date[0];
        const classStart = document.getElementById("inicio").value.trim() + ":00";
        const classEnd = document.getElementById("fim").value.trim() + ":00";
        const roomData = characteristicsTable.getData();
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
        const matchingRooms = roomData.filter(room => {
            const actualFeatures = Object.keys(room)
                .filter(col => col !== "Horário sala visível portal público" && room[col] === "X")
                .map(col => col.replace("Características reais da sala", "").trim().toLowerCase());

            const roomCapacity = parseInt(room["Capacidade Normal"], 10) || 0;
            const roomName = room["Nome sala"];
            const hasMatchingFeature = requestedFeatures.some(requestedFeature =>
                actualFeatures.some(actualFeature =>
                    actualFeature.includes(requestedFeature.trim().toLowerCase())
                )
            );
            const meetsCapacity = roomCapacity >= requiredCapacity;
            const roomKey = `${roomName.trim()}_${classDate.trim()}`;
            const scheduledTimes = groupedSchedule[roomKey] || [];
            const isRoomAvailable = !scheduledTimes.some(({start, end}) => {
                return (
                    (classStart >= start && classStart < end) ||
                    (classEnd > start && classEnd <= end) ||
                    (classStart <= start && classEnd >= end)
                );
            });
            return hasMatchingFeature && meetsCapacity && isRoomAvailable;
        });
        return matchingRooms.map(room => room["Nome sala"]);
    }
}

function populateSalaDropdown() {
    const dropdown = document.getElementById("sala");
    const matchingRooms = getMatchingRoomsForDropdown();

    dropdown.innerHTML = '<option value="" disabled selected>Sala</option>';

    matchingRooms.forEach(room => {
        const option = document.createElement("option");
        option.value = room;
        option.textContent = room;
        dropdown.appendChild(option);
    });
}

let isInscritosChanged = false;
let isDiaChanged = false;
let isInicioChanged = false;
let isFimChanged = false;
let isCaracteristicasChanged = false;

function checkAndPopulateSalaDropdown() {
    if (
        isInscritosChanged &&
        isDiaChanged &&
        isInicioChanged &&
        isFimChanged &&
        isCaracteristicasChanged
    ) {
        populateSalaDropdown();
    }
}

document.getElementById("inscritos").addEventListener("input", () => {
    isInscritosChanged = true;
    checkAndPopulateSalaDropdown();

});

document.getElementById("dia").addEventListener("input", () => {
    isDiaChanged = true;
    checkAndPopulateSalaDropdown();

});

document.getElementById("inicio").addEventListener("input", () => {
    isInicioChanged = true;
    checkAndPopulateSalaDropdown();
});

document.getElementById("fim").addEventListener("input", () => {
    isFimChanged = true;
    checkAndPopulateSalaDropdown();
});

document.getElementById("caracteristicas").addEventListener("change", () => {
    isCaracteristicasChanged = true;
    checkAndPopulateSalaDropdown();
});

function resetFlags() {
    isInscritosChanged = false;
    isDiaChanged = false;
    isInicioChanged = false;
    isFimChanged = false;
    isCaracteristicasChanged = false;
}

