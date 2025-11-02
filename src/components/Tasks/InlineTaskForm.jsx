import { useState } from 'react';
import { Plus, Save, X } from 'lucide-react';
import { motion } from 'framer-motion';

const InlineTaskForm = ({ defaultDate, onTaskCreate, onCancel }) => {
  const [title, setTitle] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) {
      return;
    }

    const newTask = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: title.trim(),
      description: '', // Can be edited later
      url: null,
      dueDate: defaultDate, // Use the date from the group (will be null for Inbox)
      time: null,
      status: 'not-started',
      taskType: 'academic', // Default, can be edited later
      createdAt: new Date().toISOString(),
      completedAt: null,
      attachments: [],
      customPriority: 0, // Will be set by parent
    };

    onTaskCreate(newTask);
    setTitle(''); // Clear form for next use
  };

  const handleCancel = (e) => {
    e.stopPropagation();
    setTitle('');
    onCancel();
  };

  // Handle 'Enter' to save and 'Escape' to cancel
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSubmit(e);
    } else if (e.key === 'Escape') {
      handleCancel(e);
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto', marginTop: '8px' }}
      exit={{ opacity: 0, height: 0, marginTop: '0px' }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
    >
      <div className="bg-bg-tertiary rounded-lg p-3 border border-bg-primary">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Task title"
          className="w-full bg-bg-secondary border border-bg-primary rounded-md px-3 py-2 text-sm text-text-primary placeholder-text-tertiary focus:border-green-glow focus:ring-1 focus:ring-green-glow"
          autoFocus
        />
        <div className="flex items-center justify-end gap-2 mt-3">
          <button
            type="button"
            onClick={handleCancel}
            className="px-4 py-2 rounded-lg text-sm font-medium text-text-secondary hover:bg-bg-secondary transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={!title.trim()}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm bg-green-glow hover:bg-green-glow/90 text-bg-primary font-semibold transition-all disabled:bg-green-glow/50 disabled:cursor-not-allowed"
          >
            <Plus size={16} />
            Add Task
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default InlineTaskForm;
