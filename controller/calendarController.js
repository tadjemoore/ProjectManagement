class CalendarController {
    constructor(model, view, appController) {
        this.model = model;
        this.view = view;
        this.appController = appController;

        this.calendarMonthOffset = 0; // 0 = current month, -1 = previous month, +1 = next month, etc.
        this.calendarSort = 'date'; // 'date' or 'project' etc.
    }

    init () {
        this.view.bindCalendarControls({
            onPreviousMonth: () => { this.calendarMonthOffset--; this.renderCalendar(); },
            onNextMonth: () => { this.calendarMonthOffset++; this.renderCalendar(); },
            onSortChange: (value) => { this.calendarSort = value; this.renderCalendar(); }
        });
    }

    getCalendarMonthDate(){
        const today = new Date();
        return new Date(today.getFullYear(), today.getMonth() + this.calendarMonthOffset, 1);
    }

    renderCalendar(state = this.model.getState()) {
        const visibleProjects = this.appController.getVisibleProjects(state);
        const visibleTasks = this.appController.getVisibleTasks(state);

        const items =[
            ...visibleProjects
                .filter(project => project.dueDate)
                .map(project => ({
                    type: 'project',
                    id: project.id,
                    title: project.title,
                    dueDate: project.dueDate,
                    priority: 'medium', // Projects don't have priority, but we can assign a default for sorting
                    data: project
                })),
            ...visibleTasks
                .filter(task => task.dueDate)
                .map(task => ({
                    type: 'task',
                    id: task.id,
                    title: task.title,
                    dueDate: task.dueDate,
                    priority: task.priority || 'medium',
                    data: task
                }))
        ];

        this.view.renderMonthlyCalendar(items, this.getCalendarMonthDate(), {
            sortBy: this.calendarSort,
            onProjectClick: (project) => this.view.openCalendarProjectDetailModal(project, state.users),
            onTaskClick: (task) => this.view.openCalendarTaskDetailModal(task, state.users, state.projects),
            onDayClick: (dayLabel, dayItems) => this.view.openCalendarDayDetailModal(dayLabel, dayItems, {
                onProjectClick: (project) => this.view.openCalendarProjectDetailModal(project, state.users),
                onTaskClick: (task) => this.view.openCalendarTaskDetailModal(task, state.users, state.projects)
            })
        });
    }
}