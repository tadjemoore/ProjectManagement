class CalendarController {
    constructor(model, view, appController) {
        this.model = model;
        this.view = view;
        this.appController = appController;

        this.calendarMonthOffset = 0; // 0 = current month, -1 = previous month, +1 = next month, etc.
        this.calendarSort = 'date'; // 'date' or 'project' etc.
        this.calendarSearch = ''; // Search term for filtering calendar items
    }

    init () {
        this.view.bindCalendarControls({
            onPreviousMonth: () => { this.calendarMonthOffset--; this.renderCalendar(); },
            onNextMonth: () => { this.calendarMonthOffset++; this.renderCalendar(); },
            onSortChange: (value) => { this.calendarSort = value; this.renderCalendar(); },
            onSearchChange: (value) => { this.calendarSearch = value; this.renderCalendar(); }
        });
    }

    getCalendarMonthDate() {
        return this.model.getCalendarMonthDate(this.calendarMonthOffset);
    }

    buildCalendarModalHandlers(state) {
        return {
            onInteractionStart: () => this.appController.beginCalendarInteraction(),
            onInteractionEnd: () => this.appController.endCalendarInteraction(),
            onProjectClick: (project) => this.view.openCalendarProjectDetailModal(project, state.users),
            onTaskClick: (task) => this.view.openCalendarTaskDetailModal(task, state.users, state.projects)
        };
    }

    getCalendarViewData(state = this.model.getState()) {
        const visibleProjects = this.appController.getVisibleProjects(state);
        const visibleTasks = this.appController.getVisibleTasks(state);
        const monthDate = this.getCalendarMonthDate();

        const calendarItems = this.model.buildCalendarItems(visibleProjects, visibleTasks, this.calendarSearch);
        const calendarGrid = this.model.buildCalendarGrid(monthDate, calendarItems, this.calendarSort);

        return {calendarItems, calendarGrid};
    }

    renderCalendar(state = this.model.getState()) {
       const { calendarItems, calendarGrid } = this.getCalendarViewData(state);
       const modalHandlers = this.buildCalendarModalHandlers(state);

       this.view.renderMonthlyCalendar(calendarGrid, {
        onInteractionStart: modalHandlers.onInteractionStart,
        onInteractionEnd: modalHandlers.onInteractionEnd,
        onProjectClick: modalHandlers.onProjectClick,
        onTaskClick: modalHandlers.onTaskClick,
        onDayClick: (dayLabel) => {
            const dayItems = this.model.getCalendarDayItems(calendarItems, dayLabel, this.calendarSort);

            this.view.openCalendarDayDetailModal(dayLabel, dayItems, modalHandlers);
        }
       });
    }
}