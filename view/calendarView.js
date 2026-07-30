class CalendarView {
    constructor(viewContext) {
        this.view = viewContext;
    }
    // move calendar view related methods here
    renderMonthlyCalendar(items, monthDate, handlers){
        const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
        const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
        const firstDayOfWeek = monthStart.getDay();
        const daysInMonth = monthEnd.getDate();

        const previousMonthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth(), 0);
        const daysInPreviousMonth = previousMonthEnd.getDate();

        const today = new Date();
        const isCurrentMonth = today.getFullYear() === monthDate.getFullYear() && today.getMonth() === monthDate.getMonth();

        // update month label above grid
        this.view.calendarMonthLabel.textContent = monthDate.toLocaleString('default', { month: 'long', year: 'numeric' });

        const toLocalDateString = (dateStr) => {
            const year = dateStr.getFullYear();
            const month = String(dateStr.getMonth() + 1).padStart(2, '0');
            const day = String(dateStr.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };

        const normalizeDueDate = (value) => String(value || '').slice(0, 10); // Ensure it's a string and take only the date part

        const sortedItems = (list) => {
            const clone = [...list];

            if (handlers.sortBy === 'type') {
                clone.sort((a,b) => a.type.localeCompare(b.type) || a.title.localeCompare(b.title));
            } else if (handlers.sortBy === 'priority') {
                const priorityOrder = { 'high': 1, 'medium': 2, 'low': 3 };
                clone.sort((a,b) => (priorityOrder[a.priority] || 4) - (priorityOrder[b.priority] || 4) || a.title.localeCompare(b.title));
            } else {
                clone.sort((a,b) => new Date(a.dueDate) - new Date(b.dueDate) || a.title.localeCompare(b.title));
            }
            return clone;
        };
        
        const totalCells = 42; // 6 weeks * 7 days
        const cells = [];

        for (let i = 0; i < totalCells; i++) {
            let cellDate;
            let outsideMonth = false;

            if (i < firstDayOfWeek) {
                // Previous month filler days
                const dayNum = daysInPreviousMonth - firstDayOfWeek + i + 1;
                cellDate = new Date(monthDate.getFullYear(), monthDate.getMonth() - 1, dayNum);
                outsideMonth = true;
            } else if (i >= firstDayOfWeek + daysInMonth) {
                // Next month filler days
                const dayNum = i - firstDayOfWeek - daysInMonth + 1;
                cellDate = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, dayNum);
                outsideMonth = true;
            } else {
                // Current month days
                const dayNum = i - firstDayOfWeek + 1;
                cellDate = new Date(monthDate.getFullYear(), monthDate.getMonth(), dayNum);
            }
            
            const isoDate = toLocalDateString(cellDate);
            const dayNumber = cellDate.getDate();
            const dayItems = sortedItems(items.filter(item => normalizeDueDate(item.dueDate) === isoDate));

            const isToday = isCurrentMonth && !outsideMonth && dayNumber === today.getDate();

            cells.push(`
                <button type="button" class="calendar-day ${outsideMonth ? 'is-outside-month' : ''} ${isToday ? 'is-today' : ''}" data-date="${isoDate}">
                    <div class="calendar-day-top">
                        <span class="calendar-day-number">${dayNumber}</span>
                        <span class="calendar-day-count">${dayItems.length}</span>
                    </div>
                    <div class="calendar-day-items">
                        ${dayItems.slice(0,3).map(item => `
                            <div class="calendar-chip calendar-chip-${item.type}" data-item-id="${item.id}" data-item-type="${item.type}">
                                ${item.title}
                            </div>
                            `).join('')}
                    </div>
                </button>
            `);
        }

        this.view.monthlyCalendarGrid.innerHTML = cells.join('');

        this.view.monthlyCalendarGrid.querySelectorAll('.calendar-day').forEach(dayElement => {
            dayElement.addEventListener('click', () => {
                const date = dayElement.getAttribute('data-date');
                if (!date) return; // Ignore clicks on empty cells

                const dayItems = items.filter((item) => normalizeDueDate(item.dueDate) === date);
                handlers.onDayClick(date, dayItems);
            });
        });

        this.view.monthlyCalendarGrid.querySelectorAll('.calendar-chip').forEach(chip => {
            chip.addEventListener('click', (event) => {
                event.stopPropagation(); // Prevent the day click event from firing
                const type = chip.getAttribute('data-item-type');
                const id = chip.getAttribute('data-item-id');
                const item = items.find(entry => String(entry.id) === String(id) && entry.type === type);

                if (!item) return;

                if (item.type === 'project') {
                    handlers.onProjectClick(item.data);
                } else {
                    handlers.onTaskClick(item.data);
                }
            });
        });
    }
}