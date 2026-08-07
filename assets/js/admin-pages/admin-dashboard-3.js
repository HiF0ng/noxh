document.addEventListener('DOMContentLoaded', function() {
            // Setup Line Chart
            const lineCtx = document.getElementById('applicationsChart').getContext('2d');
            const applicationsChart = new Chart(lineCtx, {
                type: 'line',
                data: {
                    labels: ['Tuần 1', 'Tuần 2', 'Tuần 3', 'Tuần 4', 'Tuần 5', 'Tuần 6', 'Tuần 7', 'Tuần 8'],
                    datasets: [{
                        label: 'Lượt truy cập',
                        data: [1200, 1500, 1400, 1800, 2200, 2500, 2400, 3100],
                        borderColor: '#2563eb', // Primary color
                        backgroundColor: 'rgba(37, 99, 235, 0.1)',
                        borderWidth: 2,
                        tension: 0.4,
                        fill: true,
                        pointBackgroundColor: '#ffffff',
                        pointBorderColor: '#2563eb',
                        pointBorderWidth: 2,
                        pointRadius: 4,
                        pointHoverRadius: 6
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {