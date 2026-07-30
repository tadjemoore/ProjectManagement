class CalendarModel {
    constructor(model) {
        this.model = model;
    }

    getCalendarMonthDate(monthOffset = 0, baseDate = new Date()) {
        return new Date(baseDate.getFullYear(), baseDate.getMonth() + monthOffset, 1);
    }

    getCalendarMonthLabel(monthDate) {
        return monthDate.toLocaleString('default', { month: 'long', year: 'numeric' });
    }

    normalizeDate(value) {
        if (!value) return '';

        const date = value instanceof Date ? value : new Date(value);
        if(Number.isNaN(date.getTime())) return '';

        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');

        return year + '-' + month + '-' + day;
    }

    buildCalendarItems(visibleProjects = [], visibleTasks = []) {
        const projectItems = visibleProjects
            .filter(project => project && project.dueDate)
            .map(project => ({
                type: 'project',
                id: project.id,
                title: project.title || '',
                dueDate: this.normalizeDate(project.dueDate),
                priority: 'medium', // Projects don't have priority, but we can assign a default for sorting
                data: project
            }));
        
        const taskItems = visibleTasks
            .filter(task => task && task.dueDate)
            .map(task => ({
                type: 'task',
                id: task.id,
                title: task.title || '',
                dueDate: this.normalizeDate(task.dueDate),
                priority: task.priority || 'medium',
                data: task
            }));
        return projectItems.concat(taskItems);
    }

    filterCalendarItems(items = [], searchQuery = '') {
        const query = String(searchQuery || '').trim().toLowerCase();
        if (!query) return items;

        return items.filter((item) => String(item.title || '').toLowerCase().includes(query));
    }

    sortCalendarItems(items = [], sortBy = 'date') {
        const clone = items.slice(); // Create a shallow copy to avoid mutating the original array

        if (sortBy === 'type') {
            clone.sort((a, b) => String(a.type || '').localeCompare(String(b.type || ''))
                || String(a.title || '').localeCompare(String(b.title || '')));
            return clone;
        }

        if (sortBy === 'priority') {
            const priorityOrder = { 'high': 1, 'medium': 2, 'low': 3 };
            clone.sort((a, b) => (priorityOrder[String(a.priority || 'medium')] || 4) - (priorityOrder[String(b.priority || 'medium')] || 4) || String(a.title || '').localeCompare(String(b.title || '')));
            return clone;
        }

        clone.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate) || String(a.title || '').localeCompare(String(b.title || '')));
        return clone;
    }

    getCalendarDayItems(items=[], dayLabel='', sortBy='date') {
        const normalizedDay = this.normalizeDate(dayLabel);
        const dayItems = items.filter(item => this.normalizeDate(item.dueDate) === normalizedDay);
        return this.sortCalendarItems(dayItems, sortBy);
    }

    buildCalendarGrid(monthDate, items = [], sortBy = 'date') {
        const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
        const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
        const firstDayOfWeek = monthStart.getDay(); // 0 (Sunday) to 6 (Saturday)
        const daysInMonth = monthEnd.getDate();

        const previousMonthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth(), 0);
        const daysInPreviousMonth = previousMonthEnd.getDate();

        const today = new Date();
        const isCurrentMonth = today.getFullYear() === monthDate.getFullYear() && today.getMonth() === monthDate.getMonth();

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

            const isoDate = this.normalizeDate(cellDate);
            const dayItems = this.getCalendarDayItems(items, isoDate, sortBy);

            cells.push({
                date: isoDate,
                dayNumber: cellDate.getDate(),
                isToday: isCurrentMonth && !outsideMonth && cellDate.getDate() === today.getDate(),
                outsideMonth,
                items: dayItems
            });
        }

        return {monthDate, monthLabel: this.getCalendarMonthLabel(monthDate), cells};
    }
}