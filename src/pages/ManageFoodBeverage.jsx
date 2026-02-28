import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Edit, Trash2, GripVertical, ArrowLeft } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import FoodBeverageForm from '@/components/management/FoodBeverageForm';
import SectionHeader from '@/components/shared/SectionHeader';
import { createPageUrl } from '@/components/utils';

export default function ManageFoodBeverage() {
  const queryClient = useQueryClient();
  const [editingItem, setEditingItem] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['foodBeverages'],
    queryFn: () => base44.entities.FoodBeverage.list(),
  });

  const updateOrderMutation = useMutation({
    mutationFn: ({ id, order }) => base44.entities.FoodBeverage.update(id, { order }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['foodBeverages'] });
    },
  });

  const handleDragEnd = (result) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;

    const sortedItems = items.sort((a, b) => (a.order || 0) - (b.order || 0));
    const [movedItem] = sortedItems.splice(source.index, 1);
    sortedItems.splice(destination.index, 0, movedItem);

    sortedItems.forEach((item, index) => {
      updateOrderMutation.mutate({ id: item.id, order: index });
    });
  };

  const sortedItems = [...items].sort((a, b) => (a.order || 0) - (b.order || 0));

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.FoodBeverage.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['foodBeverages'] });
      setShowForm(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.FoodBeverage.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['foodBeverages'] });
      setEditingItem(null);
      setShowForm(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.FoodBeverage.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['foodBeverages'] });
    },
  });

  const handleSubmit = (data) => {
    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-12">
        <Skeleton className="h-12 w-64 mb-8" />
        <div className="grid gap-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <Link to={createPageUrl('Management')} className="inline-flex items-center gap-1 text-xs font-mono text-gray-400 hover:text-[#232323] mb-6 transition-colors">
        <ArrowLeft className="w-3 h-3" /> Back to Management
      </Link>
      <div className="flex items-center justify-between mb-8">
        <SectionHeader
          label="Management"
          title="Food & Beverage Items"
          subtitle="Manage food and beverage offerings"
        />
        <Button
          onClick={() => {
            setEditingItem(null);
            setShowForm(true);
          }}
          className="bg-[#232323] hover:bg-[#1A3249]"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Item
        </Button>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="food-beverage-list">
          {(provided, snapshot) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className={`space-y-3 ${snapshot.isDraggingOver ? 'bg-blue-50 rounded-lg p-2' : ''}`}
            >
              {sortedItems.map((item, index) => (
                <Draggable key={item.id} draggableId={item.id} index={index}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className={`bg-white border border-gray-200 rounded-lg p-6 flex items-start justify-between ${
                        snapshot.isDragging ? 'shadow-lg bg-blue-50' : ''
                      }`}
                    >
                      <div {...provided.dragHandleProps} className="mt-1 mr-3 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing">
                        <GripVertical className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-[#232323]">{item.title}</h3>
                        {item.icon && <p className="text-sm text-gray-500 mt-1">Icon: {item.icon}</p>}
                        <p className="text-sm text-gray-600 mt-2">{item.description}</p>
                        <div className="mt-3 flex items-center gap-2">
                          <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                            item.status === 'active' ? 'bg-green-100 text-green-800' :
                            item.status === 'coming_soon' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {item.status === 'coming_soon' ? 'Coming Soon' : item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <button
                          onClick={() => {
                            setEditingItem(item);
                            setShowForm(true);
                          }}
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600 hover:text-[#232323]"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteMutation.mutate(item.id)}
                          className="p-2 hover:bg-red-50 rounded-lg transition-colors text-gray-600 hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {showForm && (
        <FoodBeverageForm
          item={editingItem}
          onSubmit={handleSubmit}
          onCancel={() => {
            setShowForm(false);
            setEditingItem(null);
          }}
        />
      )}
    </div>
  );
}