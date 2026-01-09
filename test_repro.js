const fs = require('fs');

// Mock localStorage
const localStorage = {
    _data: {},
    getItem: (key) => localStorage._data[key] || null,
    setItem: (key, value) => { localStorage._data[key] = value; },
    removeItem: (key) => { delete localStorage._data[key]; }
};

// Mock tasks
const templateId = 'template-123';
const tasks = [
    { id: 'task-1', title: 'Task 1', templateId: templateId, status: 'not-started' },
    { id: 'task-2', title: 'Task 2', templateId: templateId, status: 'not-started' }, // Target to delete
    { id: 'task-3', title: 'Task 3', templateId: templateId, status: 'not-started' },
    { id: 'task-other', title: 'Other Task', status: 'not-started' }
];

localStorage.setItem('tasks', JSON.stringify(tasks));
console.log('Initial tasks:', tasks.length);

// Simulation of handleDeleteTask (instance scope)
function handleDeleteTask(taskId) {
    console.log('Deleting task:', taskId);

    // Logic from Dashboard.jsx lines 867-874
    const storedTasks = localStorage.getItem('tasks');
    const fullTasksArray = storedTasks ? JSON.parse(storedTasks) : [];

    const updatedTasks = fullTasksArray.filter(t => t.id !== taskId);

    localStorage.setItem('tasks', JSON.stringify(updatedTasks));
    // skip backupManager
    // skip setTasks (just log result)

    return updatedTasks;
}

// execute
const result = handleDeleteTask('task-2');

console.log('Resulting tasks:', result.length);
console.log('Task IDs remaining:', result.map(t => t.id));

if (result.length === 3 && !result.find(t => t.id === 'task-2')) {
    console.log('SUCCESS: Only the target task was deleted.');
} else {
    console.log('FAILURE: Incorrect number of tasks remaining.');
}
