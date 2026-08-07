// Simple drag and drop visual feedback logic
        function setupDropzone(zoneId, inputId) {
            const dropzone = document.getElementById(zoneId);
            const input = document.getElementById(inputId);

            if (!dropzone || !input) return;

            dropzone.addEventListener('click', () => input.click());

            ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
                dropzone.addEventListener(eventName, preventDefaults, false);
            });

            function preventDefaults(e) {
                e.preventDefault();
                e.stopPropagation();
            }

            ['dragenter', 'dragover'].forEach(eventName => {
                dropzone.addEventListener(eventName, highlight, false);
            });

            ['dragleave', 'drop'].forEach(eventName => {
                dropzone.addEventListener(eventName, unhighlight, false);
            });

            function highlight(e) {
                dropzone.classList.add('upload-zone-hover');
                dropzone.classList.remove('bg-surface');
            }

            function unhighlight(e) {
                dropzone.classList.remove('upload-zone-hover');
                dropzone.classList.add('bg-surface');
            }

            dropzone.addEventListener('drop', handleDrop, false);

            function handleDrop(e) {
                let dt = e.dataTransfer;
                let files = dt.files;
                input.files = files;
                // Add logic here to show selected file name if desired
            }
        }

        document.addEventListener('DOMContentLoaded', () => {
            setupDropzone('pdf-dropzone', 'pdf-input');
            setupDropzone('docx-dropzone', 'docx-input');
        });