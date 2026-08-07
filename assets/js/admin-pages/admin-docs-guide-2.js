function addStep() {
            const container = document.getElementById('guide-steps-container');
            
            const html = `
                <div class="guide-step relative bg-surface border border-outline-variant/60 rounded-xl p-5 pt-6 shadow-sm group hover:border-primary/50 transition-colors">
                    <button type="button" class="absolute top-2 right-2 p-1 text-on-surface-variant hover:text-error hover:bg-error-container rounded-full transition-colors opacity-0 group-hover:opacity-100" title="Xóa bước này" onclick="removeStep(this)">
                        <span class="material-symbols-outlined text-[20px]">close</span>
                    </button>
                    <div class="flex gap-4 items-start">
                        <div class="w-10 h-10 shrink-0 bg-primary text-on-primary rounded-full flex items-center justify-center font-bold text-[18px] step-number shadow-sm mt-1"></div>
                        <div class="flex-1 space-y-4">
                            <div>
                                <label class="block text-[14px] font-semibold text-on-surface mb-2">Tiêu đề (Header)</label>
                                <input type="text" class="w-full p-3 bg-surface-container-lowest border border-outline-variant rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-[15px]" placeholder="VD: Nhập thông tin...">
                            </div>
                            <div>
                                <label class="block text-[14px] font-semibold text-on-surface mb-2">Nội dung hướng dẫn</label>
                                <textarea class="w-full p-3 bg-surface-container-lowest border border-outline-variant rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none resize-y text-[15px]" rows="3" placeholder="Chi tiết cách điền..."></textarea>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            container.insertAdjacentHTML('beforeend', html);
            updateStepNumbers();
        }

        function removeStep(buttonElement) {
            const stepElement = buttonElement.closest('.guide-step');
            if(stepElement) {
                stepElement.remove();
                updateStepNumbers();
            }
        }

        function updateStepNumbers() {
            const steps = document.querySelectorAll('.guide-step');
            steps.forEach((step, index) => {
                step.querySelector('.step-number').textContent = index + 1;
            });
        }

        // Initialize drag & drop styling for image upload
        const dropzone = document.getElementById('image-dropzone');
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropzone.addEventListener(eventName, preventDefaults, false);
        });
        function preventDefaults(e) { e.preventDefault(); e.stopPropagation(); }
        ['dragenter', 'dragover'].forEach(eventName => {
            dropzone.addEventListener(eventName, () => dropzone.classList.add('border-primary', 'bg-surface-container-low'), false);
        });
        ['dragleave', 'drop'].forEach(eventName => {
            dropzone.addEventListener(eventName, () => dropzone.classList.remove('border-primary', 'bg-surface-container-low'), false);
        });