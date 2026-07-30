class TaskView {
    constructor(viewContext) {
        this.view = viewContext;
    }

    renderTasksTable({ tasks, projects, users }, onToggle, onTaskClick, onDelete, searchVal = '', scopeVal = 'all', statusVal = 'all', priorityVal = 'all', activeUserId) {
        const query = searchVal.toLowerCase().trim();

        const filtered = tasks.filter(task => {
            const project = projects.find(p => p.id === task.projectId);
            const projTitle = project ? project.title : '';

            const matchesSearch = task.title.toLowerCase().includes(query) ||
                task.description.toLowerCase().includes(query) ||
                projTitle.toLowerCase().includes(query);

            const matchesScope = scopeVal === 'all' || task.assigneeId === activeUserId;
            const matchesStatus = statusVal === 'all' || task.status === statusVal;
            const matchesPriority = priorityVal === 'all' || task.priority === priorityVal;

            return matchesSearch && matchesScope && matchesStatus && matchesPriority;
        });

        if (filtered.length === 0) {
            this.view.globalTasksTableBody.innerHTML = '';
            this.view.tasksEmptyState.classList.remove('hidden');
            return;
        }

        this.view.tasksEmptyState.classList.add('hidden');
        this.view.globalTasksTableBody.innerHTML = filtered.map(task => {
            const project = projects.find(p => p.id === task.projectId);
            const projTitle = project ? project.title : 'External Task';
            const assignee = users.find(u => u.id === task.assigneeId);
            const assigneeName = assignee ? assignee.name : 'Unassigned';

            return `
                <tr class="task-row" data-task-id="${task.id}">
                    <td>
                        <label class="checkbox-container">
                            <input type="checkbox" class="task-check" data-id="${task.id}" ${task.status === 'completed' ? 'checked' : ''}>
                            <span class="checkmark"></span>
                        </label>
                    </td>
                    <td>
                        <strong>${task.title}</strong>
                        <div class="task-row-meta">${task.description || 'No description'}</div>
                    </td>
                    <td>${projTitle}</td>
                    <td>${assigneeName}</td>
                    <td>
                        <span class="badge badge-${task.priority}">${task.priority}</span>
                    </td>
                    <td class="task-date-cell">${task.dueDate || 'No date'}</td>
                    <td>
                        <button class="btn-delete-task" data-id="${task.id}" title="Delete Task">
                            <i class="fa-regular fa-trash-can"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

        this.view.globalTasksTableBody.querySelectorAll('.task-check').forEach(input => {
            input.addEventListener('change', () => {
                const id = input.getAttribute('data-id');
                onToggle(id);
            });
        });

        this.view.globalTasksTableBody.querySelectorAll('.btn-delete-task').forEach(btn => {
            btn.addEventListener('click', (event) => {
                event.stopPropagation(); // Prevent the row click event from firing
                const id = btn.getAttribute('data-id');
                if (confirm('Are you sure you want to delete this task?')) {
                    onDelete(id);
                }
            });
        });

        this.view.globalTasksTableBody.querySelectorAll('.task-row').forEach(row => {
            row.addEventListener('click', (event) => {
                // Ignore clicks fom delete button or any checkboxes to avoid opening the task details modal
                if (
                    event.target.closest('.btn-delete-task') ||
                    event.target.closest('.task-check') ||
                    event.target.closest('.checkbox-container') ||
                    event.target.closest('.checkmark')
                ) {
                    return;
                }
                
                const taskId = row.getAttribute('data-task-id');
                onTaskClick(taskId);
            });
        });
    }

    // renderMonthlyCalendar(items, monthDate, handlers){
    //     const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
    //     const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
    //     const firstDayOfWeek = monthStart.getDay();
    //     const daysInMonth = monthEnd.getDate();

    //     // update month label above grid
    //     this.view.calendarMonthLabel.textContent = monthDate.toLocaleString('default', { month: 'long', year: 'numeric' });

    //     const sortedItems = (list) => {
    //         const clone = [...list];

    //         if (handlers.sortBy === 'type') {
    //             clone.sort((a,b) => a.type.localeCompare(b.type) || a.title.localeCompare(b.title));
    //         } else if (handlers.sortBy === 'priority') {
    //             const priorityOrder = { 'high': 1, 'medium': 2, 'low': 3 };
    //             clone.sort((a,b) => (priorityOrder[a.priority] || 4) - (priorityOrder[b.priority] || 4) || a.title.localeCompare(b.title));
    //         } else {
    //             clone.sort((a,b) => new Date(a.dueDate) - new Date(b.dueDate) || a.title.localeCompare(b.title));
    //         }
    //         return clone;
    //     };

    //     const cells = [];

    //     for (let i =0; i <firstDayOfWeek; i++) {
    //         cells.push('<div class="calendar-cell empty"></div>');
    //     }

    //     for (let day = 1; day <= daysInMonth; day++) {
    //         const cellDate = new Date(monthDate.getFullYear(), monthDate.getMonth(), day);
    //         const isoDate = cellDate.toISOString().split('T')[0];
    //         const dayItems = sortedItems(items.filter(item => item.dueDate === isoDate));

    //         cells.push(`
    //             <button type="button" class="calendar-day" data-date="${isoDate}">
    //                 <div class="calendar-day-top">
    //                     <span class="calendar-day-number">${day}</span>
    //                     <span class="calendar-day-count">${dayItems.length}</span>
    //                 </div>
    //                 <div class="calendar-day-items">
    //                     ${dayItems.slice(0,3).map(item => `
    //                         <div class="calendar-chip calendar-chip-${item.type}" data-item-id="${item.id}" data-item-type="${item.type}">
    //                             ${item.title}
    //                         </div>
    //                         `).join('')}
    //                 </div>
    //             </button>
    //         `);
    //     }

    //     this.view.monthlyCalendarGrid.innerHTML = cells.join('');

    //     this.view.monthlyCalendarGrid.querySelectorAll('.calendar-day').forEach(dayElement => {
    //         dayElement.addEventListener('click', () => {
    //             const date = dayElement.getAttribute('data-date');
    //             if (!date) return; // Ignore clicks on empty cells

    //             const dayItems = items.filter(item => item.dueDate === date);
    //             handlers.onDayClick(date, dayItems);
    //         });
    //     });

    //     this.view.monthlyCalendarGrid.querySelectorAll('.calendar-chip').forEach(chip => {
    //         chip.addEventListener('click', (event) => {
    //             event.stopPropagation(); // Prevent the day click event from firing
    //             const type = chip.getAttribute('data-item-type');
    //             const id = chip.getAttribute('data-item-id');
    //             const item = items.find(entry => entry.id === id && entry.type === type);

    //             if (!item) return;

    //             if (item.type === 'project') {
    //                 handlers.onProjectClick(item);
    //             } else {
    //                 handlers.onTaskClick(item);
    //             }
    //         });
    //     });
    // }
}