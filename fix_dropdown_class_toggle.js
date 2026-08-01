const fs = require('fs');

let mainJs = fs.readFileSync('assets/js/main.js', 'utf-8');

const targetToggleBlock = `        // Toggle dropdown
        avatarWrapper.addEventListener('click', (e) => {
            e.stopPropagation();
            const isHidden = dropdown.classList.contains('hidden');
            
            // Hide all other dropdowns
            document.querySelectorAll('.user-dropdown-menu').forEach(d => {
                d.classList.add('hidden');
                d.classList.remove('flex');
            });
            
            if (isHidden) {
                dropdown.classList.remove('hidden');
                dropdown.classList.add('flex');
            }
        });
    });
    
    // Close dropdown on click outside
    document.addEventListener('click', () => {
        document.querySelectorAll('.user-dropdown-menu').forEach(d => {
            d.classList.add('hidden');
            d.classList.remove('flex');
        });
    });`;

const replacementToggleBlock = `        // Toggle dropdown
        avatarWrapper.addEventListener('click', (e) => {
            e.stopPropagation();
            const isHidden = !dropdown.classList.contains('show-dropdown');
            
            // Hide all other dropdowns
            document.querySelectorAll('.user-dropdown-menu').forEach(d => {
                d.classList.remove('show-dropdown');
            });
            
            if (isHidden) {
                dropdown.classList.add('show-dropdown');
            }
        });
    });
    
    // Close dropdown on click outside
    document.addEventListener('click', () => {
        document.querySelectorAll('.user-dropdown-menu').forEach(d => {
            d.classList.remove('show-dropdown');
        });
    });`;

if (mainJs.includes(targetToggleBlock)) {
    mainJs = mainJs.replace(targetToggleBlock, replacementToggleBlock);
    console.log("Successfully updated dropdown toggling to use show-dropdown class.");
} else {
    const targetToggleBlockCRLF = targetToggleBlock.replace(/\n/g, '\r\n');
    if (mainJs.includes(targetToggleBlockCRLF)) {
        mainJs = mainJs.replace(targetToggleBlockCRLF, replacementToggleBlock.replace(/\n/g, '\r\n'));
        console.log("Successfully updated dropdown toggling to use show-dropdown class (CRLF).");
    } else {
        console.error("Could not find target dropdown toggle block in main.js!");
    }
}

fs.writeFileSync('assets/js/main.js', mainJs, 'utf-8');
