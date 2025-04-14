"use client";

import React, { useState } from "react";
import { Card, CardHeader, CardBody, CardFooter } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { FaCalendarAlt, FaTrash, FaCheck } from "react-icons/fa";
import { formatDate } from "@/lib/utils";

interface TodoItem {
  id: string;
  title: string;
  completed: boolean;
  dueDate: string | null;
}

export default function Todo() {
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [newTodo, setNewTodo] = useState("");
  const [dueDate, setDueDate] = useState<string | null>(null);
  
  // Yeni görev ekleme
  const handleAddTodo = () => {
    if (!newTodo.trim()) return;
    
    const newTodoItem: TodoItem = {
      id: Date.now().toString(),
      title: newTodo,
      completed: false,
      dueDate: dueDate
    };
    
    setTodos([...todos, newTodoItem]);
    setNewTodo("");
    setDueDate(null);
  };
  
  // Görevi tamamlama/tamamlanmadı olarak işaretleme
  const toggleTodoStatus = (id: string) => {
    setTodos(
      todos.map(todo => 
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      )
    );
  };
  
  // Görevi silme
  const deleteTodo = (id: string) => {
    setTodos(todos.filter(todo => todo.id !== id));
  };
  
  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Görevlerim</h2>
      </CardHeader>
      
      <CardBody>
        <div className="space-y-4">
          {/* Yeni görev ekleme formu */}
          <div className="flex flex-col space-y-2">
            <Input 
              placeholder="Yeni görev ekle..." 
              value={newTodo} 
              onChange={(e) => setNewTodo(e.target.value)}
              fullWidth
            />
            <div className="flex space-x-2">
              <div className="flex-1">
                <Input 
                  type="date" 
                  value={dueDate || ""}
                  onChange={(e) => setDueDate(e.target.value)}
                  fullWidth
                />
              </div>
              <Button onClick={handleAddTodo}>Ekle</Button>
            </div>
          </div>
          
          {/* Görev listesi */}
          <div className="space-y-2">
            {todos.length === 0 ? (
              <p className="text-center text-gray-500 dark:text-gray-400 py-4">
                Henüz görev eklenmedi.
              </p>
            ) : (
              todos.map((todo) => (
                <div 
                  key={todo.id} 
                  className={`flex items-center justify-between p-3 border rounded-md ${
                    todo.completed 
                      ? "bg-gray-100 dark:bg-gray-700 border-gray-200 dark:border-gray-600" 
                      : "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => toggleTodoStatus(todo.id)}
                      className={`p-1 rounded-full ${
                        todo.completed 
                          ? "bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-300" 
                          : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
                      }`}
                    >
                      <FaCheck size={14} />
                    </button>
                    <span className={`${
                      todo.completed ? "line-through text-gray-500 dark:text-gray-400" : "text-gray-800 dark:text-white"
                    }`}>
                      {todo.title}
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {todo.dueDate && (
                      <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center">
                        <FaCalendarAlt className="mr-1" size={10} />
                        {formatDate(new Date(todo.dueDate))}
                      </span>
                    )}
                    
                    <button
                      onClick={() => deleteTodo(todo.id)}
                      className="p-1 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                    >
                      <FaTrash size={14} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </CardBody>
      
      <CardFooter>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {todos.filter(t => t.completed).length} / {todos.length} tamamlandı
        </div>
      </CardFooter>
    </Card>
  );
} 