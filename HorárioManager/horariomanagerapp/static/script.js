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
                return {
                    title: field.charAt(0).toUpperCase() + field.slice(1),
                    field: field,
                    headerMenu: headerMenu, // Add header menu to each column
                    headerFilter: "input",  // Enable input filter for each column
                    headerFilterPlaceholder: "Search...",
                    headerWordWrap: true,
                    editor: true,
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

            const overcrowdedPercentage = totalClasses > 0 ? ((overlapClasses / totalClasses) * 100).toFixed(2) : 0;

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
                    <p>Percentagem de sobreposição: ${overcrowdedPercentage}%</p>
                `;

                metricDisplay.style.display = "block";

        });

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
        }
        document.getElementById("resetFilterButton").addEventListener("click", function () {
            resetFiltersAndMetrics();
        });

        scheduleTable.on("cellDblClick", function(e, cell) {
            cell.edit();
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
