import React, { useState, useMemo } from 'react';
import { useCRMData, useAuth } from './context';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Calendar as CalendarIcon, CheckCircle2, Circle, Clock, AlertCircle, Trash2, Edit, CheckSquare, ListTodo } from 'lucide-react';
import { format, parseISO, isBefore, isToday } from 'date-fns';
import { Task, TaskStatus, TaskPriority, UserId, ClientId } from './types';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'motion/react';

export default function Tasks() {
  const { tasks, clients, addTask, updateTask, deleteTask } = useCRMData();
  const { users, currentUser } = useAuth();
  
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  const [newTask, setNewTask] = useState<Partial<Task>>({
    title: '',
    description: '',
    dueDate: format(new Date(), 'yyyy-MM-dd'),
    status: 'Pending',
    priority: 'Medium',
    assignedTo: (currentUser?.id || '') as UserId,
    clientId: 'none' as any
  });

  const handleAddTask = async () => {
    if (!newTask.title || !newTask.dueDate || !newTask.assignedTo) return;
    
    await addTask({
      title: newTask.title,
      description: newTask.description,
      dueDate: newTask.dueDate,
      status: newTask.status as TaskStatus,
      priority: newTask.priority as TaskPriority,
      assignedTo: newTask.assignedTo as UserId,
      clientId: (newTask.clientId === 'none' ? undefined : newTask.clientId) as ClientId | undefined,
    });
    
    setIsAddOpen(false);
    setNewTask({
      title: '',
      description: '',
      dueDate: format(new Date(), 'yyyy-MM-dd'),
      status: 'Pending',
      priority: 'Medium',
      assignedTo: (currentUser?.id || '') as UserId,
      clientId: 'none' as any
    });
  };

  const handleEditTask = async () => {
    if (!editingTask || !editingTask.title || !editingTask.dueDate || !editingTask.assignedTo) return;
    
    await updateTask(editingTask.id, {
      title: editingTask.title,
      description: editingTask.description,
      dueDate: editingTask.dueDate,
      status: editingTask.status,
      priority: editingTask.priority,
      assignedTo: editingTask.assignedTo as UserId,
      clientId: (editingTask.clientId === ('none' as any) ? undefined : editingTask.clientId) as ClientId | undefined,
    });
    
    setIsEditOpen(false);
    setEditingTask(null);
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'High': return <Badge className="bg-rose-500 hover:bg-rose-600 border-none shadow-sm shadow-rose-500/10">High</Badge>;
      case 'Medium': return <Badge className="bg-amber-500 hover:bg-amber-600 border-none shadow-sm shadow-amber-500/10">Medium</Badge>;
      case 'Low': return <Badge className="bg-emerald-500 hover:bg-emerald-600 border-none shadow-sm shadow-emerald-500/10">Low</Badge>;
      default: return <Badge variant="secondary">{priority}</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Completed': return <CheckSquare className="h-5 w-5 text-emerald-500 fill-emerald-50 dark:fill-emerald-950/30" />;
      case 'In Progress': return <Clock className="h-5 w-5 text-amber-500 animate-pulse-slow" />;
      default: return <Circle className="h-5 w-5 text-muted-foreground/30 hover:text-primary/50 transition-colors" />;
    }
  };

  const filteredTasks = useMemo(() => {
    return tasks
      .filter(t => filterStatus === 'ALL' || t.status === filterStatus)
      .sort((a, b) => {
        if (a.status === 'Completed' && b.status !== 'Completed') return 1;
        if (a.status !== 'Completed' && b.status === 'Completed') return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      });
  }, [tasks, filterStatus]);

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-4xl font-black tracking-tight flex items-center gap-3">
            <ListTodo className="h-10 w-10 text-primary" />
            Agenda
          </h2>
          <p className="text-muted-foreground text-sm font-medium mt-1">Manage your professional priorities and follow-ups.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v || 'ALL')}>
            <SelectTrigger className="w-full md:w-[160px] bg-white/50 backdrop-blur-sm shadow-sm border-white/20">
              <SelectValue placeholder="All Tasks" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Tasks</SelectItem>
              <SelectItem value="Pending">Pending</SelectItem>
              <SelectItem value="In Progress">In Progress</SelectItem>
              <SelectItem value="Completed">Completed</SelectItem>
            </SelectContent>
          </Select>

          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger render={
              <Button size="lg" className="shadow-lg shadow-primary/20 hover:scale-105 transition-all">
                <Plus className="mr-2 h-5 w-5" />
                New Task
              </Button>
            } />
            <DialogContent className="sm:max-w-lg overflow-hidden border-none shadow-2xl p-0 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl">
              <div className="bg-primary/5 p-6 border-b border-primary/10">
                <DialogTitle className="text-2xl font-black tracking-tight">Create Professional Task</DialogTitle>
                <p className="text-xs text-muted-foreground mt-1">Define goals and deadlines for better tracking.</p>
              </div>
              <div className="p-6 space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="font-bold">Task Objective</Label>
                    <Input 
                      value={newTask.title} 
                      onChange={e => setNewTask({...newTask, title: e.target.value})} 
                      placeholder="e.g., Follow up on renewal for client..."
                      className="h-12 text-lg font-medium"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold">Description (Optional)</Label>
                    <Input 
                      value={newTask.description} 
                      onChange={e => setNewTask({...newTask, description: e.target.value})} 
                      placeholder="Brief context..."
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label className="font-bold">Deadline Date</Label>
                        <Input 
                            type="date" 
                            value={newTask.dueDate} 
                            onChange={e => setNewTask({...newTask, dueDate: e.target.value})} 
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="font-bold">Urgency Level</Label>
                        <Select value={newTask.priority} onValueChange={(v) => setNewTask({...newTask, priority: (v as TaskPriority) || 'Medium'})}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Low">Low Priority</SelectItem>
                                <SelectItem value="Medium">Medium Priority</SelectItem>
                                <SelectItem value="High">High Priority</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="font-bold">Ownership</Label>
                      <Select value={newTask.assignedTo} onValueChange={v => setNewTask({...newTask, assignedTo: (v as UserId) || ('' as UserId)})}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {users.map(u => (
                            <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="font-bold">Link Contact</Label>
                      <Select value={(newTask.clientId as string) || 'none'} onValueChange={v => setNewTask({...newTask, clientId: (v as any)})}>
                        <SelectTrigger><SelectValue placeholder="Select contact" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Independent Task</SelectItem>
                          {clients.map(c => (
                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                <Button className="w-full h-14 text-xl font-black shadow-xl shadow-primary/10 transition-all hover:translate-y-[-2px] active:translate-y-[1px]" onClick={handleAddTask} disabled={!newTask.title || !newTask.dueDate}>
                  Launch Task
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-6">
        <AnimatePresence mode="popLayout">
          {filteredTasks.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-24 border-2 border-dashed rounded-3xl bg-muted/20"
            >
              <div className="bg-emerald-50 dark:bg-emerald-950/20 h-20 w-20 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="h-10 w-10 text-emerald-500" />
              </div>
              <h3 className="text-2xl font-black tracking-tight">Zero Backlog</h3>
              <p className="text-muted-foreground font-medium mt-2">Maximum efficiency reached. All tasks cleared!</p>
            </motion.div>
          ) : (
            filteredTasks.map((task, index) => {
              const dateObj = parseISO(task.dueDate);
              const isOverdue = task.status !== 'Completed' && isBefore(dateObj, new Date()) && !isToday(dateObj);
              const assignedUser = users.find(u => u.id === task.assignedTo);
              const relatedClient = clients.find(c => c.id === task.clientId);

              return (
                <motion.div
                  key={task.id}
                  layout
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                >
                  <Card className={`group relative transition-all duration-300 border-none shadow-xl hover:shadow-2xl overflow-hidden ${
                    task.status === 'Completed' ? 'opacity-60 bg-muted/30 grayscale-[50%]' : 'bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md'
                  }`}>
                    {/* Left Accent Border */}
                    <div className={`absolute left-0 top-0 bottom-0 w-1.5 transition-colors ${
                      task.status === 'Completed' ? 'bg-emerald-400/50' : 
                      task.priority === 'High' ? 'bg-rose-500' :
                      task.priority === 'Medium' ? 'bg-amber-500' : 'bg-emerald-500'
                    }`} />

                    <CardContent className="p-6 flex items-start gap-5">
                      <button 
                        onClick={() => updateTask(task.id, { status: task.status === 'Completed' ? 'Pending' : 'Completed' })}
                        className={`mt-1 flex-shrink-0 transition-all active:scale-90 ${task.status === 'Completed' ? 'text-emerald-500' : 'hover:scale-125'}`}
                      >
                        {getStatusIcon(task.status)}
                      </button>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                          <div className="space-y-1">
                            <h4 className={`text-xl font-bold tracking-tight transition-all duration-300 ${
                              task.status === 'Completed' ? 'line-through text-muted-foreground' : 'text-zinc-900 dark:text-zinc-50'
                            }`}>
                              {task.title}
                            </h4>
                            {task.description && (
                              <p className="text-sm text-muted-foreground/80 font-medium">{task.description}</p>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-3 self-end sm:self-start bg-zinc-100 dark:bg-zinc-800 p-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-zinc-200 dark:hover:bg-zinc-700" onClick={() => {
                              setEditingTask(task);
                              setIsEditOpen(true);
                            }}>
                              <Edit className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-500 hover:bg-rose-50 hover:text-rose-600" onClick={() => deleteTask(task.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-4 mt-6 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                          <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border ${
                            isOverdue ? 'bg-rose-50 border-rose-100 text-rose-600 dark:bg-rose-950/20 dark:border-rose-900/30' : 'bg-zinc-50 border-zinc-100 dark:bg-zinc-800/50 dark:border-zinc-700/50'
                          }`}>
                            <CalendarIcon className="h-3.5 w-3.5" />
                            {format(dateObj, 'MMM d, yyyy')}
                            {isOverdue && <AlertCircle className="h-3.5 w-3.5 ml-1 animate-bounce" />}
                          </div>
                          
                          {getPriorityBadge(task.priority)}

                          <div className="flex -space-x-1 items-center overflow-hidden">
                            <div className="h-7 w-7 rounded-full bg-primary/10 border-2 border-white dark:border-zinc-950 flex items-center justify-center text-[10px] font-black text-primary">
                                {assignedUser?.name.charAt(0)}
                            </div>
                            <span className="ml-2 text-muted-foreground font-semibold lowercase tracking-normal italic">
                                {assignedUser?.name || 'Unassigned'}
                            </span>
                          </div>
                          
                          {relatedClient && (
                            <div className="flex items-center gap-2 bg-blue-50/50 dark:bg-blue-900/10 px-3 py-1.5 rounded-full border border-blue-100 dark:border-blue-900/20 text-blue-600 dark:text-blue-400 transform transition-transform hover:scale-105 cursor-default">
                                <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />
                                <span className="lowercase font-bold tracking-normal italic text-[11px]">{relatedClient.name}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="border-none shadow-2xl p-0 overflow-hidden bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl">
          <div className="bg-primary/5 p-6 border-b border-primary/10">
            <DialogTitle className="text-2xl font-black tracking-tight">Edit Objective</DialogTitle>
          </div>
          {editingTask && (
            <div className="p-6 space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="font-bold">Objective</Label>
                  <Input 
                    value={editingTask.title} 
                    onChange={e => setEditingTask({...editingTask, title: e.target.value})} 
                    className="h-12 font-medium"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="font-bold">Context</Label>
                  <Input 
                    value={editingTask.description || ''} 
                    onChange={e => setEditingTask({...editingTask, description: e.target.value})} 
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="font-bold">Deadline</Label>
                    <Input 
                      type="date" 
                      value={editingTask.dueDate} 
                      onChange={e => setEditingTask({...editingTask, dueDate: e.target.value})} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold">Status</Label>
                    <Select value={editingTask.status} onValueChange={(v) => setEditingTask({...editingTask, status: (v as TaskStatus) || 'Pending'})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Pending">Pending</SelectItem>
                        <SelectItem value="In Progress">In Progress</SelectItem>
                        <SelectItem value="Completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="font-bold">Urgency</Label>
                    <Select value={editingTask.priority} onValueChange={(v) => setEditingTask({...editingTask, priority: (v as TaskPriority) || 'Medium'})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Low">Low</SelectItem>
                        <SelectItem value="Medium">Medium</SelectItem>
                        <SelectItem value="High">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold">Owner</Label>
                    <Select value={editingTask.assignedTo} onValueChange={v => setEditingTask({...editingTask, assignedTo: (v as UserId) || ('' as UserId)})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {users.map(u => (
                          <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                    <Label className="font-bold">Linked Contact</Label>
                    <Select value={(editingTask.clientId as string) || 'none'} onValueChange={v => setEditingTask({...editingTask, clientId: (v as any)})}>
                    <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="none">Independent</SelectItem>
                        {clients.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                    </SelectContent>
                    </Select>
                </div>
              </div>
              <Button className="w-full h-14 text-xl font-black shadow-xl" onClick={handleEditTask} disabled={!editingTask.title || !editingTask.dueDate}>
                Apply Updates
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
