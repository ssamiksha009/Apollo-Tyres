// File upload handling
document.getElementById('excelFile').addEventListener('change', function(e) {
    const fileName = e.target.files[0].name;
    document.getElementById('fileName').textContent = fileName;
});

// Submit button handling
document.getElementById('submitBtn').addEventListener('click', function() {
    const errorMessage = document.getElementById('errorMessage');
    
    // Clear any previous error messages
    errorMessage.textContent = '';

    // Make a request to the server to read the Excel file
    fetch('/api/read-protocol-excel')
        .then(response => response.arrayBuffer())
        .then(data => {
            const workbook = XLSX.read(new Uint8Array(data), {type: 'array'});
            
            // Process each sheet
            const outputWorkbook = XLSX.utils.book_new();
            
            workbook.SheetNames.forEach((sheetName) => {
                const worksheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet, {header: 1});
                
                // Replace values in the sheet
                const replacements = {
                    'P1': document.getElementById('p1').value,
                    'P2': document.getElementById('p2').value,
                    'P3': document.getElementById('p3').value,
                    'L1': document.getElementById('l1').value,
                    'L2': document.getElementById('l2').value,
                    'L3': document.getElementById('l3').value,
                    'V1': document.getElementById('v1').value,
                    'V2': document.getElementById('v2').value,
                    'V3': document.getElementById('v3').value
                };

                // Create a new sheet with replaced values
                const newSheet = jsonData.map(row => 
                    row.map(cell => {
                        const cellStr = String(cell).trim().replace(/\s+/g, '');
                        
                        if (cellStr === 'L1,L2,L3') {
                            return `${replacements['L1']},${replacements['L2']},${replacements['L3']}`;
                        } else if (cellStr.includes('L1') && cellStr.includes('L2') && cellStr.includes('L3')) {
                            return `${replacements['L1']},${replacements['L2']},${replacements['L3']}`;
                        }
                        
                        return replacements[cellStr] || cell;
                    })
                );

                const modifiedWorksheet = XLSX.utils.aoa_to_sheet(newSheet);
                XLSX.utils.book_append_sheet(outputWorkbook, modifiedWorksheet, sheetName);
            });

            // Generate and download the output file
            XLSX.writeFile(outputWorkbook, 'output.xlsx');
        })
        .catch(error => {
            errorMessage.textContent = 'Error processing the Excel file. Please try again.';
            console.error('Error:', error);
        });
});
