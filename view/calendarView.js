class CalendarView {
    constructor(viewContext) {
        this.view = viewContext;
    }
    // move calendar view related methods here
    renderMonthlyCalendar(calendarGrid, handlers){
        const onInteractionStart = typeof handlers.onInteractionStart === 'function' ? handlers.onInteractionStart : () => {};
        const onInteractionEnd = typeof handlers.onInteractionEnd === 'function' ? handlers.onInteractionEnd : () => {};
        const onProjectClick = typeof handlers.onProjectClick === 'function' ? handlers.onProjectClick : () => {};
        const onTaskClick = typeof handlers.onTaskClick === 'function' ? handlers.onTaskClick : () => {};
        const onDayClick = typeof handlers.onDayClick === 'function' ? handlers.onDayClick : () => {};

        this.view.calendarMonthLabel.textContent = calendarGrid.monthLabel;

        this.view.monthlyCalendarGrid.innerHTML = calendarGrid.cells.map((cell) => `
            <button type="button" class="calendar-day ${cell.outsideMonth ? 'is-outside-month' : ''} ${cell.isToday ? 'is-today' : ''}" data-date="${cell.date}">
                <div class="calendar-day-top">
                    <span class="calendar-day-number">${cell.dayNumber}</span>
                    <span class="calendar-day-count">${cell.items.length}</span>
                </div>
                <div class="calendar-day-items">
                    ${cell.items.slice(0,3).map(item => `
                        <div class="calendar-chip calendar-chip-${item.type}" data-item-id="${item.id}" data-item-type="${item.type}">
                            ${item.title}
                        </div>
                    `).join('')}
                </div>
            </button>
        `).join('');
        
        const itemLookup = new Map();
        calendarGrid.cells.forEach(cell => {
            cell.items.forEach(item => {
                itemLookup.set(`${item.type}-${item.id}`, item);
            });
        });

        this.view.monthlyCalendarGrid.querySelectorAll('.calendar-day').forEach(dayElement => {
            dayElement.addEventListener('click', () => {
                const date = dayElement.getAttribute('data-date');
                if (!date) return; // Ignore clicks on empty cells

                onInteractionStart(); // Notify app controller that user is interacting with the calendar

                try {
                    onDayClick(date);
                } catch (error) {
                    console.error('Error handling day click:', {error, date});
                    this.view.showToast?.('Unable to open day details.', 'error');
                } finally {
                    onInteractionEnd(); // Notify app controller that user has finished interacting with the calendar
                }
            });
        });

        this.view.monthlyCalendarGrid.querySelectorAll('.calendar-chip').forEach(chip => {
            chip.addEventListener('click', (event) => {
                event.stopPropagation(); // Prevent the day click event from firing

                const type = chip.getAttribute('data-item-type');
                const id = chip.getAttribute('data-item-id');
                
                onInteractionStart(); // Notify app controller that user is interacting with the calendar
                
                try {
                    const item = itemLookup.get(`${type}-${id}`);
                    if (!item) {
                        console.warn('Calendar chip item not found', {type, id});
                        this.view.showToast?.('Unable to open item details.', 'error');
                        return;
                    }
                    
                    if (this.view.calendarDayDetailModal?.classList.contains('open')) {
                        this.view.closeModal(this.view.calendarDayDetailModal);
                    }

                    if (item.type === 'project') {
                        onProjectClick(item.data);
                    } else {
                        onTaskClick(item.data);
                    }
                } catch (error) {
                    console.error('Calendar chip click failed', {error, type, id});
                    this.view.showToast?.('Unable to open item details.', 'error');
                } finally {
                    onInteractionEnd(); // Notify app controller that user has finished interacting with the calendar
                }
            });
        });
    }
}