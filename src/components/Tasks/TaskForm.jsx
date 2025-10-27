import { useState } from 'react';
import { Plus } from 'lucide-react';

const TaskForm = ({ onTaskCreate }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [url, setUrl] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [time, setTime] = useState('');
  const [taskType, setTaskType] = useState('academic');

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!title.trim()) {
      return;
    }

    const newTask = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: title.trim(),
      description: description.trim(),
      url: url.trim() || null,
      dueDate: dueDate || null,
      time: time || null,
      status: 'not-started',
      taskType: taskType,
      createdAt: new Date().toISOString(),
      completedAt: null,
      customPriority: 0, // Will be set by parent component based on due date
    };

    onTaskCreate(newTask);

    // Clear form
    setTitle('');
    setDescription('');
    setUrl('');
    setDueDate('');
    setTime('');
    setTaskType('academic');
  };

  return (
    <div className="bg-bg-secondary rounded-xl p-6 border border-bg-tertiary">
      <h3 className="text-lg font-semibold text-text-primary mb-4">Create New Task</h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Title Input */}
        <div>
          <label className="block text-sm text-text-secondary mb-2">
            Task Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter task title"
            className="w-full bg-bg-tertiary border border-bg-primary rounded-lg px-4 py-2 text-text-primary placeholder-text-tertiary focus:border-green-glow focus:ring-1 focus:ring-green-glow"
            required
          />
        </div>

        {/* Description Textarea */}
        <div>
          <label className="block text-sm text-text-secondary mb-2">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Enter task description (optional)"
            rows={3}
            className="w-full bg-bg-tertiary border border-bg-primary rounded-lg px-4 py-2 text-text-primary placeholder-text-tertiary focus:border-green-glow focus:ring-1 focus:ring-green-glow resize-none"
          />
        </div>

        {/* URL Input */}
        <div>
          <label className="block text-sm text-text-secondary mb-2">
            Related Link
          </label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com (optional)"
            className="w-full bg-bg-tertiary border border-bg-primary rounded-lg px-4 py-2 text-text-primary placeholder-text-tertiary focus:border-green-glow focus:ring-1 focus:ring-green-glow"
          />
        </div>

        {/* Due Date and Time Row */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-text-secondary mb-2">
              Due Date
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full bg-bg-tertiary border border-bg-primary rounded-lg px-4 py-2 text-text-primary focus:border-green-glow focus:ring-1 focus:ring-green-glow"
            />
          </div>
          <div>
            <label className="block text-sm text-text-secondary mb-2">
              Time (optional)
            </label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full bg-bg-tertiary border border-bg-primary rounded-lg px-4 py-2 text-text-primary focus:border-green-glow focus:ring-1 focus:ring-green-glow"
            />
          </div>
        </div>

        {/* Task Type Toggle */}
        <div>
          <label className="block text-sm text-text-secondary mb-2">
            Task Type
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setTaskType('academic')}
              className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                taskType === 'academic'
                  ? 'bg-green-glow bg-opacity-20 text-green-glow border border-green-glow'
                  : 'text-text-secondary hover:bg-bg-tertiary border border-bg-primary'
              }`}
            >
              📚 Academic
            </button>
            <button
              type="button"
              onClick={() => setTaskType('personal')}
              className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                taskType === 'personal'
                  ? 'bg-green-glow bg-opacity-20 text-green-glow border border-green-glow'
                  : 'text-text-secondary hover:bg-bg-tertiary border border-bg-primary'
              }`}
            >
              🏠 Personal
            </button>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          className="w-full bg-green-glow hover:bg-green-glow/90 text-bg-primary font-semibold py-3 px-4 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 shadow-glow hover:shadow-glow-lg"
        >
          <Plus size={20} />
          Create Task
        </button>
      </form>
    </div>
  );
};

export default TaskForm;
