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

function saveCharacteristicsChanges(characteristicsId) {
    const tableData = characteristicsTable.getData();

    if (!tableData || tableData.length === 0) {
        alert("No data available to save.");
        return;
    }

    const csvContent = Papa.unparse(tableData);

    const csvBlob = new Blob([csvContent], {type: "text/csv"});
    const fileName = "updated_characteristics.csv";

    const formData = new FormData();
    formData.append("file", csvBlob, fileName);

    fetch(`/update-characteristics/${characteristicsId}/`, {
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

document.addEventListener("DOMContentLoaded", function () {
    const storeChangesButton = document.getElementById("storeChangesButton");

    if (storeChangesButton) {

        const characteristicsId = storeChangesButton.dataset.characteristicsId;

        storeChangesButton.addEventListener("click", function () {
            saveCharacteristicsChanges(characteristicsId);
        });
    } else {
        console.error("storeChangesButton not found in the DOM.");
    }
});

document.getElementById("saveChangesButton").addEventListener("click", function () {
    const scriptTag = document.querySelector('script[characteristics-id]');
    const characteristicsId = scriptTag.getAttribute("characteristics-id");
    saveCharacteristicsChanges(characteristicsId);
    const modifiedData = characteristicsTable.getData();

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

let isReverting = false;

characteristicsTable.on("cellEdited", function (cell) {
    if (isReverting) return;

    const table = cell.getTable();
    const field = cell.getColumn().getField();
    const rowData = cell.getRow().getData();
    const columns = table.getColumns();
    const colIndex = columns.findIndex(col => col.getField() === field);

    const value = cell.getValue();
    const oldValue = cell.getOldValue();

    if (["Capacidade Normal", "Capacidade Exame", "Nº características"].includes(field)) {
        if (isNaN(value) || value < 0 || !Number.isInteger(Number(value))) {
            alert("Erro: Apenas números inteiros positivos são permitidos.");
            isReverting = true;
            cell.setValue(oldValue);
            isReverting = false;
            return;
        }
    }
    if (colIndex > 4) {
        if (value !== "X" && value !== "") {
            alert('Erro: Apenas a letra "X" é permitida nestas colunas.');
            isReverting = true;
            cell.setValue(oldValue);
            isReverting = false;
            return;
        }
        const xCount = columns
            .slice(5)
            .map(col => col.getField())
            .map(field => rowData[field])
            .filter(val => val === "X").length;

        const maxAllowedX = rowData["Nº características"] || 0;
        if (xCount > maxAllowedX) {
            alert(
                `Erro: O número de "X" (${xCount}) não pode exceder o valor de "Nº características" (${maxAllowedX}).`
            );
            isReverting = true;
            cell.setValue(oldValue);
            isReverting = false;
            return;
        }
    }
});