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

function saveCharacteristicsChanges(characteristicsId) {
    const tableData = characteristicsTable.getData(); // Get all data from Tabulator

    if (!tableData || tableData.length === 0) {
        alert("No data available to save.");
        return;
    }

    // Convert data back to CSV
    const csvContent = Papa.unparse(tableData);

    // Create a Blob from the CSV content
    const csvBlob = new Blob([csvContent], { type: "text/csv" });
    const fileName = "updated_characteristics.csv";

    // Append the Blob to FormData
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

// Add event listener to the button
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
    const modifiedData = characteristicsTable.getData(); // Get the current table data

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