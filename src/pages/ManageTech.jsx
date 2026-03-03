import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import TechForm from '@/components/management/TechForm';
import ManagementLayout from '@/components/management/ManagementLayout';
import ManagementShell from '@/components/management/ManagementShell';

export default function ManageTech() {
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const queryClient = useQueryClient();

  const { data: items = [] } = useQuery({
    queryKey: ['techItems'],
    queryFn: () => base44.entities.Tech.list(),
  });

  const updateOrderMutation = useMutation({
    mutationFn: async (updatedItems) => {
      const updates = updatedItems.map((item, index) => ({
        id: item.id,
        order: index,
      }));
      await Promise.all(
        updates.map(({ id, order }) =>
          base44.entities.Tech.update(id, { order })
        )
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['techItems'] });
    },
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Tech.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['techItems'] });
      setShowForm(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Tech.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['techItems'] });
      setShowForm(false);
      setEditingItem(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Tech.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['techItems'] });
    },
  });

  const handleDragEnd = (result) => {
    const { source, destination } = result;
    if (!destination) return;
    if (source.index === destination.index) return;

    const reorderedItems = Array.from(items);
    const [removed] = reorderedItems.splice(source.index, 1);
    reorderedItems.splice(destination.index, 0, removed);

    updateOrderMutation.mutate(reorderedItems);
  };

  const handleSubmit = (formData) => {
    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setShowForm(true);
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <ManagementLayout currentPage="ManageTech">
      <ManagementShell title="Manage Tech" subtitle="Manage tech solutions and offerings">
        <div className="flex justify-end mb-6">
          <Button
            onClick={() => {
              setEditingItem(null);
              setShowForm(true);
            }}
            className="bg-[#232323] hover:bg-[#1A1A1A]"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Item
          </Button>
        </div>

        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="tech-items">
            {(provided) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="space-y-2"
              >
                <AnimatePresence>
                  {items.map((item, index) => (
                    <Draggable key={item.id} draggableId={item.id} index={index}>
                      {(provided, snapshot) => (
                        <motion.div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className={`bg-white rounded-lg p-4 border border-gray-200 ${
                            snapshot.isDragging ? 'shadow-lg ring-2 ring-[#1DA1A1]' : ''
                          }`}
                        >
                          <div
                            {...provided.dragHandleProps}
                            className="flex items-center gap-4"
                          >
                            <div className="flex-1">
                              <h3 className="font-semibold text-gray-900">
                                {item.title}
                              </h3>
                              <p className="text-sm text-gray-500 mt-1">
                                {item.description}
                              </p>
                              <div className="flex gap-2 mt-2">
                                <span className="text-xs px-2 py-1 rounded bg-gray-100">
                                  {item.status}
                                </span>
                                {item.icon && (
                                  <span className="text-xs px-2 py-1 rounded bg-gray-100">
                                    {item.icon}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleEdit(item)}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                              >
                                <Edit2 className="w-4 h-4 text-gray-600" />
                              </button>
                              <button
                                onClick={() => handleDelete(item.id)}
                                className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-4 h-4 text-red-600" />
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </Draggable>
                  ))}
                </AnimatePresence>
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>

        <AnimatePresence>
          {showForm && (
            <TechForm
              item={editingItem}
              onSubmit={handleSubmit}
              onCancel={() => {
                setShowForm(false);
                setEditingItem(null);
              }}
            />
          )}
        </AnimatePresence>
      </ManagementShell>
    </ManagementLayout>
  );
}