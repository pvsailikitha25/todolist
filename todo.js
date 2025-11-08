// --- Global Helper Functions (Available immediately for addTask) ---
const getTasks = () => JSON.parse(localStorage.getItem('tasks')) || [];
const saveTasks = (tasks) => localStorage.setItem('tasks', JSON.stringify(tasks));
const getProjects = () => JSON.parse(localStorage.getItem('projects')) || [];

const parseProjectTag = (text) => {
    const projects = getProjects();
    const match = text.match(/#(\w+)/);
    const tag = match ? match[1].toLowerCase() : 'personal';
    return projects.find(p => p.name === tag) ? tag : 'personal';
};

const parsePriorityTag = (text) => {
    const match = text.match(/!(\w+)/);
    const priority = match ? match[1].toLowerCase() : 'medium';
    return ['high', 'medium', 'low'].includes(priority) ? priority : 'medium';
};

// **CORE FIX:** Global addTask function for the button
const addTask = () => {
    // Select elements inside the function to ensure they are found at time of click
    const newTaskInput = document.getElementById('new-task-input');
    const newTaskDateInput = document.getElementById('new-task-date');

    if (!newTaskInput || !newTaskDateInput) {
        console.error("Task input elements not found.");
        return;
    }

    const text = newTaskInput.value.trim();
    const date = newTaskDateInput.value.trim();
    
    if (text === '') {
        alert("Please enter a task description.");
        return;
    }

    const project = parseProjectTag(text);
    const priority = parsePriorityTag(text);
    
    const tasks = getTasks();
    const newTask = {
        id: Date.now().toString(),
        text: text, 
        completed: false,
        project: project,
        priority: priority, 
        dueDate: date || new Date().toISOString().split('T')[0],
    };

    tasks.push(newTask);
    saveTasks(tasks);

    // Clear inputs after successful addition
    newTaskInput.value = '';
    newTaskDateInput.value = ''; 
    
    // Call the rendering function which is attached to the window
    if (window.renderTasks) {
        window.renderTasks(); 
    } else {
        // Fallback: This should not run if the script loads correctly
        location.reload(); 
    }
};


// --- DOMContentLoaded Wrapper (For initialization logic and event listeners) ---

document.addEventListener('DOMContentLoaded', () => {
    // --- Element Selectors ---
    const taskList = document.getElementById('task-list');
    const newTaskInput = document.getElementById('new-task-input');
    const themeToggle = document.getElementById('theme-toggle');
    const filterButtons = document.querySelectorAll('.filter-controls button');
    const projectListNav = document.getElementById('project-list');
    const currentProjectTitle = document.getElementById('current-project-title');
    const addProjectBtn = document.getElementById('add-project-btn');

    // Dashboard Metric Elements (These MUST match HTML IDs)
    const metricCompletedCount = document.getElementById('completed-count');
    const metricActiveCount = document.getElementById('active-count');
    const metricOverdueCount = document.getElementById('overdue-count');
    const completionRateElement = document.getElementById('completion-rate');
    const progressBar = document.getElementById('progress-bar');


    let currentFilter = 'all'; 
    let currentProject = 'all'; 

    // --- Data and Project Setup ---
    
    const getDefaultProjects = () => ([
        { name: 'all', icon: 'fas fa-list-check' },
        { name: 'work', icon: 'fas fa-briefcase' },
        { name: 'personal', icon: 'fas fa-user-tag' },
        { name: 'health', icon: 'fas fa-heartbeat' },
        { name: 'study', icon: 'fas fa-book-open' }
    ]);
    
    let projects = getProjects();
    if (projects.length === 0) {
        projects = getDefaultProjects();
        localStorage.setItem('projects', JSON.stringify(projects));
    }
    
    const initializeSampleData = () => {
        if (getTasks().length === 0) {
            const now = Date.now();
            const todayDate = new Date().toISOString().split('T')[0];
            const oneWeekAgo = now - (1000 * 60 * 60 * 24 * 7);

            const sampleTasks = [
                { id: (now + 1).toString(), text: "Send final project report to client #work !high", completed: true, project: 'work', priority: 'high', dueDate: todayDate },
                { id: oneWeekAgo.toString(), text: "Book annual health checkup #health !high", completed: false, project: 'health', priority: 'high', dueDate: "2025-11-01" },
                { id: (now + 2).toString(), text: "Review JavaScript documentation #study !medium", completed: false, project: 'study', priority: 'medium', dueDate: todayDate },
                { id: (now + 3).toString(), text: "Grocery shopping for the week #personal !low", completed: false, project: 'personal', priority: 'low', dueDate: "2025-11-15" }
            ];
            saveTasks(sampleTasks);
        }
    };
    
    const formatDate = (dateString) => {
        if (!dateString) return 'No Date';
        const date = new Date(dateString + 'T00:00:00'); 
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return date.getTime() === today.getTime() ? 'Due Today' : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    // **FIX FOR THE Uncaught TypeError: Null Check Implemented**
    const updateMetrics = (tasks) => {
         const isOverdue = (task) => {
            const taskAgeMs = Date.now() - parseInt(task.id);
            return !task.completed && taskAgeMs > (1000 * 60 * 60 * 24 * 7); 
        }

        const completed = tasks.filter(t => t.completed).length;
        const active = tasks.filter(t => !t.completed).length;
        const overdue = tasks.filter(t => isOverdue(t)).length; 

        const totalTasks = tasks.length;
        const completionRate = totalTasks > 0 ? Math.round((completed / totalTasks) * 100) : 0;

        // Check if the element exists (is not null) before setting content/style
        if (metricCompletedCount) metricCompletedCount.textContent = completed; 
        if (metricActiveCount) metricActiveCount.textContent = active;
        if (metricOverdueCount) metricOverdueCount.textContent = overdue;
        if (completionRateElement) completionRateElement.textContent = `${completionRate}%`;
        if (progressBar) progressBar.style.width = `${completionRate}%`;
    };

    const renderProjectList = () => {
        projectListNav.innerHTML = '';
        
        projects.forEach(project => {
            const li = document.createElement('li');
            li.dataset.project = project.name;
            li.className = project.name === currentProject ? 'active' : '';
            const displayName = project.name.charAt(0).toUpperCase() + project.name.slice(1);
            li.innerHTML = `<i class="${project.icon}"></i> ${displayName}`;
            projectListNav.appendChild(li);
        });
    };

    // --- Core Rendering Function ---
    const renderTasks = () => {
        const allTasks = getTasks();
        
        const projectTasks = allTasks.filter(task => 
            currentProject === 'all' || task.project === currentProject
        );
        updateMetrics(projectTasks); 

        let filteredTasks = projectTasks.filter(task => {
            if (currentFilter === 'completed') return task.completed;
            if (currentFilter === 'today') {
                const today = new Date().toISOString().split('T')[0];
                return !task.completed && task.dueDate === today;
            }
            return currentFilter === 'all' || !task.completed;
        });
        
        taskList.innerHTML = '';
        if (filteredTasks.length === 0) {
            taskList.innerHTML = `<li style="justify-content: center; color: #777; border: none; background: transparent;">
                No tasks found for <b>${currentProjectTitle.textContent.replace(' Overview', '')}</b> in the current filter.
            </li>`;
        }
        
        filteredTasks.forEach(task => {
            const li = document.createElement('li');
            li.className = `${task.completed ? 'completed' : 'active'} priority-${task.priority}`;
            li.dataset.id = task.id;

            const cleanText = task.text.replace(/#\w+/g, '').replace(/!\w+/g, '').trim();
            const formattedDate = formatDate(task.dueDate);

            li.innerHTML = `
                <div class="task-content">
                    <input type="checkbox" ${task.completed ? 'checked' : ''} data-action="toggle">
                    <div class="task-details">
                        <span class="task-text">${cleanText}</span>
                        <span class="task-date-tag">
                            <i class="fas fa-calendar-alt"></i>${formattedDate} 
                            <span class="task-project-tag">#${task.project}</span>
                        </span>
                    </div>
                </div>
                <button class="delete-btn" data-action="delete"><i class="fas fa-trash-alt"></i></button>
            `;

            taskList.appendChild(li);
        });
    };
    window.renderTasks = renderTasks; // Expose renderTasks globally

    // --- Other Event Handlers ---

    const handleTaskInteraction = (e) => {
        const target = e.target.closest('[data-action]');
        if (!target) return;
        
        const listItem = target.closest('li');
        const taskId = listItem.dataset.id;
        let tasks = getTasks();

        if (target.dataset.action === 'toggle') {
            tasks = tasks.map(task => 
                task.id === taskId ? { ...task, completed: !task.completed } : task
            );
        } else if (target.dataset.action === 'delete') {
            tasks = tasks.filter(task => task.id !== taskId);
        }

        saveTasks(tasks);
        renderTasks();
    };

    const handleProjectSwitch = (e) => {
        const target = e.target.closest('li');
        if (!target || !target.dataset.project) return;
        
        const selectedProject = target.dataset.project;
        if (selectedProject === currentProject) return;

        currentProject = selectedProject;
        currentFilter = 'all'; 

        document.querySelectorAll('#project-list li').forEach(li => li.classList.remove('active'));
        target.classList.add('active');

        currentProjectTitle.textContent = target.textContent.trim();

        filterButtons.forEach(btn => btn.classList.remove('active'));
        document.getElementById('filter-all').classList.add('active');

        renderTasks();
    };

    const addProject = () => {
        const newName = prompt("Enter the name for the new project (e.g., Cooking):");
        if (!newName || newName.trim() === '') return;

        const cleanName = newName.trim().toLowerCase();
        
        if (projects.find(p => p.name === cleanName) || cleanName === 'all' || cleanName.length > 15) {
            alert("Project already exists, name is reserved, or too long.");
            return;
        }

        const newProject = {
            name: cleanName,
            icon: 'fas fa-folder-open' 
        };
        
        projects.push(newProject);
        localStorage.setItem('projects', JSON.stringify(projects));
        renderProjectList();
        
        const newItem = document.querySelector(`[data-project="${cleanName}"]`);
        if (newItem) newItem.click(); 
    };
    
    // Theme logic
    const toggleTheme = () => {
        document.body.classList.toggle('dark-mode');
        const isDarkMode = document.body.classList.contains('dark-mode');
        localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
        themeToggle.innerHTML = isDarkMode ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
    };
    const loadTheme = () => {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'dark') {
            document.body.classList.add('dark-mode');
            themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
        } else {
             themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
        }
    };


    // --- Final Event Listener Attachments ---
    
    // Attach 'Enter' key press on the main input to trigger the global addTask function
    if (newTaskInput) {
        newTaskInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                addTask();
            }
        });
    }

    if(themeToggle) themeToggle.addEventListener('click', toggleTheme);

    taskList.addEventListener('click', handleTaskInteraction);
    projectListNav.addEventListener('click', handleProjectSwitch);
    addProjectBtn.addEventListener('click', addProject);

    filterButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            const selectedFilter = e.target.id.replace('filter-', '');
            currentFilter = selectedFilter;

            filterButtons.forEach(btn => btn.classList.remove('active'));
            e.target.classList.add('active');

            renderTasks();
        });
    });

    // Initial load sequence
    loadTheme();
    initializeSampleData();
    renderProjectList();
    renderTasks();
});