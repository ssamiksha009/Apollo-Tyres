
// File upload handling
document.getElementById('excelFile').addEventListener('change', function(e) {
    const fileName = e.target.files[0].name;
    document.getElementById('fileName').textContent = fileName;
});

// Submit button handling
document.getElementById('submitBtn').addEventListener('click', function() {
    // Validate file upload
    const fileInput = document.getElementById('excelFile');
    const errorMessage = document.getElementById('errorMessage');

    // Check if file is uploaded
    if (!fileInput.files.length) {
        errorMessage.textContent = 'Please upload an Excel file';
        return;
    }

    // Validate all input fields
    const inputs = document.querySelectorAll('input[type="text"]');
    for (let input of inputs) {
        if (!input.value.trim()) {
            errorMessage.textContent = 'Please fill in all input fields';
            return;
        }
    }

    // Clear any previous error messages
    errorMessage.textContent = '';

    // Read the Excel file
    const reader = new FileReader();
    reader.onload = function(e) {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, {type: 'array'});
        
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
                    // Convert to string for comparison and replacement
                    const cellStr = String(cell);
                    return replacements[cellStr] || cell;
                })
            );

            // Convert the modified data back to a worksheet
            const modifiedWorksheet = XLSX.utils.aoa_to_sheet(newSheet);
            
            // Add the modified sheet to the output workbook
            XLSX.utils.book_append_sheet(outputWorkbook, modifiedWorksheet, sheetName);
        });

        // Generate and download the output file
        XLSX.writeFile(outputWorkbook, 'output.xlsx');
    };
    
    // Read the file
    reader.readAsArrayBuffer(fileInput.files[0]);
});
