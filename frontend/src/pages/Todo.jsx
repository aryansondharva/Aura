// Todo.jsx
import React, { useEffect, useState, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import Sidebar from "../components/Sidebar";
import History from "../components/History";
import { EqualApproximately } from "lucide-react";
import useSession from "../utils/useSession";
import { Modal, Button } from "react-bootstrap";
import "bootstrap/dist/css/bootstrap.min.css";
import { Plus } from "lucide-react";
import { Trash } from "lucide-react";
import { Save } from "lucide-react";
import supabase from "../utils/supabaseClient";

const lanes = [
  { id: "todo", title: "To Do" },
  { id: "on_hold", title: "On Hold" },
  { id: "completed", title: "Completed" },
];

const Todo = () => {
  const {
    userId,
    isLoggedIn,
    isSidebarOpen,
    isHistoryOpen,
    toggleSidebar,
    toggleHistory,
  } = useSession();

  // user fetch
  const [user, setUser] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (!error && data?.user) {
        setUser(data.user);
      }
    };
    fetchUser();
  }, []);

  const [tasks, setTasks] = useState({
    todo: [],
    on_hold: [],
    completed: [],
  });

  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    due_date: new Date(),
  });

  const [selectedTask, setSelectedTask] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const fetchTasks = useCallback(async () => {
    if (!userId) return;

    const { data: fetchedTasks, error } = await supabase
      .from("todos")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching tasks:", error);
      return;
    }

    const grouped = {
      todo: [],
      on_hold: [],
      completed: [],
    };

    fetchedTasks.forEach((task) => {
      if (!grouped[task.status]) grouped[task.status] = [];
      grouped[task.status].push(task);
    });

    setTasks(grouped);
  }, [userId]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const onDragEnd = async (result) => {
    if (!result.destination) return;

    const { source, destination, draggableId } = result;

    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) {
      return;
    }

    const movedTask = tasks[source.droppableId].find(
      (task) => task.id.toString() === draggableId
    );
    if (!movedTask) return;

    const newSourceTasks = Array.from(tasks[source.droppableId]);
    newSourceTasks.splice(source.index, 1);

    const newDestTasks = Array.from(tasks[destination.droppableId]);
    newDestTasks.splice(destination.index, 0, {
      ...movedTask,
      status: destination.droppableId,
    });

    const { error } = await supabase
      .from("todos")
      .update({ status: destination.droppableId })
      .eq("id", movedTask.id);

    if (error) {
      console.error("Error updating task status:", error);
      return;
    }

    setTasks((prev) => ({
      ...prev,
      [source.droppableId]: newSourceTasks,
      [destination.droppableId]: newDestTasks,
    }));
  };

  const addTask = async () => {
    if (!newTask.title.trim()) return;

    const { error } = await supabase.from("todos").insert({
      user_id: userId,
      title: newTask.title.trim(),
      description: newTask.description.trim(),
      due_date: newTask.due_date.toISOString(),
      status: "todo",
    });

    if (error) {
      console.error("Error adding task:", error);
      return;
    }

    setNewTask({ title: "", description: "", due_date: new Date() });
    fetchTasks();
  };

  const openModal = (task) => {
    setSelectedTask({ ...task, due_date: new Date(task.due_date) });
    setShowModal(true);
  };

  const handleUpdateTask = async () => {
    const { error } = await supabase
      .from("todos")
      .update({
        description: selectedTask.description,
        due_date: selectedTask.due_date.toISOString(),
      })
      .eq("id", selectedTask.id);

    if (error) console.error("Error updating task:", error);
    else {
      setShowModal(false);
      fetchTasks();
    }
  };

  const handleDeleteTask = async () => {
    const { error } = await supabase
      .from("todos")
      .delete()
      .eq("id", selectedTask.id);
    if (error) console.error("Error deleting task:", error);
    else {
      setShowModal(false);
      fetchTasks();
    }
  };

  return (
    <div className="chat chat-wrapper d-flex min-vh-100">
      <div className={`sidebar-area ${isSidebarOpen ? "open" : "collapsed"}`}>
        <Sidebar
          isOpen={isSidebarOpen}
          toggleSidebar={toggleSidebar}
          toggleHistory={toggleHistory}
          isHistoryOpen={isHistoryOpen}
          isLoggedIn={isLoggedIn}
        />
        <History
          isLoggedIn={isLoggedIn}
          userId={userId}
          isHistoryOpen={isHistoryOpen}
          onClose={toggleHistory}
        />
      </div>

      <div className="chat-content todo-content flex-grow-1 p-4 text-white">
        <div className="container">
          <div className="row justify-content-center align-items-center mt-4">
            <div className="col-xl-12">
              <div className="chat-header text-center mb-4">
                <h2 className="grad_text">
                  Hello
                  {user?.user_metadata?.full_name
                    ? `, ${user.user_metadata.full_name}`
                    : ""}
                  ! Manage Your Task
                </h2>
              </div>
            </div>
            <div className="col-xl-12">
              <div className="mb-4 d-flex gap-3 flex-wrap align-items-center justify-content-center task_box">
                <input
                  type="text"
                  className="form-control"
                  placeholder="Task Title"
                  style={{ maxWidth: "250px" }}
                  value={newTask.title}
                  onChange={(e) =>
                    setNewTask((prev) => ({ ...prev, title: e.target.value }))
                  }
                />
                <input
                  type="text"
                  className="form-control"
                  placeholder="Description"
                  style={{ maxWidth: "300px" }}
                  value={newTask.description}
                  onChange={(e) =>
                    setNewTask((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                />
                <DatePicker
                  selected={newTask.due_date}
                  onChange={(date) =>
                    setNewTask((prev) => ({ ...prev, due_date: date }))
                  }
                  className="form-control"
                  showTimeSelect
                  dateFormat="Pp"
                />
                <button className="btn btn-cs" onClick={addTask}>
                  <Plus /> Add Task
                </button>
              </div>

              <DragDropContext onDragEnd={onDragEnd}>
                <div className="d-flex gap-3 flex-grow-1 justify-content-center draggercard">
                  {lanes.map((lane) => (
                    <Droppable droppableId={lane.id} key={lane.id}>
                      {(provided) => (
                        <div
                          className="todocard p-3"
                          style={{ width: "320px", minHeight: "500px" }}
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                        >
                          <h5 className="text-white mb-3">{lane.title}</h5>
                          {tasks[lane.id].map((task, index) => (
                            <Draggable
                              key={task.id}
                              draggableId={task.id.toString()}
                              index={index}
                            >
                              {(provided) => (
                                <div
                                  className="card mb-2"
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  onClick={() => openModal(task)}
                                >
                                  <div className="card-body p-2">
                                    <h6 className="card-title">{task.title}</h6>
                                    <hr/>
                                    <p className="card-text mb-1">
                                      {task.description.length > 150
                                        ? `${task.description.slice(0, 150)}...`
                                        : task.description}
                                    </p>
                                    <small className="text-muted">
                                      Due:{" "}
                                      {task.due_date
                                        ? new Date(
                                            task.due_date
                                          ).toLocaleString()
                                        : "N/A"}
                                    </small>
                                  </div>
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  ))}
                </div>
              </DragDropContext>
            </div>
          </div>
        </div>

        <span className="navbar-toggler-menu">
          <EqualApproximately
            className="d-md-none position-fixed top-0 start-0 m-3"
            onClick={toggleSidebar}
            style={{ zIndex: 99 }}
          />
        </span>
      </div>

      {/* Task Edit Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} centered dialogClassName="modal-dialog modal-dialog-scrollable">
        <Modal.Header closeButton>
          <Modal.Title>{selectedTask?.title}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <textarea
            className="form-control mb-3"
            rows={10}
            value={selectedTask?.description || ""}
            onChange={(e) =>
              setSelectedTask((prev) => ({
                ...prev,
                description: e.target.value,
              }))
            }
          />
          <label>
            <strong>Update Due Date & Time:</strong>
          </label>
          <DatePicker
            selected={selectedTask?.due_date}
            onChange={(date) =>
              setSelectedTask((prev) => ({ ...prev, due_date: date }))
            }
            className="form-control"
            showTimeSelect
            dateFormat="Pp"
          />
        </Modal.Body>
        <Modal.Footer>
          <Button variant="danger" onClick={handleDeleteTask}>
            <Trash />
          </Button>
          <Button variant="success" onClick={handleUpdateTask}>
            <Save />
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default Todo;
